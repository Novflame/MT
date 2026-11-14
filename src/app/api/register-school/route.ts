import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import Database from "better-sqlite3"
import { and, eq, isNull, lt, or, sql , gte} from "drizzle-orm"
import { drizzle } from "drizzle-orm/better-sqlite3"

import { auth } from "@/auth/auth"
import { requestAccountEmailVerification } from "@/auth/account-provisioning"
import { centralDb } from "@/db/central"
import {
  schools,
  user as centralUser,
  schoolRegistrationOperations,
} from "@/db/centeral-schema"
import * as schoolSchema from "@/db/schema"
import { seedDepartments, seedActiveAcademicYear } from "@/db/seed"
import { runSchoolMigrations } from "@/db/runtime-migrations"
import { getSchoolDatabasePath } from "@/db/database-path"

const LEASE_DURATION_MS = 15 * 60 * 1000

type RegistrationStage =
  | "school_creation"
  | "school_database_initialization"
  | "principal_account_creation"
  | "principal_profile_creation"
  | "relationship_verification"
  | "activation"
  | "completed"

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function parseMetadata(value: string | null) {
  if (!value) return {}

  try {
    const parsed: unknown = JSON.parse(value)

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // Preserve registration recovery if old metadata is malformed.
  }

  return {}
}

async function renewLease(
  operationId: string,
  leaseToken: string,
  expectedStage?: RegistrationStage,
) {
  const now = new Date()

  const conditions = [
    eq(schoolRegistrationOperations.id, operationId),
    eq(schoolRegistrationOperations.status, "provisioning"),
    eq(schoolRegistrationOperations.leaseToken, leaseToken),
    sql`${schoolRegistrationOperations.leaseUntil} > ${now.getTime()}`,
  ]

  if (expectedStage) {
    conditions.push(
      eq(schoolRegistrationOperations.stage, expectedStage),
    )
  }

  const updated = await centralDb
    .update(schoolRegistrationOperations)
    .set({
      leaseUntil: new Date(now.getTime() + LEASE_DURATION_MS),
      updatedAt: now,
    })
    .where(and(...conditions))
    .returning({ id: schoolRegistrationOperations.id })

  if (updated.length !== 1) {
    throw new Error("Registration operation lease was lost")
  }
}

async function updateStage(
  operationId: string,
  leaseToken: string,
  stage: RegistrationStage,
) {
  const now = new Date()

  const updated = await centralDb
    .update(schoolRegistrationOperations)
    .set({
      stage,
      updatedAt: now,
    })
    .where(
      and(
        eq(schoolRegistrationOperations.id, operationId),
        eq(schoolRegistrationOperations.status, "provisioning"),
        eq(schoolRegistrationOperations.leaseToken, leaseToken),
        sql`${schoolRegistrationOperations.leaseUntil} > ${now.getTime()}`,
      ),
    )
    .returning({ id: schoolRegistrationOperations.id })

  if (updated.length !== 1) {
    throw new Error("Registration operation ownership was lost")
  }
}

async function recordFailure(
  operationId: string,
  leaseToken: string,
  stage: RegistrationStage,
  error: unknown,
) {
  const now = new Date()

  const message =
    error instanceof Error ? error.message : "Unknown registration error"

  try {
    const [operation] = await centralDb
      .select({
        metadata: schoolRegistrationOperations.metadata,
      })
      .from(schoolRegistrationOperations)
      .where(
        and(
          eq(schoolRegistrationOperations.id, operationId),
          eq(schoolRegistrationOperations.leaseToken, leaseToken),
          eq(schoolRegistrationOperations.status, "provisioning"),
        ),
      )
      .limit(1)

    if (!operation) return

    const metadata = parseMetadata(operation.metadata)
    const previousAttempts = Array.isArray(metadata.attemptHistory)
      ? metadata.attemptHistory
      : []

    const attemptHistory = [
      ...previousAttempts.slice(-19),
      {
        stage,
        message: message.slice(0, 500),
        failedAt: now.toISOString(),
      },
    ]

    await centralDb
      .update(schoolRegistrationOperations)
      .set({
        status: "failed",
        failureStage: stage,
        lastError: message.slice(0, 1000),
        metadata: JSON.stringify({
          ...metadata,
          attemptHistory,
        }),
        leaseUntil: null,
        leaseToken: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schoolRegistrationOperations.id, operationId),
          eq(schoolRegistrationOperations.leaseToken, leaseToken),
          eq(schoolRegistrationOperations.status, "provisioning"),
        ),
      )
  } catch (failureError) {
    console.error("Failed to record school registration failure:", failureError)
  }
}

