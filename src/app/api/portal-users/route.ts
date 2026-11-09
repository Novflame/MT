import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import {
  parentStudents,
  parents,
  students,
  studentUsers,
} from "@/db/schema"

import { requirePermission } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"

import { getStudentFullName } from "@/lib/student-name"

import {
  auditAccountAction,
  createProvisionedAccount,
  markProvisioningActive,
  markProvisioningFailed,
  requestAccountEmailVerification,
  ProvisioningError,
  type ProvisionedSchoolRole,
} from "@/auth/account-provisioning"

type PortalRole = "parent" | "student"

type ParentProvisioningMetadata = {
  studentIds: string[]
  parentName: string
  parentPhone: string
  createParentProfile: boolean
}

function parseParentMetadata(
  value: string | Record<string, unknown> | null,
): ParentProvisioningMetadata | null {
  try {
    const parsed =
      typeof value === "string" ? JSON.parse(value) : value

    if (!parsed || typeof parsed !== "object") return null

    const metadata = parsed as Record<string, unknown>

    if (
      !Array.isArray(metadata.studentIds) ||
      !metadata.studentIds.every(
        (id): id is string => typeof id === "string",
      ) ||
      typeof metadata.createParentProfile !== "boolean"
    ) {
      return null
    }

    return {
      studentIds: metadata.studentIds,
      parentName:
        typeof metadata.parentName === "string"
          ? metadata.parentName
          : "",
      parentPhone:
        typeof metadata.parentPhone === "string"
          ? metadata.parentPhone
          : "",
      createParentProfile: metadata.createParentProfile,
    }
  } catch {
    return null
  }
}

function sameIds(first: string[], second: string[]) {
  const a = [...new Set(first)].sort()
  const b = [...new Set(second)].sort()

  return (
    a.length === b.length &&
    a.every((id, index) => id === b[index])
  )
}

