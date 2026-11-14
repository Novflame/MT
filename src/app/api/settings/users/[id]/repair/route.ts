import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import {
  parentStudents,
  parents,
  staffProfiles,
  studentUsers,
  students,
} from "@/db/schema";

import { centralDb } from "@/db/central";
import { user } from "@/db/centeral-schema";
import { auth } from "@/auth/auth";

import {
  auditAccountAction,
  claimProvisioning,
  advanceProvisioningStage,
  markProvisioningActive,
  markProvisioningFailed,
  type ProvisioningStage,
  type ProvisionedSchoolRole,
} from "@/auth/account-provisioning";

type RepairMetadata = {
  createParentProfile?: boolean;
  studentIds?: string[];
  parentName?: string;
  parentPhone?: string;
};

const PROVISIONING_STAGES: ProvisioningStage[] = [
  "account_creation",
  "school_profile",
  "relationship_creation",
  "relationship_verification",
  "activation",
];

function parseMetadata(value: string | null): RepairMetadata {
  if (!value) return {};

  const parsed: unknown = JSON.parse(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Provisioning metadata is invalid");
  }

  const metadata = parsed as Record<string, unknown>;

  if (
    metadata.studentIds !== undefined &&
    (!Array.isArray(metadata.studentIds) ||
      !metadata.studentIds.every((id): id is string => typeof id === "string"))
  ) {
    throw new Error("Provisioning student references are invalid");
  }

  return {
    createParentProfile: metadata.createParentProfile === true,

    studentIds: Array.isArray(metadata.studentIds)
      ? [...new Set(metadata.studentIds as string[])]
      : [],

    parentName:
      typeof metadata.parentName === "string" ? metadata.parentName : undefined,

    parentPhone:
      typeof metadata.parentPhone === "string"
        ? metadata.parentPhone
        : undefined,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let claimedUserId: string | null = null;
  let schoolId: number | null = null;
  let leaseToken: string | null = null;
  let currentStage: ProvisioningStage = "account_creation";
  let activated = false;

  try {
    const session = await requirePermission("users.update");
    const { id } = await context.params;

    const [actor] = await centralDb
      .select({
        schoolId: user.schoolId,
        schoolRole: user.schoolRole,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!actor || actor.schoolRole !== "principal" || !actor.schoolId) {
      return NextResponse.json(
        {
          error: "Only the principal may repair failed account provisioning",
        },
        { status: 403 },
      );
    }

    const repairSchoolId = actor.schoolId;
    schoolId = repairSchoolId;

    const [target] = await centralDb
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        schoolId: user.schoolId,
        schoolRole: user.schoolRole,
        provisioningStatus: user.provisioningStatus,
        provisioningType: user.provisioningType,
        provisioningReferenceId: user.provisioningReferenceId,
        provisioningMetadata: user.provisioningMetadata,
      })
      .from(user)
      .where(and(eq(user.id, id), eq(user.schoolId, schoolId)))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      target.provisioningStatus !== "failed" ||
      !target.provisioningType ||
      !["staff", "student", "parent"].includes(target.provisioningType) ||
      (target.provisioningType !== "staff" && !target.provisioningReferenceId)
    ) {
      return NextResponse.json(
        {
          error:
            "This account does not have a recoverable failed-provisioning record",
        },
        { status: 409 },
      );
    }

    // Validate saved recovery data before claiming the operation.
    let metadata: RepairMetadata;

    try {
      metadata = parseMetadata(target.provisioningMetadata);
    } catch {
      return NextResponse.json(
        {
          error:
            "Provisioning metadata is invalid. Manual database review is required.",
        },
        { status: 409 },
      );
    }

    // Atomically claim the failed operation and acquire its lease.
    const claimed = await claimProvisioning({
      userId: target.id,
      schoolId,
      schoolRole: target.schoolRole as ProvisionedSchoolRole,
      provisioningType: target.provisioningType as
        | "staff"
        | "student"
        | "parent",
      provisioningReferenceId: target.provisioningReferenceId ?? undefined,
    });

    claimedUserId = claimed.userId;
    leaseToken = claimed.leaseToken;
    currentStage = claimed.stage;

    // Advance stages without ever moving backwards.
    // Every transition verifies ownership of the lease.
    const advanceThrough = async (targetStage: ProvisioningStage) => {
      const currentIndex = PROVISIONING_STAGES.indexOf(currentStage);

      const targetIndex = PROVISIONING_STAGES.indexOf(targetStage);

      if (currentIndex === -1 || targetIndex === -1) {
        throw new Error(`Invalid provisioning stage: ${currentStage}`);
      }

      if (currentIndex >= targetIndex) {
        return;
      }

      while (PROVISIONING_STAGES.indexOf(currentStage) < targetIndex) {
        const index = PROVISIONING_STAGES.indexOf(currentStage);

        const nextStage = PROVISIONING_STAGES[index + 1];

        if (!nextStage) {
          throw new Error(`Cannot advance provisioning from ${currentStage}`);
        }

        await advanceProvisioningStage({
          userId: target.id,
          schoolId: repairSchoolId,
          leaseToken: leaseToken!,
          expectedStage: currentStage,
          nextStage,
        });

        currentStage = nextStage;
      }
    };

    // Enter relationship creation before repairing school records.
    await advanceThrough("relationship_creation");

    const db = await getSchoolDB();

    // All school-side writes and verification happen in one
    // synchronous better-sqlite3 transaction.
    db.transaction((tx) => {
    
      if (target.provisioningType === "staff") {
        const existing = tx
          .select()
          .from(staffProfiles)
          .where(eq(staffProfiles.userId, target.id))
          .get();

        if (!existing) {
          tx.insert(staffProfiles)
            .values({
              userId: target.id,
              phone: target.phone ?? "",
            })
            .run();
        }

        const verified = tx
          .select()
          .from(staffProfiles)
          .where(eq(staffProfiles.userId, target.id))
          .get();

        if (!verified || verified.userId !== target.id) {
          throw new Error("Staff profile relationship verification failed");
        }

        return;
      }

      // -------------------------------------------------
      // Student recovery
      // -------------------------------------------------
      if (target.provisioningType === "student") {
        const studentId = target.provisioningReferenceId!;

        const student = tx
          .select()
          .from(students)
          .where(eq(students.id, studentId))
          .get();

        if (!student) {
          throw new Error("The referenced student profile no longer exists");
        }

        const existing = tx
          .select()
          .from(studentUsers)
          .where(eq(studentUsers.studentId, studentId))
          .get();

        if (existing && existing.userId !== target.id) {
          throw new Error(
            "This student is already linked to another login account",
          );
        }

        if (!existing) {
          tx.insert(studentUsers)
            .values({
              id: randomUUID(),
              userId: target.id,
              studentId,
            })
            .run();
        }

        const verified = tx
          .select()
          .from(studentUsers)
          .where(
            and(
              eq(studentUsers.studentId, studentId),
              eq(studentUsers.userId, target.id),
            ),
          )
          .get();

        if (!verified) {
          throw new Error("Student account relationship verification failed");
        }

        return;
      }

      // -------------------------------------------------
      // Parent recovery
      // -------------------------------------------------
      const parentId = target.provisioningReferenceId!;

      const createParentProfile = metadata.createParentProfile === true;

      const requestedStudentIds = metadata.studentIds ?? [];

      let parent = tx
        .select()
        .from(parents)
        .where(eq(parents.id, parentId))
        .get();

      if (!parent && createParentProfile) {
        tx.insert(parents)
          .values({
            id: parentId,
            userId: target.id,
            name: metadata.parentName || target.name,
            phone: metadata.parentPhone ?? target.phone ?? "",
          })
          .run();

        parent = tx
          .select()
          .from(parents)
          .where(eq(parents.id, parentId))
          .get();
      }

      if (!parent) {
        throw new Error(
          "The referenced parent profile no longer exists and cannot be recreated safely",
        );
      }

      if (parent.userId && parent.userId !== target.id) {
        throw new Error("This parent profile is linked to another account");
      }

      if (!parent.userId) {
        const updated = tx
          .update(parents)
          .set({ userId: target.id })
          .where(and(eq(parents.id, parentId), isNull(parents.userId)))
          .run();

        if (updated.changes !== 1) {
          const rechecked = tx
            .select()
            .from(parents)
            .where(eq(parents.id, parentId))
            .get();

          if (rechecked?.userId !== target.id) {
            throw new Error("Parent profile was linked to another account");
          }
        }
      }

      const verifiedParent = tx
        .select()
        .from(parents)
        .where(eq(parents.id, parentId))
        .get();

      if (!verifiedParent || verifiedParent.userId !== target.id) {
        throw new Error("Parent account relationship verification failed");
      }

      for (const studentId of requestedStudentIds) {
        const student = tx
          .select()
          .from(students)
          .where(eq(students.id, studentId))
          .get();

        if (!student) {
          throw new Error(
            `Referenced student profile does not exist: ${studentId}`,
          );
        }

        const existingLink = tx
          .select()
          .from(parentStudents)
          .where(
            and(
              eq(parentStudents.parentId, parentId),
              eq(parentStudents.studentId, studentId),
            ),
          )
          .get();

        if (!existingLink) {
          tx.insert(parentStudents)
            .values({
              id: randomUUID(),
              parentId,
              studentId,
            })
            .run();
        }

        const verifiedLink = tx
          .select()
          .from(parentStudents)
          .where(
            and(
              eq(parentStudents.parentId, parentId),
              eq(parentStudents.studentId, studentId),
            ),
          )
          .get();

        if (!verifiedLink) {
          throw new Error(
            `Parent-child relationship verification failed: ${studentId}`,
          );
        }
      }

      const children = tx
        .select()
        .from(parentStudents)
        .where(eq(parentStudents.parentId, parentId))
        .all();

      if (children.length === 0) {
        throw new Error("Parent profile has no linked children");
      }
    });

    // School-side profiles and relationships have now been
    // committed and verified.
    await advanceThrough("relationship_verification");
    await advanceThrough("activation");

    // Activate only while this request still owns a valid lease.
    await markProvisioningActive({
      userId: target.id,
      schoolId,
      leaseToken,
      schoolProfileVerified: true,
      relationshipVerified: true,
    });

    activated = true;

    // -------------------------------------------------
    // Password reset is a separate notification/security step.
    // Its failure must not undo successful profile repair.
    // -------------------------------------------------
    let passwordReset: "sent" | "failed" | "not_configured" = "not_configured";

    if (
      process.env.BETTER_AUTH_URL &&
      process.env.RESEND_API_KEY &&
      process.env.EMAIL_FROM
    ) {
      try {
        await auth.api.requestPasswordReset({
          body: {
            email: target.email,
            redirectTo: `${process.env.BETTER_AUTH_URL}/reset-password`,
          },
          headers: request.headers,
        });

        passwordReset = "sent";
      } catch (error) {
        console.error("Repair password reset email failed", {
          userId: target.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        passwordReset = "failed";
      }
    }

    await auditAccountAction({
      schoolId,
      actorUserId: session.user.id,
      targetUserId: target.id,
      action: "failed_account_repaired",
    });

    return NextResponse.json({
      success: true,
      passwordReset,
      message:
        passwordReset === "sent"
          ? "The school relationships were repaired and a password-reset request was accepted by the email provider."
          : passwordReset === "failed"
            ? "The school relationships were repaired and the account is active, but the password-reset email could not be sent. Retry the password reset separately."
            : "The school relationships were repaired and the account is active. Email delivery is not configured, so a password reset must be arranged separately.",
    });
  } catch (error) {
    // Only the operation holding this lease may record its failure.
    // A stale request cannot overwrite another operation's state.
    if (claimedUserId && leaseToken && schoolId && !activated) {
      await markProvisioningFailed({
        userId: claimedUserId,
        schoolId,
        leaseToken,
        failureStage: currentStage,
      }).catch((failureError) => {
        console.error("Could not record repair failure", {
          userId: claimedUserId,
          error:
            failureError instanceof Error
              ? failureError.message
              : "Unknown error",
        });
      });
    }

    const message =
      error instanceof Error ? error.message : "Account repair failed";

    if (message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error("Account provisioning repair failed", {
      userId: claimedUserId,
      schoolId,
      error: message,
    });

    return NextResponse.json({ error: message }, { status: 409 });
  }
}