async function getOrCreateOperation(
  schoolSlug: string,
  adminEmail: string,
) {
  const proposedId = randomUUID()
  const now = new Date()

  await centralDb
    .insert(schoolRegistrationOperations)
    .values({
      id: proposedId,
      schoolSlug,
      adminEmail,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: schoolRegistrationOperations.schoolSlug,
    })

  const [operation] = await centralDb
    .select()
    .from(schoolRegistrationOperations)
    .where(eq(schoolRegistrationOperations.schoolSlug, schoolSlug))
    .limit(1)

  if (!operation) {
    throw new Error("Could not create or retrieve registration operation")
  }

  if (operation.adminEmail !== adminEmail) {
    throw new Error(
      "This school registration slug is already associated with another email",
    )
  }

  return operation
}

async function acquireLease(operationId: string) {
  const now = new Date()
  const leaseToken = randomUUID()
  const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MS)

  const acquired = await centralDb
    .update(schoolRegistrationOperations)
    .set({
      status: "provisioning",
      leaseToken,
      leaseUntil,
      attempts: sql`${schoolRegistrationOperations.attempts} + 1`,
      failureStage: null,
      lastError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(schoolRegistrationOperations.id, operationId),
        or(
          eq(schoolRegistrationOperations.status, "pending"),
          eq(schoolRegistrationOperations.status, "failed"),
          and(
            eq(schoolRegistrationOperations.status, "provisioning"),
            lt(schoolRegistrationOperations.leaseUntil, now),
          ),
        ),
      ),
    )
    .returning({ id: schoolRegistrationOperations.id })

  if (acquired.length !== 1) {
    return null
  }

  return leaseToken
}

async function ensureSchoolDatabase(schoolId: number) {
  const schoolDbPath = getSchoolDatabasePath(schoolId)

  fs.mkdirSync(path.dirname(schoolDbPath), { recursive: true })

  const sqlite = new Database(schoolDbPath)

  try {
    const db = drizzle(sqlite, { schema: schoolSchema })

    runSchoolMigrations(sqlite)
    await seedDepartments(db)
    await seedActiveAcademicYear(db)
  } finally {
    sqlite.close()
  }
}

async function ensurePrincipalProfile(
  schoolId: number,
  userId: string,
) {
  const schoolDbPath = getSchoolDatabasePath(schoolId)
  const sqlite = new Database(schoolDbPath)

  try {
    const db = drizzle(sqlite, { schema: schoolSchema })

    await db
      .insert(schoolSchema.staffProfiles)
      .values({ userId })
      .onConflictDoNothing({
        target: schoolSchema.staffProfiles.userId,
      })

    const [profile] = await db
      .select({ id: schoolSchema.staffProfiles.id })
      .from(schoolSchema.staffProfiles)
      .where(eq(schoolSchema.staffProfiles.userId, userId))
      .limit(1)

    if (!profile) {
      throw new Error("Principal staff profile could not be verified")
    }
  } finally {
    sqlite.close()
  }
}

