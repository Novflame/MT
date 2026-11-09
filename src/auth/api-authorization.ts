import { eq } from "drizzle-orm"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getRequestSession } from "@/auth/session"
import { hasPermission, type Permission, type Role } from "@/auth/permissions"

export class ApiAuthorizationError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message)
    this.name = "ApiAuthorizationError"
  }
}

/** API-only authorization helper: no redirects and no stale session role trust. */
export async function requireApiPermission(request: Request, permission: Permission) {
  const session = await getRequestSession(request.headers)
  if (!session?.user) throw new ApiAuthorizationError(401, "Unauthorized or password change required")

  const [current] = await centralDb.select({ schoolRole: user.schoolRole, schoolId: user.schoolId })
    .from(user).where(eq(user.id, session.user.id)).limit(1)
  if (!current || String(current.schoolId) !== String(session.user.schoolId)) {
    throw new ApiAuthorizationError(401, "Invalid account context")
  }
  if (!hasPermission(current.schoolRole as Role, permission)) throw new ApiAuthorizationError(403, "Forbidden")
  return {
    ...session,
    user: {
      ...session.user,
      schoolId: current.schoolId,
      schoolRole: current.schoolRole,
    },
  }
}
