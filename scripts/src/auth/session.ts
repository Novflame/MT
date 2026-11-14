import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { auth } from "./auth"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { hasPermission, type Permission, type Role } from "./permissions"

export async function getAccountState(userId: string) {
  const [account] = await centralDb.select({
    schoolId: user.schoolId,
    schoolRole: user.schoolRole,
    banned: user.banned,
    banExpires: user.banExpires,
    mustChangePassword: user.mustChangePassword,
    provisioningStatus: user.provisioningStatus,
  }).from(user).where(eq(user.id, userId)).limit(1)

  if (!account) return null
  const banIsActive = Boolean(account.banned) && (!account.banExpires || account.banExpires.getTime() > Date.now())
  if (banIsActive || account.provisioningStatus !== "active") return null
  return account
}

/**
 * Request-session guard for API handlers. Returning null means the request must not
 * access application data. The initial-password-change endpoint intentionally uses
 * auth.api.getSession directly and validates the session separately.
 */
export async function getRequestSession(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session?.user) return null
  const state = await getAccountState(session.user.id)
  if (!state || state.mustChangePassword) return null
  return session
}

export async function getCurrentSession() {
  const requestHeaders = await headers()
  return getRequestSession(requestHeaders)
}

export async function requireSession(options: { allowInitialPasswordChange?: boolean } = {}) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session?.user) redirect("/login")

  const [account] = await centralDb.select({
    banned: user.banned,
    banExpires: user.banExpires,
    mustChangePassword: user.mustChangePassword,
    provisioningStatus: user.provisioningStatus,
  }).from(user).where(eq(user.id, session.user.id)).limit(1)

  const banIsActive = Boolean(account?.banned) && (!account?.banExpires || account.banExpires.getTime() > Date.now())
  if (!account || banIsActive || account.provisioningStatus !== "active") redirect("/login?error=account-unavailable")
  if (account.mustChangePassword && !options.allowInitialPasswordChange) redirect("/change-password")
  return session
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession()
  const [current] = await centralDb.select({ schoolRole: user.schoolRole }).from(user)
    .where(and(eq(user.id, session.user.id), eq(user.schoolId, session.user.schoolId)))
    .limit(1)
  if (!current || !hasPermission(current.schoolRole as Role, permission)) {
    throw new Error("Forbidden")
  }
  return session
}
