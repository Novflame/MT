import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { getSchoolDB } from "@/db"
import { notifications } from "@/db/schema"
import { requireSession } from "@/auth/session"

export async function GET() {
    try { const session = await requireSession(); const db = await getSchoolDB(); return NextResponse.json(await db.query.notifications.findMany({ where: eq(notifications.recipientUserId, session.user.id), orderBy: (n, { desc }) => desc(n.createdAt) })) }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to get notifications" }, { status: 500 }) }
}

export async function PATCH(request: Request) {
    try { const session = await requireSession(); const body = await request.json(); const db = await getSchoolDB(); const id = String(body.id ?? ""); if (!id) return NextResponse.json({ error: "Notification id is required" }, { status: 400 }); await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.recipientUserId, session.user.id))); return NextResponse.json({ success: true }) }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update notification" }, { status: 500 }) }
}
