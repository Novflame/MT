import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";

import { generateInitialPassword } from "./initial-password.cjs";
import { auth } from "@/auth/auth";
import { centralDb } from "@/db/central";
import { accountAuditLog, user } from "@/db/centeral-schema";

export type ProvisionedSchoolRole =
  | "deputy"
  | "head_of_class"
  | "head_of_department"
  | "teacher"
  | "parent"
  | "student";

export type ProvisioningStage =
  | "account_creation"
  | "school_profile"
  | "relationship_creation"
  | "relationship_verification"
  | "activation"
  | "completed";

const LEASE_DURATION_MS = 5 * 60 * 1000;

const ALLOWED_TRANSITIONS: Record<ProvisioningStage, ProvisioningStage[]> = {
  account_creation: ["school_profile"],
  school_profile: ["relationship_creation"],
  relationship_creation: ["relationship_verification"],
  relationship_verification: ["activation"],
  activation: [],
  completed: [],
};

export class ProvisioningError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "DUPLICATE_ACCOUNT"
      | "PROVISIONING_IN_PROGRESS"
      | "RECOVERY_CONTEXT_MISMATCH"
      | "ACCOUNT_NOT_FOUND"
      | "ACCOUNT_NOT_PROVISIONING"
      | "LEASE_LOST"
      | "ACCOUNT_BANNED",
  ) {
    super(message);
    this.name = "ProvisioningError";
  }
}

type ProvisioningContext = {
  schoolId: number;
  schoolRole: ProvisionedSchoolRole;
  provisioningType: "staff" | "student" | "parent";
  provisioningReferenceId?: string | null;
};

type CreateProvisionedAccountInput = {
  name: string;
  email: string;
  phone?: string | null;
  provisioningMetadata?: Record<string, unknown> | null;
} & ProvisioningContext;

type LeaseContext = {
  userId: string;
  schoolId: number;
  leaseToken: string;
};

type ExistingProvisioningAccount = {
  id: string;
  schoolId: number;
  schoolRole: string;
  banned: boolean | null;
  provisioningStatus: string;
  provisioningType: string | null;
  provisioningReferenceId: string | null;
  provisioningMetadata: string | null;
  provisioningLeaseUntil: Date | null;
  provisioningLeaseToken: string | null;
  provisioningOperationId: string | null;
  provisioningStage: string | null;
  provisioningFailureStage: string | null;
};

function createLease() {
  return {
    leaseToken: randomUUID(),
    operationId: randomUUID(),
    leaseUntil: new Date(Date.now() + LEASE_DURATION_MS),
  };
}

function metadataToString(metadata?: Record<string, unknown> | string | null) {
  if (!metadata) return null;

  return typeof metadata === "string" ? metadata : JSON.stringify(metadata);
}

function referenceCondition(referenceId: string | null) {
  return referenceId === null
    ? isNull(user.provisioningReferenceId)
    : eq(user.provisioningReferenceId, referenceId);
}

/**
 * Detects an account created by Better Auth whose provisioning
 * initialization did not complete.
 *
 * Such an account can only be adopted if its provisioning state
 * is completely uninitialized.
 */
function isUninitializedProvisioningAccount(
  account: ExistingProvisioningAccount,
) {
  return (
    account.provisioningStatus === "provisioning" &&
    account.provisioningType === null &&
    account.provisioningReferenceId === null &&
    account.provisioningMetadata === null &&
    account.provisioningStage === null &&
    account.provisioningFailureStage === null &&
    account.provisioningLeaseToken === null &&
    account.provisioningLeaseUntil === null &&
    account.provisioningOperationId === null
  );
}

function assertContextMatches(
  existing: {
    schoolId: number;
    schoolRole: string;
    provisioningType: string | null;
    provisioningReferenceId: string | null;
  },
  input: ProvisioningContext,
) {
  const expectedReference = input.provisioningReferenceId ?? null;

  if (
    String(existing.schoolId) !== String(input.schoolId) ||
    existing.schoolRole !== input.schoolRole ||
    existing.provisioningType !== input.provisioningType ||
    existing.provisioningReferenceId !== expectedReference
  ) {
    throw new ProvisioningError(
      "The existing account does not match this provisioning request.",
      "RECOVERY_CONTEXT_MISMATCH",
    );
  }
}

