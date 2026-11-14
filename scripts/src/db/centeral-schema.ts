import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
export const schools = sqliteTable("schools", {
  id: integer("id").primaryKey({
    autoIncrement: true,
  }),

  name: text("name").notNull(),

  slug: text("slug").notNull().unique(),

  logo: text("logo"),

  address: text("address"),

  createdAt: integer("created_at", {
    mode: "timestamp_ms",
  })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});
// Per-school optional feature configuration. Missing rows mean disabled.
export const schoolFeatureFlags = sqliteTable("school_feature_flags", {
  schoolId: integer("school_id")
    .primaryKey()
    .references(() => schools.id, { onDelete: "cascade" }),
  timetableEnabled: integer("timetable_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  timetableAttendanceGraceMinutes: integer("timetable_attendance_grace_minutes")
    .notNull()
    .default(10),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
});

//USERS ==========>
export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),

    name: text("name").notNull(),

    email: text("email").notNull().unique(),

    emailVerified: integer("email_verified", {
      mode: "boolean",
    })
      .default(false)
      .notNull(),
    image: text("image"),

    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, {
        onDelete: "cascade",
      }),
   twoFactorEnabled: integer("two_factor_enabled", {
    mode: "boolean",
})
    .notNull()
    .default(false),

    schoolRole: text("school_role").notNull().default("principal"),

    phone: text("phone"),

    whatsapp: text("whatsapp"),

    bio: text("bio"),

    website: text("website"),

    banned: integer("banned", {
      mode: "boolean",
    }).default(false),

    // Provisioned accounts must replace their one-time initial password before use.
    mustChangePassword: integer("must_change_password", {
      mode: "boolean",
    })
      .default(false)
      .notNull(),

    // Active accounts are fully linked to their school profile. Failed provisioning is retained for repair.
   provisioningStatus: text("provisioning_status")
  .$type<"active" | "provisioning" | "failed">()
  .default("provisioning")
  .notNull(),
    provisioningType: text("provisioning_type").$type<
      "staff" | "student" | "parent" | null
    >(),
    provisioningReferenceId: text("provisioning_reference_id"),
    provisioningMetadata: text("provisioning_metadata"),
    provisioningStage: text("provisioning_stage").$type<
      | "account_creation"
      | "school_profile"
      | "relationship_creation"
      | "relationship_verification"
      | "activation"
      | "completed"
    >(),

    provisioningFailureStage: text("provisioning_failure_stage"),

    provisioningAttempts: integer("provisioning_attempts").notNull().default(0),

    provisioningLeaseUntil: integer("provisioning_lease_until", {
      mode: "timestamp_ms",
    }),

    provisioningOperationId: text("provisioning_operation_id"),

    provisioningLeaseToken: text("provisioning_lease_token"),
    banReason: text("ban_reason"),

    banExpires: integer("ban_expires", {
      mode: "timestamp_ms",
    }),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_provisioning_operation_id_unique")
      .on(table.provisioningOperationId)
      .where(sql`${table.provisioningOperationId} IS NOT NULL`),

    index("user_provisioning_status_idx")
      .on(table.provisioningStatus),

    index("user_provisioning_recovery_idx").on(
      table.provisioningStatus,
      table.provisioningLeaseUntil,
    ),
  ],
);
export const twoFactor = sqliteTable(
    "twoFactor",
    {
        id: text("id").primaryKey(),

        userId: text("user_id")
            .notNull()
            .references(() => user.id, {
                onDelete: "cascade",
            }),

        secret: text("secret").notNull(),

        backupCodes: text("backup_codes").notNull(),

        verified: integer("verified", {
            mode: "boolean",
        })
            .notNull()
            .default(false),

        failedVerificationCount: integer(
            "failed_verification_count",
        )
            .notNull()
            .default(0),

        lockedUntil: integer("locked_until"),
    },
    (table) => [
        uniqueIndex("two_factor_user_id_unique").on(table.userId),
    ],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),

    expiresAt: integer("expires_at", {
      mode: "timestamp_ms",
    }).notNull(),

    token: text("token").notNull().unique(),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .$onUpdate(() => new Date())
      .notNull(),

    ipAddress: text("ip_address"),

    userAgent: text("user_agent"),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),

    accountId: text("account_id").notNull(),

    providerId: text("provider_id").notNull(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    accessToken: text("access_token"),

    refreshToken: text("refresh_token"),

    idToken: text("id_token"),

    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),

    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),

    scope: text("scope"),

    password: text("password"),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),

    identifier: text("identifier").notNull(),

    value: text("value").notNull(),

    expiresAt: integer("expires_at", {
      mode: "timestamp_ms",
    }).notNull(),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const accountAuditLog = sqliteTable(
  "account_audit_log",
  {
    id: text("id").primaryKey(),
    schoolId: integer("school_id").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    targetUserId: text("target_user_id"),
    action: text("action").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("account_audit_school_created_idx").on(
      table.schoolId,
      table.createdAt,
    ),
    index("account_audit_target_idx").on(table.targetUserId),
  ],
);
export const schoolRegistrationOperations = sqliteTable(
  "school_registration_operations",
  {
    id: text("id").primaryKey(),

    schoolId: integer("school_id").references(() => schools.id, {
      onDelete: "restrict",
    }),

    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),

    schoolSlug: text("school_slug").notNull().unique(),

    adminEmail: text("admin_email").notNull(),

    status: text("status")
      .$type<"pending" | "provisioning" | "failed" | "completed">()
      .notNull()
      .default("pending"),

    stage: text("stage"),

    failureStage: text("failure_stage"),

    attempts: integer("attempts").notNull().default(0),

    leaseUntil: integer("lease_until", {
      mode: "timestamp_ms",
    }),

    leaseToken: text("lease_token"),

    metadata: text("metadata"),

    lastError: text("last_error"),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("school_registration_admin_user_unique")
      .on(table.adminUserId)
      .where(sql`${table.adminUserId} IS NOT NULL`),

    index("school_registration_recovery_idx").on(
      table.status,
      table.leaseUntil,
    ),

    check(
      "school_registration_status_check",
      sql`${table.status} IN ('pending', 'provisioning', 'failed', 'completed')`,
    ),

    check(
      "school_registration_attempts_check",
      sql`${table.attempts} >= 0`,
    ),

    check(
      "school_registration_lease_pair_check",
      sql`(
        (${table.leaseUntil} IS NULL AND ${table.leaseToken} IS NULL)
        OR
        (${table.leaseUntil} IS NOT NULL AND ${table.leaseToken} IS NOT NULL)
      )`,
    ),

    check(
      "school_registration_completed_check",
      sql`${table.status} <> 'completed'
        OR (${table.schoolId} IS NOT NULL AND ${table.adminUserId} IS NOT NULL)`,
    ),
  ],
);
export const userRelations = relations(user, ({ many, one }) => ({
  school: one(schools, {
    fields: [user.schoolId],
    references: [schools.id],
  }),

  sessions: many(session),

  accounts: many(account),
}));

export const schoolRelations = relations(schools, ({ many }) => ({
  users: many(user),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
