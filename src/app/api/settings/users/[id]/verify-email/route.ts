import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { requirePermission } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { auditAccountAction, requestAccountEmailVerification } from "@/auth/account-provisioning"
import { isEmailDeliveryConfigured } from "@/lib/email"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("users.update")
    const { id } = await context.params
    const [actor] = await centralDb.select({ schoolId: user.schoolId, schoolRole: user.schoolRole })
      .from(user).where(eq(user.id, session.user.id)).limit(1)
    if (!actor) return NextResponse.json({ error: "Account not found" }, { status: 403 })
    const [target] = await centralDb.select({ id: user.id, email: user.email, schoolRole: user.schoolRole, schoolId: user.schoolId, emailVerified: user.emailVerified, banned: user.banned, provisioningStatus: user.provisioningStatus })
      .from(user).where(and(eq(user.id, id), eq(user.schoolId, actor.schoolId))).limit(1)
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (actor.schoolRole === "deputy" && ["principal", "deputy"].includes(target.schoolRole)) return NextResponse.json({ error: "You are not allowed to manage this account" }, { status: 403 })
    if (target.emailVerified) return NextResponse.json({ error: "This email address is already verified" }, { status: 409 })
    if (target.banned || target.provisioningStatus !== "active") return NextResponse.json({ error: "Account is disabled or incompletely provisioned" }, { status: 409 })
    if (!isEmailDeliveryConfigured()) return NextResponse.json({ error: "Email verification is not configured. Set BETTER_AUTH_URL, RESEND_API_KEY and EMAIL_FROM." }, { status: 503 })

    const result = await requestAccountEmailVerification(target.email)
    if (result !== "sent") return NextResponse.json({ error: "Email provider did not confirm that a verification request was accepted" }, { status: 503 })
    await auditAccountAction({ schoolId: actor.schoolId, actorUserId: session.user.id, targetUserId: target.id, action: "email_verification_requested" })
    return NextResponse.json({ success: true, message: "Verification request accepted by the configured email provider." })
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    console.error("Email verification request failed", { errorType: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "Could not request email verification" }, { status: 503 })
  }
}