export async function POST(request: Request) {
  let operationId: string | null = null
  let leaseToken: string | null = null
  let stage: RegistrationStage = "school_creation"

  try {
    const body = await request.json()

    const {
      name,
      slug,
      principalName,
      principalEmail,
      password,
    } = body

    if (
      typeof name !== "string" ||
      typeof slug !== "string" ||
      typeof principalName !== "string" ||
      typeof principalEmail !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !slug.trim() ||
      !principalName.trim() ||
      !principalEmail.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      )
    }

    const normalizedSlug = slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")

    const normalizedEmail = normalizeEmail(principalEmail)
    const normalizedName = name.trim()
    const normalizedPrincipalName = principalName.trim()


    const [existingOperation] = await centralDb
  .select({
    id: schoolRegistrationOperations.id,
  })
  .from(schoolRegistrationOperations)
  .where(eq(schoolRegistrationOperations.schoolSlug, normalizedSlug))
  .limit(1)

// Only check for an existing account when this is a new registration.
// Existing operations must be allowed to resume their own provisioning.
if (!existingOperation) {
  const [existingAccount] = await centralDb
    .select({ id: centralUser.id })
    .from(centralUser)
    .where(eq(centralUser.email, normalizedEmail))
    .limit(1)

  if (existingAccount) {
    return NextResponse.json(
      { error: "This email is already registered" },
      { status: 409 },
    )
  }
}


    const operation = await getOrCreateOperation(
      normalizedSlug,
      normalizedEmail,
    )

    operationId = operation.id

    if (operation.status === "completed") {
      if (!operation.schoolId || !operation.adminUserId) {
        throw new Error("Completed registration has missing references")
      }

      const [school] = await centralDb
        .select()
        .from(schools)
        .where(eq(schools.id, operation.schoolId))
        .limit(1)

      const [principal] = await centralDb
        .select()
        .from(centralUser)
        .where(eq(centralUser.id, operation.adminUserId))
        .limit(1)

      if (
  !school ||
  school.slug !== normalizedSlug ||
  !principal ||
  principal.email !== normalizedEmail ||
  principal.schoolId !== school.id ||
  principal.schoolRole !== "principal" ||
 (
  principal.provisioningStatus !== "provisioning" &&
  principal.provisioningStatus !== "active"
) ||
  principal.banned === true ||
  principal.provisioningOperationId !== operation.id
) {
  throw new Error("Completed registration could not be verified")
}

      return NextResponse.json(
        {
          success: true,
          school: {
            id: school.id,
            name: school.name,
            slug: school.slug,
          },
          principal: {
            id: principal.id,
            name: principal.name,
            email: principal.email,
          },
          emailVerification: "already_registered",
        },
        { status: 201 },
      )
    }

    leaseToken = await acquireLease(operation.id)

    if (!leaseToken) {
      return NextResponse.json(
        { error: "School registration is already in progress" },
        { status: 409 },
      )
    }




let schoolId = operation.schoolId

if (!schoolId) {
  stage = "school_creation"

  schoolId = centralDb.transaction((tx) => {
    const [currentOperation] = tx
      .select()
      .from(schoolRegistrationOperations)
      .where(
        and(
          eq(schoolRegistrationOperations.id, operation.id),
          eq(schoolRegistrationOperations.status, "provisioning"),
          eq(schoolRegistrationOperations.leaseToken, leaseToken!),
          sql`${schoolRegistrationOperations.leaseUntil} > ${Date.now()}`,
        ),
      )
      .limit(1)
      .all()

    if (!currentOperation) {
      throw new Error("Registration operation ownership was lost")
    }

    // A school already linked to this operation is recoverable.
    if (currentOperation.schoolId) {
      return currentOperation.schoolId
    }

    // Never adopt a school created outside this operation.
    const [existingSchool] = tx
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.slug, normalizedSlug))
      .limit(1)
      .all()

    if (existingSchool) {
      throw new Error(
        "This school slug is already registered",
      )
    }

    const [createdSchool] = tx
      .insert(schools)
      .values({
        name: normalizedName,
        slug: normalizedSlug,
      })
      .returning()
      .all()

    if (!createdSchool) {
      throw new Error("School creation failed")
    }

    const linked = tx
      .update(schoolRegistrationOperations)
      .set({
        schoolId: createdSchool.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schoolRegistrationOperations.id, operation.id),
          eq(schoolRegistrationOperations.status, "provisioning"),
          eq(schoolRegistrationOperations.leaseToken, leaseToken!),
        ),
      )
      .returning({ id: schoolRegistrationOperations.id })
      .all()

    if (linked.length !== 1) {
      throw new Error("Could not link school to registration operation")
    }

    return createdSchool.id
  })
}

    stage = "school_database_initialization"
    await updateStage(operation.id, leaseToken, stage)
    await renewLease(operation.id, leaseToken, stage)
    await ensureSchoolDatabase(schoolId)

    stage = "principal_account_creation"
    await updateStage(operation.id, leaseToken, stage)
    await renewLease(operation.id, leaseToken, stage)

  let principalId = operation.adminUserId

