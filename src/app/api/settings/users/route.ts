
import { NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import { staffProfiles } from "@/db/schema"
import { requirePermission } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { canAssignStaffRole } from "@/auth/role-assignment"

import {
  auditAccountAction,
  createProvisionedAccount,
  advanceProvisioningStage,
  markProvisioningActive,
  markProvisioningFailed,
  requestAccountEmailVerification,
  ProvisioningError,
  type ProvisionedSchoolRole,
  type ProvisioningStage,
} from "@/auth/account-provisioning"
type StaffInput = {
  name: string
  email: string
  phone: string | null
  schoolRole: string
}

type StaffResult = {
  email: string
  success: boolean
  userId?: string
  initialPassword?: string | null
  emailVerification?: "sent" | "not_configured" | "failed"
  error?: string
}

function parseStaffInput(
  value: unknown,
): StaffInput | null {
  if (!value || typeof value !== "object") return null

  const row = value as Record<string, unknown>

  const name =
    typeof row.name === "string" ? row.name.trim() : ""

  const email =
    typeof row.email === "string"
      ? row.email.trim().toLowerCase()
      : ""

  const phone =
    typeof row.phone === "string"
      ? row.phone.trim() || null
      : null

  const schoolRole =
    typeof row.schoolRole === "string"
      ? row.schoolRole
      : ""

  if (
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !schoolRole
  ) {
    return null
  }

  return { name, email, phone, schoolRole }
}

function getProvisioningErrorMessage(error: unknown): string {
  if (error instanceof ProvisioningError) {
    switch (error.code) {
      case "DUPLICATE_ACCOUNT":
        return "An account with this email already exists."

      case "PROVISIONING_IN_PROGRESS":
        return "This account is already being provisioned. Retry after the current operation finishes."

      case "RECOVERY_CONTEXT_MISMATCH":
        return "An account with this email exists, but it does not match this provisioning request."

      case "ACCOUNT_NOT_FOUND":
        return "The account could not be found."

      case "ACCOUNT_NOT_PROVISIONING":
        return "The account provisioning state changed before activation."
    }
  }

  return "Account creation or staff-profile linking failed."
}

async function ensureStaffProfile(
  userId: string,
  phone: string | null,
) {
  const db = await getSchoolDB()

  // The unique userId constraint makes this safe against duplicate inserts.
  await db
    .insert(staffProfiles)
    .values({
      userId,
      phone: phone ?? "",
    })
    .onConflictDoNothing({
      target: staffProfiles.userId,
    })

  const [profile] = await db
    .select({
      userId: staffProfiles.userId,
    })
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, userId))
    .limit(1)

  if (!profile || profile.userId !== userId) {
    throw new Error("Staff profile relationship verification failed.")
  }
}
async function provisionStaffAccount(
  created: Awaited<ReturnType<typeof createProvisionedAccount>>,
  schoolId: number,
  phone: string | null,
) {
  let stage: ProvisioningStage = created.stage

  const advance = async (nextStage: ProvisioningStage) => {
    await advanceProvisioningStage({
      userId: created.id,
      schoolId,
      leaseToken: created.leaseToken,
      expectedStage: stage,
      nextStage,
    })

    stage = nextStage
  }

  try {
    // Account creation -> School profile
    if (stage === "account_creation") {
      await advance("school_profile")
    }

    // Create or recover the staff profile.
    if (stage === "school_profile") {
      await ensureStaffProfile(created.id, phone)
      await advance("relationship_creation")
    }

    // Verify the permanent central account-school relationship.
    if (stage === "relationship_creation") {
      const [account] = await centralDb
        .select({
          id: user.id,
          schoolId: user.schoolId,
          schoolRole: user.schoolRole,
          provisioningStatus: user.provisioningStatus,
        })
        .from(user)
        .where(eq(user.id, created.id))
        .limit(1)

      if (
        !account ||
        account.schoolId !== schoolId ||
        account.schoolRole !== created.schoolRole ||
        account.provisioningStatus !== "provisioning"
      ) {
        throw new Error(
          "The permanent account-school relationship could not be verified.",
        )
      }

      await advance("relationship_verification")
    }

    // Re-verify both the school profile and central relationship.
    if (stage === "relationship_verification") {
      const db = await getSchoolDB()

      const [profile] = await db
        .select({
          userId: staffProfiles.userId,
        })
        .from(staffProfiles)
        .where(eq(staffProfiles.userId, created.id))
        .limit(1)

      const [account] = await centralDb
        .select({
          id: user.id,
          schoolId: user.schoolId,
          schoolRole: user.schoolRole,
          provisioningStatus: user.provisioningStatus,
        })
        .from(user)
        .where(eq(user.id, created.id))
        .limit(1)

      if (
        !profile ||
        profile.userId !== created.id ||
        !account ||
        account.schoolId !== schoolId ||
        account.schoolRole !== created.schoolRole ||
        account.provisioningStatus !== "provisioning"
      ) {
        throw new Error(
          "Final staff relationship verification failed.",
        )
      }

      await advance("activation")
    }

    if (stage !== "activation") {
      throw new Error(
        `Unexpected provisioning stage: ${stage}`,
      )
    }

    await markProvisioningActive({
      userId: created.id,
      schoolId,
      leaseToken: created.leaseToken,
      schoolProfileVerified: true,
      relationshipVerified: true,
    })
  } catch (error) {
    // A stale request must never mark another request's operation failed.
    await markProvisioningFailed({
      userId: created.id,
      schoolId,
      leaseToken: created.leaseToken,
      failureStage: stage,
    }).catch((failureError) => {
      console.error("Could not record provisioning failure", {
        userId: created.id,
        error:
          failureError instanceof Error
            ? failureError.message
            : "Unknown error",
      })
    })

    throw error
  }
}
async function createStaffAccount(
  input: StaffInput,
  schoolId: number,
  actorId: string,
) {
  const created = await createProvisionedAccount({
    name: input.name,
    email: input.email,
    phone: input.phone,
    schoolId,
    schoolRole: input.schoolRole as ProvisionedSchoolRole,
    provisioningType: "staff",
  })

await provisionStaffAccount(created, schoolId, input.phone)

  // Audit and email delivery are post-activation operations.
  // Their failure must not turn a successfully linked account into a failed account.
  let emailVerification:
    | "sent"
    | "not_configured"
    | "failed" = "not_configured"

  try {
    emailVerification = await requestAccountEmailVerification(
      created.email,
    )
  } catch (error) {
    console.error("Staff verification email failed", {
      userId: created.id,
      errorType: error instanceof Error ? error.name : "unknown",
    })

    emailVerification = "failed"
  }

  try {
    await auditAccountAction({
      schoolId,
      actorUserId: actorId,
      targetUserId: created.id,
      action: created.reused
        ? "staff_account_recovered"
        : "staff_account_created",
    })
  } catch (error) {
    console.error("Staff account audit failed", {
      userId: created.id,
      errorType: error instanceof Error ? error.name : "unknown",
    })
  }

  return {
    created,
    emailVerification,
  }
}