function assertNotBanned(banned: boolean | null) {
  if (banned) {
    throw new ProvisioningError(
      "An administratively banned account cannot be provisioned.",
      "ACCOUNT_BANNED",
    );
  }
}
function notBannedCondition() {
  return or(eq(user.banned, false), isNull(user.banned));
}

/**
 * Create a new account or claim an eligible existing account.
 *
 * Recovery:
 * - Never creates another account.
 * - Never replaces the existing password.
 * - Never changes the account ID.
 * - Always acquires a new lease.
 * - Can recover an account left uninitialized by a crash.
 */
export async function createProvisionedAccount(
  input: CreateProvisionedAccountInput,
) {
  const registrationSecret = process.env.INTERNAL_REGISTRATION_SECRET;

  if (!registrationSecret) {
    throw new Error("INTERNAL_REGISTRATION_SECRET is not configured");
  }

  const email = input.email.trim().toLowerCase();
  const referenceId = input.provisioningReferenceId ?? null;

  const [existing] = await centralDb
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      schoolId: user.schoolId,
      schoolRole: user.schoolRole,
      banned: user.banned,
      provisioningStatus: user.provisioningStatus,
      provisioningType: user.provisioningType,
      provisioningReferenceId: user.provisioningReferenceId,
      provisioningMetadata: user.provisioningMetadata,
      provisioningLeaseUntil: user.provisioningLeaseUntil,
      provisioningLeaseToken: user.provisioningLeaseToken,
      provisioningOperationId: user.provisioningOperationId,
      provisioningStage: user.provisioningStage,
      provisioningFailureStage: user.provisioningFailureStage,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    if (existing.provisioningStatus === "active") {
      throw new ProvisioningError(
        "An active account already exists with this email.",
        "DUPLICATE_ACCOUNT",
      );
    }

    assertNotBanned(existing.banned);

    const uninitialized = isUninitializedProvisioningAccount(existing);

    if (!uninitialized) {
      assertContextMatches(existing, {
        schoolId: input.schoolId,
        schoolRole: input.schoolRole,
        provisioningType: input.provisioningType,
        provisioningReferenceId: referenceId,
      });
    } else if (
      String(existing.schoolId) !== String(input.schoolId) ||
      existing.schoolRole !== input.schoolRole
    ) {
      throw new ProvisioningError(
        "The uninitialized account does not match this school and role.",
        "RECOVERY_CONTEXT_MISMATCH",
      );
    }

    if (
      existing.provisioningStatus !== "failed" &&
      existing.provisioningStatus !== "provisioning"
    ) {
      throw new ProvisioningError(
        "This account is not eligible for provisioning recovery.",
        "ACCOUNT_NOT_PROVISIONING",
      );
    }

    const leaseExpired =
      !existing.provisioningLeaseUntil ||
      existing.provisioningLeaseUntil.getTime() <= Date.now();

    if (existing.provisioningStatus === "provisioning" && !leaseExpired) {
      throw new ProvisioningError(
        "This account is already being provisioned.",
        "PROVISIONING_IN_PROGRESS",
      );
    }

    const claim = await claimProvisioning({
      userId: existing.id,
      schoolId: input.schoolId,
      schoolRole: input.schoolRole,
      provisioningType: input.provisioningType,
      provisioningReferenceId: referenceId,
      provisioningMetadata: input.provisioningMetadata,
    });

    return {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      schoolId: input.schoolId,
      schoolRole: input.schoolRole,
      provisioningReferenceId: referenceId,
      provisioningMetadata: claim.metadata,
      initialPassword: null,
      leaseToken: claim.leaseToken,
      stage: claim.stage,
      reused: true,
    };
  }

  const initialPassword = generateInitialPassword();
  const lease = createLease();

  const result = await auth.api.signUpEmail({
    body: {
      name: input.name.trim(),
      email,
      password: initialPassword,
      schoolId: input.schoolId,
      schoolRole: input.schoolRole,
    },
    headers: new Headers({
      "x-internal-registration-secret": registrationSecret,
    }),
  });

  if (!result?.user?.id) {
    throw new Error("Better Auth did not return a created user");
  }

  /**
   * Better Auth creates the account with provisioningStatus
   * defaulting to "provisioning".
   *
   * This conditional UPDATE initializes the provisioning
   * context and acquires the first lease.
   *
   * If the process crashes before this UPDATE, the account
   * remains recoverable through the uninitialized-account path.
   */
  const updated = await centralDb
    .update(user)
    .set({
      phone: input.phone?.trim() || null,
      mustChangePassword: true,
      provisioningStatus: "provisioning",
      provisioningType: input.provisioningType,
      provisioningReferenceId: referenceId,
      provisioningMetadata: metadataToString(input.provisioningMetadata),
      provisioningStage: "account_creation",
      provisioningFailureStage: null,
      provisioningAttempts: sql`${user.provisioningAttempts} + 1`,
      provisioningLeaseUntil: lease.leaseUntil,
      provisioningOperationId: lease.operationId,
      provisioningLeaseToken: lease.leaseToken,
    })
    .where(
      and(
        eq(user.id, result.user.id),
        eq(user.schoolId, input.schoolId),
        eq(user.schoolRole, input.schoolRole),
        eq(user.provisioningStatus, "provisioning"),
        notBannedCondition(),
        isNull(user.provisioningLeaseToken),
        isNull(user.provisioningLeaseUntil),
        isNull(user.provisioningOperationId),
        isNull(user.provisioningType),
        isNull(user.provisioningStage),
      ),
    )
    .returning({ id: user.id });

  if (updated.length !== 1) {
    throw new ProvisioningError(
      "The new account could not acquire its provisioning lease. The account has not been activated.",
      "LEASE_LOST",
    );
  }

  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    schoolId: input.schoolId,
    schoolRole: input.schoolRole,
    provisioningReferenceId: referenceId,
    provisioningMetadata: metadataToString(input.provisioningMetadata),
    initialPassword,
    leaseToken: lease.leaseToken,
    stage: "account_creation" as ProvisioningStage,
    reused: false,
  };
}

