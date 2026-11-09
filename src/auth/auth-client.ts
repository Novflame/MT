"use client"

import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"

import type { auth } from "./auth"

export const authClient = createAuthClient({
    baseURL: typeof window !== "undefined"
        ? window.location.origin
        : undefined,

    plugins: [
        inferAdditionalFields<typeof auth>(),
    ],
})