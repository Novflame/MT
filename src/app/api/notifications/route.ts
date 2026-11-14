import { NextResponse } from "next/server"
import { and, count, desc, eq } from "drizzle-orm"
import { getSchoolDB } from "@/db"
import { notifications } from "@/db/schema"
import { requireSession } from "@/auth/session"

export async function GET(request: Request) {
  const session = await requireSession()
  const db = await getSchoolDB()
  if (new URL(request.url).searchParams.get("unreadCount") === "1") {
    const [result] = await db.select({ value: count() }).from(notifications).where(
      and(eq(notifications.recipientUserId, session.user.id), eq(notifications.isRead, false)),
    )
    return NextResponse.json({ count: result?.value ?? 0 }, { headers: { "Cache-Control": "no-store" } })
  }
  const rows = await db.query.notifications.findMany({
    where: eq(notifications.recipientUserId, session.user.id),
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: 100,
  })
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: Request) {
  const session = await requireSession()
  let body: { id?: unknown; markAll?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  const db = await getSchoolDB()
  if (body.markAll === true) {
    await db.update(notifications).set({ isRead: true }).where(
      and(eq(notifications.recipientUserId, session.user.id), eq(notifications.isRead, false)),
    )
    return NextResponse.json({ success: true })
  }

  const id = typeof body.id === "string" ? body.id.trim() : ""
  if (!id) return NextResponse.json({ error: "Notification id is required" }, { status: 400 })
  const updated = await db.update(notifications).set({ isRead: true }).where(
    and(eq(notifications.id, id), eq(notifications.recipientUserId, session.user.id)),
  ).returning({ id: notifications.id })
  if (updated.length === 0) return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