/**
 * Atomically claim a failed or expired provisioning operation.
 *
 * The UPDATE verifies:
 * - Account identity.
 * - School and role.
 * - Provisioning type and reference.
 * - Eligible status.
 * - Expired lease or failed state.
 * - Absence of an administrative ban.
 *
 * An uninitialized Better Auth account can also be adopted,
 * but only when its provisioning fields are all empty.
 */
export async function claimProvisioning(
  input: {
    userId: string;
    provisioningMetadata?: Record<string, unknown> | null;
  } & ProvisioningContext,
) {
  const now = new Date();
  const lease = createLease();

  const [existing] = await centralDb
    .select({
      id: user.id,
      schoolId: user.schoolId,
      schoolRole: user.schoolRole,
      banned: user.banned,
      provisioningStatus: user.provisioningStatus,
      provisioningType: user.provisioningType,
      provisioningReferenceId: user.provisioningReferenceId,
      provisioningMetadata: user.provisioningMetadata,
      provisioningLeaseUntil: user.provisioningLeaseUntil,
      provisioningLeaseToken: user.provisioningLeaseToken,
      provisioningOperationId: user.provisioningOperationId,
      provisioningStage: user.provisioningStage,
      provisioningFailureStage: user.provisioningFailureStage,
    })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);

  if (!existing) {
    throw new ProvisioningError(
      "The account does not exist.",
      "ACCOUNT_NOT_FOUND",
    );
  }

  assertNotBanned(existing.banned);

  const uninitialized = isUninitializedProvisioningAccount(existing);

  if (uninitialized) {
    if (
      String(existing.schoolId) !== String(input.schoolId) ||
      existing.schoolRole !== input.schoolRole
    ) {
      throw new ProvisioningError(
        "The uninitialized account does not match this school and role.",
        "RECOVERY_CONTEXT_MISMATCH",
      );
    }
  } else {
    assertContextMatches(existing, input);
  }

  const claimableState = or(
    eq(user.provisioningStatus, "failed"),
    and(
      eq(user.provisioningStatus, "provisioning"),
      or(
        isNull(user.provisioningLeaseUntil),
        lte(user.provisioningLeaseUntil, now),
      ),
    ),
  );

  const contextCondition = uninitialized
    ? and(
        isNull(user.provisioningType),
        isNull(user.provisioningReferenceId),
        isNull(user.provisioningMetadata),
        isNull(user.provisioningStage),
        isNull(user.provisioningFailureStage),
        isNull(user.provisioningLeaseToken),
        isNull(user.provisioningLeaseUntil),
        isNull(user.provisioningOperationId),
      )
    : and(
        eq(user.provisioningType, input.provisioningType),
        referenceCondition(input.provisioningReferenceId ?? null),
      );

  const claimed = await centralDb
    .update(user)
    .set({
      provisioningStatus: "provisioning",
      provisioningType: input.provisioningType,
      provisioningReferenceId: input.provisioningReferenceId ?? null,
      provisioningMetadata: uninitialized
        ? metadataToString(input.provisioningMetadata)
        : existing.provisioningMetadata,
      provisioningStage: existing.provisioningStage ?? "account_creation",
      provisioningLeaseToken: lease.leaseToken,
      provisioningOperationId: lease.operationId,
      provisioningLeaseUntil: lease.leaseUntil,
      provisioningAttempts: sql`${user.provisioningAttempts} + 1`,
      provisioningFailureStage: null,
    })
    .where(
      and(
        eq(user.id, input.userId),
        eq(user.schoolId, input.schoolId),
        eq(user.schoolRole, input.schoolRole),
        notBannedCondition(),
        claimableState,
        contextCondition,
      ),
    )
    .returning({
      id: user.id,
      provisioningStage: user.provisioningStage,
      provisioningMetadata: user.provisioningMetadata,
    });

  if (claimed.length !== 1) {
    throw new ProvisioningError(
      "Another request owns this provisioning operation, or its lease is still valid.",
      "PROVISIONING_IN_PROGRESS",
    );
  }

  return {
    userId: input.userId,
    leaseToken: lease.leaseToken,
    stage: (claimed[0].provisioningStage ??
      "account_creation") as ProvisioningStage,
    metadata: claimed[0].provisioningMetadata,
    leaseUntil: lease.leaseUntil,
  };
}