if (!principalId) {
  // First, recover an account already linked to this operation.
  const [linkedPrincipal] = await centralDb
    .select()
    .from(centralUser)
    .where(
      and(
        eq(centralUser.provisioningOperationId, operation.id),
        eq(centralUser.schoolId, schoolId),
        eq(centralUser.schoolRole, "principal"),
        eq(centralUser.email, normalizedEmail),
      ),
    )
    .limit(1)

  if (linkedPrincipal) {
    principalId = linkedPrincipal.id
  } else {
    // The operation is created before provisioning starts, so its timestamp
    // bounds recovery even if the process stopped before recording a failure.
    const [recoveredPrincipal] = await centralDb
      .update(centralUser)
      .set({
        provisioningOperationId: operation.id,
      })
      .where(
        and(
          eq(centralUser.email, normalizedEmail),
          eq(centralUser.schoolId, schoolId),
          eq(centralUser.schoolRole, "principal"),
          eq(centralUser.provisioningStatus, "provisioning"),
          isNull(centralUser.provisioningOperationId),
          eq(centralUser.name, normalizedPrincipalName),
          gte(centralUser.createdAt, operation.createdAt),
          or(
            eq(centralUser.banned, false),
            isNull(centralUser.banned),
          ),
        ),
      )
      .returning({ id: centralUser.id })

    if (recoveredPrincipal) {
      principalId = recoveredPrincipal.id
    }

    // If recovery did not find a verifiable account,
    // allow normal creation only when the email is unused.
    if (!principalId) {
      const [existingEmail] = await centralDb
        .select({ id: centralUser.id })
        .from(centralUser)
        .where(eq(centralUser.email, normalizedEmail))
        .limit(1)

      if (existingEmail) {
        throw new Error(
          "An existing account uses the principal email but cannot be safely recovered",
        )
      }

      // First registration reaches this point and creates the principal.
      const result = await auth.api.signUpEmail({
        body: {
          name: normalizedPrincipalName,
          email: normalizedEmail,
          password,
          schoolId,
          schoolRole: "principal",
        },
        headers: new Headers({
          "x-internal-registration-secret":
            process.env.INTERNAL_REGISTRATION_SECRET ?? "",
          "x-registration-operation-id": operation.id,
          "x-registration-lease-token": leaseToken,
        }),
      })

      principalId = result.user.id
    }
  }
}

    if (!principalId) {
      throw new Error("Principal account could not be created or recovered")
    }

    stage = "principal_profile_creation"
    await updateStage(operation.id, leaseToken, stage)
    await renewLease(operation.id, leaseToken, stage)
    await ensurePrincipalProfile(schoolId, principalId)

    stage = "relationship_verification"
    await updateStage(operation.id, leaseToken, stage)
    await renewLease(operation.id, leaseToken, stage)

    const [principal] = await centralDb
      .select()
      .from(centralUser)
      .where(eq(centralUser.id, principalId))
      .limit(1)

  if (
  !principal ||
  principal.email !== normalizedEmail ||
  principal.schoolId !== schoolId ||
  principal.schoolRole !== "principal" ||
  principal.provisioningStatus !== "provisioning" ||
  principal.provisioningOperationId !== operation.id ||
  principal.banned === true
) {
  throw new Error(
    "Principal account relationship could not be verified",
  )
}

    const linked = await centralDb
      .update(schoolRegistrationOperations)
      .set({
        adminUserId: principalId,
        updatedAt: new Date(),
      })
     .where(
  and(
    eq(schoolRegistrationOperations.id, operation.id),
    eq(schoolRegistrationOperations.leaseToken, leaseToken),
    eq(schoolRegistrationOperations.status, "provisioning"),
    sql`${schoolRegistrationOperations.leaseUntil} > ${Date.now()}`,
    or(
      isNull(schoolRegistrationOperations.adminUserId),
      eq(schoolRegistrationOperations.adminUserId, principalId),
    ),
  ),
)
      .returning({ id: schoolRegistrationOperations.id })

    if (linked.length !== 1) {
      throw new Error("Could not permanently link principal to registration")
    }

    stage = "activation"
    await updateStage(operation.id, leaseToken, stage)
    await renewLease(operation.id, leaseToken, stage)

    const activated = await centralDb
      .update(centralUser)
      .set({
        provisioningStatus: "active",
      })
      .where(
        and(
          eq(centralUser.id, principalId),
          eq(centralUser.schoolId, schoolId),
          eq(centralUser.schoolRole, "principal"),
          eq(centralUser.provisioningStatus, "provisioning"),
          eq(centralUser.provisioningOperationId, operation.id),
          or(
            eq(centralUser.banned, false),
            isNull(centralUser.banned),
          ),
        ),
      )
      .returning({ id: centralUser.id })

    if (activated.length !== 1) {
      const [currentPrincipal] = await centralDb
        .select()
        .from(centralUser)
        .where(eq(centralUser.id, principalId))
        .limit(1)

      if (
        !currentPrincipal ||
        currentPrincipal.provisioningStatus !== "active" ||
        currentPrincipal.banned === true ||
        currentPrincipal.schoolId !== schoolId ||
        currentPrincipal.provisioningOperationId !== operation.id
      ) {
        throw new Error("Principal activation could not be verified")
      }
    }

    stage = "completed"
    await updateStage(operation.id, leaseToken, stage)

    const now = new Date()

    const completed = await centralDb
      .update(schoolRegistrationOperations)
      .set({
        status: "completed",
        stage: "completed",
        failureStage: null,
        lastError: null,
        leaseUntil: null,
        leaseToken: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schoolRegistrationOperations.id, operation.id),
          eq(schoolRegistrationOperations.leaseToken, leaseToken),
          eq(schoolRegistrationOperations.status, "provisioning"),
          eq(schoolRegistrationOperations.schoolId, schoolId),
          eq(schoolRegistrationOperations.adminUserId, principalId),
          sql`${schoolRegistrationOperations.leaseUntil} > ${now.getTime()}`,
        ),
      )
      .returning({ id: schoolRegistrationOperations.id })

    if (completed.length !== 1) {
      throw new Error("Registration completion could not be confirmed")
    }

    let emailVerification = "not_requested"

    try {
      emailVerification = await requestAccountEmailVerification(
        normalizedEmail,
      )
    } catch (emailError) {
      console.error(
        "School registration completed, but email verification notification failed:",
        emailError,
      )
      emailVerification = "failed"
    }

    const [finalSchool] = await centralDb
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1)

    const [finalPrincipal] = await centralDb
      .select()
      .from(centralUser)
      .where(eq(centralUser.id, principalId))
      .limit(1)

    if (!finalSchool || !finalPrincipal) {
      throw new Error("Completed registration references could not be verified")
    }

    return NextResponse.json(
      {
        success: true,
        school: {
          id: finalSchool.id,
          name: finalSchool.name,
          slug: finalSchool.slug,
        },
        principal: {
          id: finalPrincipal.id,
          name: finalPrincipal.name,
          email: finalPrincipal.email,
        },
        emailVerification,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("School registration failed:", error)

    if (operationId && leaseToken) {
      await recordFailure(operationId, leaseToken, stage, error)
    }

    return NextResponse.json(
      { error: "School registration failed" },
      { status: 500 },
    )
  }
}