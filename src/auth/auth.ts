import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { centralDb } from "@/db/central"
import * as schema from "@/db/centeral-schema"
import { createAuthMiddleware } from "better-auth/api"
export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(centralDb, {
        provider: "sqlite",
        schema,
    }),
   

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
    },
},
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== "/sign-up/email") {
                return
            }
const secret = ctx.headers?.get(
    "x-internal-registration-secret",
)


if (
    !secret ||
    secret !== process.env.INTERNAL_REGISTRATION_SECRET
) {
    throw new Error("Unauthorized registration request")
}
//            const secret = ctx.headers?.get(
//     "x-internal-registration-secret",
// )

// if (
//     !secret ||
//     secret !== process.env.INTERNAL_REGISTRATION_SECRET
// ) {
//     throw new Error("Unauthorized registration request")
// }
        }),
    },

    session: {
        expiresIn: 60 * 60 * 24 * 7,

        updateAge: 60 * 60 * 24,
    },

    emailAndPassword: {
        enabled: true,

        autoSignIn: false,
    },

    baseURL: process.env.BETTER_AUTH_URL,
})