/**
 * Advance exactly one permitted provisioning stage.
 *
 * Ownership and lease validity are verified in the same UPDATE.
 */
export async function advanceProvisioningStage(
  input: LeaseContext & {
    expectedStage: ProvisioningStage;
    nextStage: ProvisioningStage;
  },
) {
  const allowed = ALLOWED_TRANSITIONS[input.expectedStage];

  if (!allowed.includes(input.nextStage)) {
    throw new ProvisioningError(
      `Invalid provisioning transition: ${input.expectedStage} -> ${input.nextStage}.`,
      "ACCOUNT_NOT_PROVISIONING",
    );
  }

  const now = new Date();
  const nextLeaseUntil = new Date(Date.now() + LEASE_DURATION_MS);

  const updated = await centralDb
    .update(user)
    .set({
      provisioningStage: input.nextStage,
      provisioningLeaseUntil: nextLeaseUntil,
    })
    .where(
      and(
        eq(user.id, input.userId),
        eq(user.schoolId, input.schoolId),
        eq(user.provisioningStatus, "provisioning"),
        eq(user.provisioningStage, input.expectedStage),
        eq(user.provisioningLeaseToken, input.leaseToken),
        gt(user.provisioningLeaseUntil, now),
        notBannedCondition(),
      ),
    )
    .returning({ id: user.id });

  if (updated.length !== 1) {
    throw new ProvisioningError(
      "The provisioning lease is expired or no longer belongs to this request.",
      "LEASE_LOST",
    );
  }

  return {
    stage: input.nextStage,
    leaseUntil: nextLeaseUntil,
  };
}