// =====================================================
// GET — Load staff users for the current school
// =====================================================

export async function GET() {
  try {
    const session = await requirePermission("users.read")

    const [currentUser] = await centralDb
      .select({
        schoolId: user.schoolId,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)

    const schoolId = currentUser?.schoolId

    if (!schoolId) {
      return NextResponse.json(
        { error: "User is not assigned to a school." },
        { status: 403 },
      )
    }

    const users = await centralDb
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        schoolRole: user.schoolRole,
        banned: user.banned,
        phone: user.phone,
        emailVerified: user.emailVerified,
        mustChangePassword: user.mustChangePassword,
        provisioningStatus: user.provisioningStatus,
      })
      .from(user)
      .where(
        and(
          eq(user.schoolId, schoolId),
          inArray(user.schoolRole, [
            "principal",
            "deputy",
            "teacher",
            "head_of_class",
            "head_of_department",
          ]),
        ),
      )

    return NextResponse.json({ users })
  } catch (error) {
    console.error("GET /api/settings/users failed:", error)

    return NextResponse.json(
      { error: "Failed to load users." },
      { status: 500 },
    )
  }
}

// =====================================================
// POST — Create or recover staff accounts
// =====================================================

export async function POST(request: Request) {
  let schoolId: number | null = null
  let actorId = ""

  try {
    const session = await requirePermission("users.create")
    actorId = session.user.id

    const [actor] = await centralDb
      .select({
        schoolId: user.schoolId,
        schoolRole: user.schoolRole,
      })
      .from(user)
      .where(eq(user.id, actorId))
      .limit(1)

    if (!actor || !actor.schoolId) {
      return NextResponse.json(
        { error: "Account is not assigned to a school." },
        { status: 403 },
      )
    }

    schoolId = actor.schoolId

    const body = (await request.json()) as Record<string, unknown>

    // -------------------------------------------------
    // Batch creation
    // -------------------------------------------------

    if (Array.isArray(body.accounts)) {
      const results: StaffResult[] = []

      for (const raw of body.accounts) {
        const input = parseStaffInput(raw)

        if (
          !input ||
          !canAssignStaffRole(actor.schoolRole, input.schoolRole)
        ) {
          results.push({
            email:
              raw && typeof raw === "object" &&
              typeof (raw as Record<string, unknown>).email === "string"
                ? String((raw as Record<string, unknown>).email)
                    .trim()
                    .toLowerCase()
                : "",
            success: false,
            error: "Invalid name/email or role not permitted.",
          })

          continue
        }

        try {
          const { created, emailVerification } =
            await createStaffAccount(input, schoolId, actorId)

          results.push({
            email: input.email,
            success: true,
            userId: created.id,
            initialPassword: created.initialPassword,
            emailVerification,
          })
        } catch (error) {
          console.error("Batch staff account failed", {
            email: input.email,
            errorType: error instanceof Error ? error.name : "unknown",
            errorCode:
              error instanceof ProvisioningError
                ? error.code
                : undefined,
          })

          results.push({
            email: input.email,
            success: false,
            error: getProvisioningErrorMessage(error),
          })
        }
      }

      return NextResponse.json(
        {
          success: results.every((result) => result.success),
          results,
        },
        { status: 200 },
      )
    }

    // -------------------------------------------------
    // Single account creation
    // -------------------------------------------------

    const input = parseStaffInput(body)

    if (!input) {
      return NextResponse.json(
        { error: "A valid name, email and school role are required." },
        { status: 400 },
      )
    }

    if (!canAssignStaffRole(actor.schoolRole, input.schoolRole)) {
      return NextResponse.json(
        { error: "You are not allowed to assign this role." },
        { status: 403 },
      )
    }

    const { created, emailVerification } =
      await createStaffAccount(input, schoolId, actorId)

    return NextResponse.json(
      {
        success: true,
        recovered: created.reused,
        user: {
          id: created.id,
          name: created.name,
          email: created.email,
          phone: input.phone,
          schoolRole: input.schoolRole,
          mustChangePassword: true,
        },
        initialPassword: created.initialPassword,
        emailVerification,
        initialPasswordNotice: created.reused
          ? null
          : "Shown once. Copy it now; it will not be displayed again.",
      },
      { status: created.reused ? 200 : 201 },
    )
  } catch (error) {
    if (error instanceof ProvisioningError) {
      const status =
        error.code === "DUPLICATE_ACCOUNT" ||
        error.code === "RECOVERY_CONTEXT_MISMATCH"
          ? 409
          : error.code === "PROVISIONING_IN_PROGRESS"
            ? 409
            : 400

      return NextResponse.json(
        { error: getProvisioningErrorMessage(error) },
        { status },
      )
    }

    console.error("POST /api/settings/users failed", {
      schoolId,
      actorId,
      errorType: error instanceof Error ? error.name : "unknown",
    })

    return NextResponse.json(
      { error: "Failed to create staff account." },
      { status: 500 },
    )
  }
}

