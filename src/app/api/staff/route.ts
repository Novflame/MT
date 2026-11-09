
import { NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"

import { requirePermission } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"
import { staffProfiles } from "@/db/schema"
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
async function ensureStaffProfile(
  userId: string,
  phone: string | null,
) {
  const db = await getSchoolDB()

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
    throw new Error("Staff profile relationship verification failed")
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
function provisioningErrorMessage(error: unknown) {
  if (error instanceof ProvisioningError) {
    switch (error.code) {
      case "DUPLICATE_ACCOUNT":
        return "An account with this email already exists."

      case "PROVISIONING_IN_PROGRESS":
        return "This account is already being provisioned."

      case "RECOVERY_CONTEXT_MISMATCH":
        return "The existing account does not match this provisioning request."

      case "ACCOUNT_NOT_FOUND":
        return "The account could not be found."

      case "ACCOUNT_NOT_PROVISIONING":
        return "The account provisioning state changed before activation."
    }
  }

  return "Failed to create or link the staff account."
}

export async function POST(request: Request) {
let targetUserId: string | null = null
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
    { error: "Account not found or not assigned to a school." },
    { status: 403 },
  )
}

schoolId = actor.schoolId

const body = (await request.json()) as Record<string, unknown>

const name =
  typeof body.name === "string" ? body.name.trim() : ""

const email =
  typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : ""

const phone =
  typeof body.phone === "string"
    ? body.phone.trim() || null
    : null

const role =
  typeof body.role === "string"
    ? body.role
    : typeof body.schoolRole === "string"
      ? body.schoolRole
      : ""

if (
  !name ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
) {
  return NextResponse.json(
    { error: "A valid name and email are required." },
    { status: 400 },
  )
}

if (!canAssignStaffRole(actor.schoolRole, role)) {
  return NextResponse.json(
    { error: "You are not allowed to assign this role." },
    { status: 403 },
  )
}

const created = await createProvisionedAccount({
  name,
  email,
  phone,
  schoolId,
  schoolRole: role as ProvisionedSchoolRole,
  provisioningType: "staff",
})

targetUserId = created.id

try {
  await provisionStaffAccount(created, schoolId, phone)
} catch (error) {
  console.error("Staff provisioning failed", {
    userId: created.id,
    schoolId,
    errorType: error instanceof Error ? error.name : "unknown",
    errorCode:
      error instanceof ProvisioningError
        ? error.code
        : undefined,
  })

  return NextResponse.json(
    {
      error:
        "The account could not be linked to its staff profile. It has been retained for administrative repair.",
      userId: created.id,
    },
    { status: 500 },
  )
}

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

return NextResponse.json(
  {
    success: true,
    recovered: created.reused,
    staff: {
      id: created.id,
      name: created.name,
      email: created.email,
      phone,
      role,
      schoolId,
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
error.code === "RECOVERY_CONTEXT_MISMATCH" ||
error.code === "PROVISIONING_IN_PROGRESS"
? 409
: error.code === "ACCOUNT_NOT_FOUND"
? 404
: error.code === "ACCOUNT_BANNED"
? 403
: 400


  return NextResponse.json(
    { error: provisioningErrorMessage(error) },
    { status },
  )
}

if (error instanceof Error && error.message === "Forbidden") {
  return NextResponse.json(
    { error: "Forbidden" },
    { status: 403 },
  )
}

console.error("POST /api/staff failed", {
  userId: targetUserId,
  schoolId,
  errorType: error instanceof Error ? error.name : "unknown",
})

return NextResponse.json(
  { error: "Failed to create staff account." },
  { status: 500 },
)


}
}

export async function GET() {
  try {
    const session = await requirePermission("users.read")

    const [actor] = await centralDb
      .select({
        schoolId: user.schoolId,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)

    if (!actor || !actor.schoolId) {
      return NextResponse.json(
        { error: "Account not found or not assigned to a school." },
        { status: 403 },
      )
    }

    const staff = await centralDb
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.schoolRole,
        schoolId: user.schoolId,
        banned: user.banned,
        emailVerified: user.emailVerified,
        mustChangePassword: user.mustChangePassword,
        provisioningStatus: user.provisioningStatus,
      })
      .from(user)
      .where(
        and(
          eq(user.schoolId, actor.schoolId),
          inArray(user.schoolRole, [
            "principal",
            "deputy",
            "teacher",
            "head_of_class",
            "head_of_department",
          ]),
        ),
      )

    return NextResponse.json({
      success: true,
      staff,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    console.error("GET /api/staff failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    })

    return NextResponse.json(
      { error: "Failed to get staff." },
      { status: 500 },
    )
  }
}