/**
 * Mark an operation as failed only while its lease is valid
 * and the caller still owns it.
 */
export async function markProvisioningFailed(
  input: LeaseContext & {
    failureStage: ProvisioningStage;
  },
) {
  if (input.failureStage === "completed") {
    throw new ProvisioningError(
      "A completed provisioning operation cannot be marked as failed.",
      "ACCOUNT_NOT_PROVISIONING",
    );
  }

  const now = new Date();

  const updated = await centralDb
    .update(user)
    .set({
      provisioningStatus: "failed",
      provisioningFailureStage: input.failureStage,
      provisioningLeaseUntil: null,
      provisioningLeaseToken: null,
      provisioningOperationId: null,
    })
    .where(
      and(
        eq(user.id, input.userId),
        eq(user.schoolId, input.schoolId),
        eq(user.provisioningStatus, "provisioning"),
        eq(user.provisioningLeaseToken, input.leaseToken),
        gt(user.provisioningLeaseUntil, now),
      ),
    )
    .returning({ id: user.id });

  if (updated.length !== 1) {
    throw new ProvisioningError(
      "The operation can no longer mark this account as failed because its lease is no longer valid.",
      "LEASE_LOST",
    );
  }
}

/**
 * Activate an account only after the route has independently
 * verified its school profile and permanent relationship.
 *
 * The final UPDATE atomically checks:
 * - Account and school identity.
 * - Provisioning status.
 * - Activation stage.
 * - Lease ownership.
 * - Lease validity.
 * - Administrative ban status.
 *
 * This function never changes the banned field.
 */
export async function markProvisioningActive(
  input: LeaseContext & {
    schoolProfileVerified: true;
    relationshipVerified: true;
  },
) {
  const now = new Date();

  if (
    input.schoolProfileVerified !== true ||
    input.relationshipVerified !== true
  ) {
    throw new ProvisioningError(
      "The school profile and permanent relationship must both be verified before activation.",
      "ACCOUNT_NOT_PROVISIONING",
    );
  }

  const [account] = await centralDb
    .select({
      banned: user.banned,
    })
    .from(user)
    .where(and(eq(user.id, input.userId), eq(user.schoolId, input.schoolId)))
    .limit(1);

  if (!account) {
    throw new ProvisioningError(
      "The account does not exist.",
      "ACCOUNT_NOT_FOUND",
    );
  }

  assertNotBanned(account.banned);

  const updated = await centralDb
    .update(user)
    .set({
      provisioningStatus: "active",
      provisioningStage: "completed",
      provisioningFailureStage: null,
      provisioningType: null,
      provisioningReferenceId: null,
      provisioningMetadata: null,
      provisioningLeaseUntil: null,
      provisioningLeaseToken: null,
      provisioningOperationId: null,
    })
    .where(
      and(
        eq(user.id, input.userId),
        eq(user.schoolId, input.schoolId),
        eq(user.provisioningStatus, "provisioning"),
        eq(user.provisioningStage, "activation"),
        eq(user.provisioningLeaseToken, input.leaseToken),
        gt(user.provisioningLeaseUntil, now),
        notBannedCondition(),
      ),
    )
    .returning({ id: user.id });

  if (updated.length !== 1) {
    throw new ProvisioningError(
      "Activation rejected: the account state, administrative status, or provisioning lease changed.",
      "LEASE_LOST",
    );
  }
}

/**
 * Email delivery is a notification step, not part of provisioning.
 */
export async function requestAccountEmailVerification(
  email: string,
): Promise<"sent" | "not_configured" | "failed"> {
  if (!process.env.BETTER_AUTH_URL) {
    return "not_configured";
  }

  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: email.trim().toLowerCase(),
      },
    });

    return "sent";
  } catch (error) {
    console.error("Account verification email failed:", error);

    return "failed";
  }
}

export async function auditAccountAction(input: {
  schoolId: number;
  actorUserId: string;
  targetUserId?: string | null;
  action: string;
}) {
  await centralDb.insert(accountAuditLog).values({
    id: randomUUID(),
    schoolId: input.schoolId,
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId ?? null,
    action: input.action,
  });
}
