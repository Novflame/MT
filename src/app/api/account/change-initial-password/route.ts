import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { auditAccountAction } from "@/auth/account-provisioning"

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [account] = await centralDb.select({
      schoolId: user.schoolId,
      mustChangePassword: user.mustChangePassword,
      banned: user.banned,
      provisioningStatus: user.provisioningStatus,
    }).from(user).where(eq(user.id, session.user.id)).limit(1)
    if (!account || account.banned || account.provisioningStatus !== "active") {
      return NextResponse.json({ error: "Account is unavailable" }, { status: 403 })
    }
    if (!account.mustChangePassword) return NextResponse.json({ error: "Initial password change is not required" }, { status: 409 })

    const body = await request.json() as Record<string, unknown>
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : ""
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""
    if (!currentPassword || newPassword.length < 12 || newPassword === currentPassword) {
      return NextResponse.json({ error: "Enter the current password and a different new password of at least 12 characters" }, { status: 400 })
    }

    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: request.headers,
    })

    // This is only updated after Better Auth confirms that password verification and replacement succeeded.
    const updated = await centralDb.update(user).set({ mustChangePassword: false })
      .where(eq(user.id, session.user.id)).returning({ id: user.id })
    if (!updated.length) return NextResponse.json({ error: "Password changed but account state could not be updated; contact the administrator" }, { status: 500 })

    await auditAccountAction({ schoolId: account.schoolId, actorUserId: session.user.id, targetUserId: session.user.id, action: "initial_password_changed" })
    return NextResponse.json({ success: true })
  } catch (error) {
    // Never log passwords or the request body.
    console.error("Initial password change failed", { errorType: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "Password change failed. Verify the current password and try again." }, { status: 400 })
  }
}
