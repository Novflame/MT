import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { isEmailDeliveryConfigured, sendTransactionalEmail } from "@/lib/email";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { centralDb } from "@/db/central";
import * as schema from "@/db/centeral-schema";
import { createAuthMiddleware, APIError } from "better-auth/api";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(centralDb, {
    provider: "sqlite",
    schema,
  }),
  rateLimit: { customRules: { "/sign-in/email": { window: 10, max: 10 } } },

  user: {
    additionalFields: {
      schoolId: {
        type: "number",
        required: true,
        input: true,
      },

      schoolRole: {
        type: "string",
        required: true,
        input: true,
      },
      mustChangePassword: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
      provisioningStatus: {
        type: "string",
        required: true,
        defaultValue: "provisioning",
        input: false,
      },
      provisioningOperationId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const configuredSecret = process.env.INTERNAL_REGISTRATION_SECRET;
        const suppliedSecret = ctx.headers?.get(
          "x-internal-registration-secret",
        );
        if (
          !configuredSecret ||
          !suppliedSecret ||
          suppliedSecret !== configuredSecret
        ) {
          throw new APIError("FORBIDDEN", {
            message: "Internal registration is not authorized",
          });
        }
        return;
      }

      if (ctx.path === "/sign-in/email") {
        const requestBody = ctx.body as { email?: unknown } | undefined;
        const email =
          typeof requestBody?.email === "string"
            ? requestBody.email.trim().toLowerCase()
            : "";
        if (!email) return;
        const [account] = await centralDb
          .select({
            banned: schema.user.banned,
            banExpires: schema.user.banExpires,
            provisioningStatus: schema.user.provisioningStatus,
          })
          .from(schema.user)
          .where(eq(schema.user.email, email))
          .limit(1);
        const banIsActive =
          Boolean(account?.banned) &&
          (!account?.banExpires || account.banExpires.getTime() > Date.now());
        if (
          account &&
          (banIsActive || account.provisioningStatus !== "active")
        ) {
          throw new APIError("UNAUTHORIZED", {
            message: "This account is disabled or its setup is incomplete",
          });
        }
      }
    }),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,

    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser, endpointContext) => {
          // Principal accounts must belong to a registration operation.
          if (newUser.schoolRole !== "principal") {
            return;
          }

          const headers = (
            endpointContext as unknown as {
              headers?: Headers;
            } | null
          )?.headers;

          const operationId = headers?.get("x-registration-operation-id");

          const leaseToken = headers?.get("x-registration-lease-token");

          const suppliedSecret = headers?.get("x-internal-registration-secret");

          const configuredSecret = process.env.INTERNAL_REGISTRATION_SECRET;

          if (
            !headers ||
            !operationId ||
            !leaseToken ||
            !configuredSecret ||
            suppliedSecret !== configuredSecret
          ) {
            throw new APIError("FORBIDDEN", {
              message: "Invalid school registration context",
            });
          }

          const [operation] = await centralDb
            .select()
            .from(schema.schoolRegistrationOperations)
            .where(eq(schema.schoolRegistrationOperations.id, operationId))
            .limit(1);

          const now = Date.now();

          if (
            !operation ||
            operation.status !== "provisioning" ||
            operation.stage !== "principal_account_creation" ||
            operation.leaseToken !== leaseToken ||
            !operation.leaseUntil ||
            operation.leaseUntil.getTime() <= now ||
            operation.adminUserId !== null ||
            !operation.schoolId ||
            operation.schoolId !== newUser.schoolId ||
            operation.adminEmail !==
              String(newUser.email ?? "")
                .trim()
                .toLowerCase()
          ) {
            throw new APIError("FORBIDDEN", {
              message: "School registration operation is invalid or expired",
            });
          }

          return {
            data: {
              provisioningOperationId: operation.id,
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: isEmailDeliveryConfigured(),
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your school account password",
        text: `Use this one-time link to reset your password: ${url}\nIf you did not request this, ignore this message.`,
      });
    },
    onPasswordReset: async ({ user }) => {
      await centralDb
        .update(schema.user)
        .set({ mustChangePassword: false })
        .where(eq(schema.user.id, user.id));
    },
  },

  ...(isEmailDeliveryConfigured()
    ? {
        emailVerification: {
          expiresIn: 60 * 60,
          sendOnSignIn: true,
          autoSignInAfterVerification: false,
          sendVerificationEmail: async ({ user, url }) => {
            await sendTransactionalEmail({
              to: user.email,
              subject: "Verify your school account email",
              text: `Verify your email address using this link: ${url}`,
            });
          },
        },
      }
    : {}),

  baseURL: process.env.BETTER_AUTH_URL,
});