export async function POST(request: Request) {
  let createdUserId: string | null = null
  let schoolId: number | null = null
  let actorUserId = ""

  try {
    const session = await requirePermission("users.create")
    actorUserId = session.user.id

    const [actor] = await centralDb
      .select({ schoolId: user.schoolId })
      .from(user)
      .where(eq(user.id, actorUserId))
      .limit(1)

    if (!actor) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 403 },
      )
    }

    schoolId = actor.schoolId

    const body = (await request.json()) as Record<string, unknown>

    let name =
      typeof body.name === "string" ? body.name.trim() : ""

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : ""

    let phone =
      typeof body.phone === "string" ? body.phone.trim() : ""

    const role = body.role as string
    const parentId =
      typeof body.parentId === "string"
        ? body.parentId.trim()
        : ""

    const requestedStudentIds = Array.isArray(body.studentIds)
      ? [
          ...new Set(
            body.studentIds
              .filter(
                (value): value is string =>
                  typeof value === "string",
              )
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ]
      : typeof body.studentId === "string" &&
          body.studentId.trim()
        ? [body.studentId.trim()]
        : []

    if (role !== "parent" && role !== "student") {
      return NextResponse.json(
        { error: "A parent/student role is required" },
        { status: 400 },
      )
    }

    if (role === "student" && requestedStudentIds.length !== 1) {
      return NextResponse.json(
        { error: "Select exactly one student profile" },
        { status: 400 },
      )
    }

    if (
      role === "parent" &&
      !parentId &&
      requestedStudentIds.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Select an existing parent profile or at least one child",
        },
        { status: 400 },
      )
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      )
    }

    const db = await getSchoolDB()

    let existingParent: typeof parents.$inferSelect | null = null

    if (role === "parent" && parentId) {
      existingParent =
        (await db.query.parents.findFirst({
          where: eq(parents.id, parentId),
        })) ?? null

      if (!existingParent) {
        return NextResponse.json(
          { error: "Parent profile not found in this school" },
          { status: 404 },
        )
      }
    }

    // Validate selected student profiles.
    for (const studentId of requestedStudentIds) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      })

      if (!student) {
        return NextResponse.json(
          {
            error:
              "One or more selected students were not found in this school",
          },
          { status: 404 },
        )
      }
    }

    // If the parent already has an active account, link children
    // to that identity instead of creating another account.
    if (role === "parent" && existingParent?.userId) {
      if (requestedStudentIds.length === 0) {
        return NextResponse.json(
          {
            error:
              "Select one or more children to link to this existing parent account",
          },
          { status: 400 },
        )
      }

      const [existingAccount] = await centralDb
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          schoolId: user.schoolId,
          schoolRole: user.schoolRole,
          banned: user.banned,
          provisioningStatus: user.provisioningStatus,
        })
        .from(user)
        .where(
          and(
            eq(user.id, existingParent.userId),
            eq(user.schoolId, schoolId),
          ),
        )
        .limit(1)

      if (
        !existingAccount ||
        existingAccount.schoolRole !== "parent"
      ) {
        return NextResponse.json(
          { error: "Parent account is not valid for this school" },
          { status: 409 },
        )
      }

      if (
        existingAccount.banned ||
        existingAccount.provisioningStatus !== "active"
      ) {
        return NextResponse.json(
          {
            error:
              "The existing parent account is disabled or incomplete",
          },
          { status: 409 },
        )
      }

      // better-sqlite3 transaction: keep all operations synchronous.
      db.transaction((tx) => {
        for (const studentId of requestedStudentIds) {
          const existingLink = tx
            .select()
            .from(parentStudents)
            .where(
              and(
                eq(parentStudents.parentId, existingParent!.id),
                eq(parentStudents.studentId, studentId),
              ),
            )
            .get()

          if (!existingLink) {
            tx.insert(parentStudents)
              .values({
                id: randomUUID(),
                parentId: existingParent!.id,
                studentId,
              })
              .run()
          }
        }

        for (const studentId of requestedStudentIds) {
          const verified = tx
            .select()
            .from(parentStudents)
            .where(
              and(
                eq(parentStudents.parentId, existingParent!.id),
                eq(parentStudents.studentId, studentId),
              ),
            )
            .get()

          if (!verified) {
            throw new Error(
              `Could not verify parent-child relationship: ${studentId}`,
            )
          }
        }
      })

      await auditAccountAction({
        schoolId,
        actorUserId,
        targetUserId: existingAccount.id,
        action: "existing_parent_account_linked_to_children",
      })

      return NextResponse.json({
        success: true,
        linkedExisting: true,
        linkedStudentCount: requestedStudentIds.length,
        user: {
          id: existingAccount.id,
          name: existingAccount.name,
          email: existingAccount.email,
          role: "parent",
        },
      })
    }

    if (role === "parent" && existingParent) {
      if (existingParent.userId) {
        return NextResponse.json(
          { error: "This parent profile already has a login account" },
          { status: 409 },
        )
      }

      name = existingParent.name
      phone = existingParent.phone
    }

    if (role === "parent" && !name && !existingParent) {
      return NextResponse.json(
        { error: "A name is required for a new parent profile" },
        { status: 400 },
      )
    }

    let selectedStudent: typeof students.$inferSelect | null = null

    if (role === "student") {
      selectedStudent =
        (await db.query.students.findFirst({
          where: eq(students.id, requestedStudentIds[0]),
        })) ?? null

      if (!selectedStudent) {
        return NextResponse.json(
          { error: "Student profile not found" },
          { status: 404 },
        )
      }

      name = getStudentFullName(selectedStudent)
    }

    // For an existing parent profile, an empty selection means
    // retain its already-established children.
    let intendedStudentIds = requestedStudentIds

    if (
      role === "parent" &&
      existingParent &&
      intendedStudentIds.length === 0
    ) {
      const existingLinks = await db.query.parentStudents.findMany({
        where: eq(parentStudents.parentId, existingParent.id),
      })

      intendedStudentIds = existingLinks.map((link) => link.studentId)

      if (intendedStudentIds.length === 0) {
        return NextResponse.json(
          {
            error:
              "Link at least one child to this parent before creating the portal account",
          },
          { status: 409 },
        )
      }
    }

    // A student profile linked to another identity cannot be reassigned.
    // The same identity is accepted during recovery.
    if (role === "student") {
      const existingLink = await db.query.studentUsers.findFirst({
        where: eq(studentUsers.studentId, intendedStudentIds[0]),
      })

      if (existingLink) {
        const [linkedAccount] = await centralDb
          .select({ id: user.id })
          .from(user)
          .where(
            and(
              eq(user.id, existingLink.userId),
              eq(user.schoolId, schoolId),
            ),
          )
          .limit(1)

        if (!linkedAccount) {
          return NextResponse.json(
            { error: "This student is already linked to another account" },
            { status: 409 },
          )
        }
      }
    }

    const plannedParentId =
      role === "parent"
        ? parentId || randomUUID()
        : null

    const metadata: ParentProvisioningMetadata | null =
      role === "parent"
        ? {
            studentIds: intendedStudentIds,
            parentName: name,
            parentPhone: phone,
            createParentProfile: !parentId,
          }
        : null

    const created = await createProvisionedAccount({
      name,
      email,
      phone: phone || null,
      schoolId,
      schoolRole: role as ProvisionedSchoolRole,
      provisioningType: role,
      provisioningReferenceId:
        role === "student"
          ? intendedStudentIds[0]
          : plannedParentId,
      provisioningMetadata: metadata,
    })

    createdUserId = created.id

    // During recovery, use the original persisted metadata and IDs.
    let resolvedParentId: string | null = null

    if (role === "parent") {
      const savedMetadata = parseParentMetadata(
        created.provisioningMetadata,
      )

      if (!savedMetadata || !created.provisioningReferenceId) {
        throw new Error(
          "Saved parent provisioning data is missing or invalid. Administrative review is required.",
        )
      }

      if (
        !sameIds(
          requestedStudentIds,
          savedMetadata.studentIds,
        ) &&
        requestedStudentIds.length > 0
      ) {
        throw new ProvisioningError(
          "The selected children do not match the original provisioning request.",
          "RECOVERY_CONTEXT_MISMATCH",
        )
      }

      intendedStudentIds = savedMetadata.studentIds
      name = savedMetadata.parentName
      phone = savedMetadata.parentPhone
      resolvedParentId = created.provisioningReferenceId

      // Validate the original child IDs again before writing relationships.
      for (const studentId of intendedStudentIds) {
        const student = await db.query.students.findFirst({
          where: eq(students.id, studentId),
        })

        if (!student) {
          throw new Error(
            `A child from the original parent request no longer exists: ${studentId}`,
          )
        }
      }
    }

    // Establish and verify school-side relationships atomically.
    try {
      db.transaction((tx) => {
        if (role === "student") {
          const studentId = intendedStudentIds[0]

          const existingLink = tx
            .select()
            .from(studentUsers)
            .where(eq(studentUsers.studentId, studentId))
            .get()

          if (existingLink) {
            if (existingLink.userId !== created.id) {
              throw new Error(
                "This student profile is already linked to another account",
              )
            }
          } else {
            tx.insert(studentUsers)
              .values({
                id: randomUUID(),
                userId: created.id,
                studentId,
              })
              .run()
          }

          const verified = tx
            .select()
            .from(studentUsers)
            .where(
              and(
                eq(studentUsers.studentId, studentId),
                eq(studentUsers.userId, created.id),
              ),
            )
            .get()

          if (!verified) {
            throw new Error("Student account relationship verification failed")
          }

          return
        }

        const parentProfileId = resolvedParentId!

        const currentParent = tx
          .select()
          .from(parents)
          .where(eq(parents.id, parentProfileId))
          .get()

        if (!currentParent) {
          if (!metadata?.createParentProfile) {
            throw new Error("The original parent profile no longer exists")
          }

         tx.insert(parents)
  .values({
    id: parentProfileId,
    userId: created.id,
    name,
    phone: phone || "",
  })
  .run()
        } else if (currentParent.userId === created.id) {
          // Already linked by an earlier partial attempt. Continue safely.
        } else if (currentParent.userId === null) {
          const updated = tx
            .update(parents)
            .set({ userId: created.id })
            .where(
              and(
                eq(parents.id, parentProfileId),
                isNull(parents.userId),
              ),
            )
            .run()

          if (updated.changes !== 1) {
            const rechecked = tx
              .select()
              .from(parents)
              .where(eq(parents.id, parentProfileId))
              .get()

            if (rechecked?.userId !== created.id) {
              throw new Error(
                "Parent profile was linked to another account",
              )
            }
          }
        } else {
          throw new Error(
            "Parent profile is already linked to another account",
          )
        }

        const verifiedParent = tx
          .select()
          .from(parents)
          .where(eq(parents.id, parentProfileId))
          .get()

        if (!verifiedParent || verifiedParent.userId !== created.id) {
          throw new Error("Parent account relationship verification failed")
        }

        for (const studentId of intendedStudentIds) {
          const existingLink = tx
            .select()
            .from(parentStudents)
            .where(
              and(
                eq(parentStudents.parentId, parentProfileId),
                eq(parentStudents.studentId, studentId),
              ),
            )
            .get()

          if (!existingLink) {
            tx.insert(parentStudents)
              .values({
                id: randomUUID(),
                parentId: parentProfileId,
                studentId,
              })
              .run()
          }

          const verifiedLink = tx
            .select()
            .from(parentStudents)
            .where(
              and(
                eq(parentStudents.parentId, parentProfileId),
                eq(parentStudents.studentId, studentId),
              ),
            )
            .get()

          if (!verifiedLink) {
            throw new Error(
              `Parent-child relationship verification failed: ${studentId}`,
            )
          }
        }

        const childCount = tx
          .select()
          .from(parentStudents)
          .where(eq(parentStudents.parentId, parentProfileId))
          .all().length

        if (childCount === 0) {
          throw new Error("The parent account must have at least one child")
        }
      })

      // Activate only after the school transaction and relationship
      // verification have completed successfully.
await markProvisioningActive({
  userId: created.id,
  schoolId,
  leaseToken: created.leaseToken,
  schoolProfileVerified: true,
  relationshipVerified: true,
})    } catch (error) {
await markProvisioningFailed({
  userId: created.id,
  schoolId,
  leaseToken: created.leaseToken,
  failureStage: "relationship_creation",
})
      console.error("Portal account relationship setup failed", {
        userId: created.id,
        schoolId,
        role,
        error:
          error instanceof Error ? error.message : "Unknown error",
      })

      return NextResponse.json(
        {
          error:
            "The account exists but its school relationships could not be completed. It remains inactive and can be recovered.",
          userId: created.id,
        },
        { status: 500 },
      )
    }

    // Email delivery is independent of provisioning success.
    const emailVerification =
      await requestAccountEmailVerification(created.email)

    await auditAccountAction({
      schoolId,
      actorUserId,
      targetUserId: created.id,
      action:
        role === "parent"
          ? created.reused
            ? "parent_portal_recovered_and_linked"
            : "parent_portal_created_and_linked"
          : created.reused
            ? "student_portal_recovered_and_linked"
            : "student_portal_created_and_linked",
    })

    return NextResponse.json(
      {
        success: true,
        recovered: created.reused,
        user: {
          id: created.id,
          name: created.name,
          email: created.email,
          phone: phone || null,
          role,
          mustChangePassword: true,
        },
        initialPassword: created.initialPassword,
        ...(created.initialPassword
          ? {
              initialPasswordNotice:
                "Shown once. Copy it now; it will not be displayed again.",
            }
          : {
              recoveryNotice:
                "The existing account was recovered. Its original password was not changed or regenerated.",
            }),
        emailVerification,
      },
      { status: created.reused ? 200 : 201 },
    )
  } catch (error) {
    if (error instanceof ProvisioningError) {
      const status =
        error.code === "DUPLICATE_ACCOUNT" ||
        error.code === "PROVISIONING_IN_PROGRESS" ||
        error.code === "RECOVERY_CONTEXT_MISMATCH"
          ? 409
          : 400

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      )
    }

    if (
      error instanceof Error &&
      error.name === "DuplicateAccountError"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      )
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    console.error("POST /api/portal-users failed", {
      userId: createdUserId,
      schoolId,
      error:
        error instanceof Error ? error.message : "Unknown error",
    })

    return NextResponse.json(
      { error: "Failed to create portal account" },
      { status: 500 },
    )
  }
}