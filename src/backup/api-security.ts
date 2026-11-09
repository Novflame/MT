import { NextResponse } from "next/server"

import { getRequestSession } from "@/auth/session"
import { hasPermission, type Permission, type Role } from "@/auth/permissions"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { and, eq } from "drizzle-orm"

export type BackupAccess = {
  userId: string
  schoolId: string
  role: Role
}

export type BackupAccessResult =
  | { ok: true; access: BackupAccess }
  | { ok: false; response: NextResponse }

export async function requireBackupAccess(
  request: Request,
  permission: Permission,
): Promise<BackupAccessResult> {
  try {
    const session = await getRequestSession(request.headers)

    if (!session?.user?.id) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        ),
      }
    }

    const [account] = await centralDb
      .select({
        schoolId: user.schoolId,
        schoolRole: user.schoolRole,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)

    if (
      !account?.schoolId ||
      String(session.user.schoolId ?? "") !== String(account.schoolId)
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "School access denied" },
          { status: 403 },
        ),
      }
    }

    const role = account.schoolRole as Role

    if (!hasPermission(role, permission)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 },
        ),
      }
    }

    return {
      ok: true,
      access: {
        userId: session.user.id,
        schoolId: String(account.schoolId),
        role,
      },
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unable to authorize backup request" },
        { status: 500 },
      ),
    }
  }
}

export function backupError(
  error: unknown,
  fallback = "Backup operation failed",
) {
  const message =
    error instanceof Error ? error.message : fallback

  return NextResponse.json(
    { error: message },
    { status: 500 },
  )
}