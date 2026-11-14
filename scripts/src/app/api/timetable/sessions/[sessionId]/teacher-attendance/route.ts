import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { getSchoolDB } from "@/db"
import { classSessions, sessionTeacherAttendance, classSessionAuditLogs } from "@/db/schema"
import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"
import { assertTimetableEnabled, canAccessTimetableClass, schoolLocalDateTimeToDate } from "@/lib/timetable/access"

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
    try {
        const session = await requireApiPermission(request, "sessions.attendance")
        await assertTimetableEnabled(session.user.id)
        const { sessionId } = await context.params
        const { action, note } = await request.json()
        if (!["check_in", "check_out"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        const db = await getSchoolDB()
        const [item] = await db.select().from(classSessions).where(eq(classSessions.id, sessionId)).limit(1)
        if (!item) return NextResponse.json({ error: "Session not found" }, { status: 404 })
        const role = session.user.schoolRole as import("@/auth/permissions").Role
        const isAssigned = await canAccessTimetableClass({ id: session.user.id, role }, item.classId, item.academicYearId, item.subjectId)
        const isSchoolAdmin = role === "principal" || role === "deputy"
        if (!isAssigned || (!isSchoolAdmin && (role !== "teacher" || item.actualTeacherId !== session.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        if (item.status === "cancelled" || item.status === "completed") return NextResponse.json({ error: "Session is not open" }, { status: 409 })
        const now = new Date()
        const nowIso = now.toISOString()
        const [existing] = await db.select().from(sessionTeacherAttendance).where(eq(sessionTeacherAttendance.sessionId, sessionId)).limit(1)
        if (action === "check_in") {
            if (existing?.checkedInAt) return NextResponse.json({ error: "Already checked in" }, { status: 409 })
            const scheduled = schoolLocalDateTimeToDate(item.sessionDate, item.startTime)
            const lateMinutes = Math.max(0, Math.floor((now.getTime() - scheduled.getTime()) / 60000))
            const values = { teacherId: item.actualTeacherId, checkedInAt: nowIso, status: lateMinutes > 0 ? "late" : "present", lateMinutes, note: typeof note === "string" ? note.slice(0, 500) : null, updatedAt: nowIso }
            if (existing) await db.update(sessionTeacherAttendance).set(values).where(eq(sessionTeacherAttendance.sessionId, sessionId))
            else await db.insert(sessionTeacherAttendance).values({ id: randomUUID(), sessionId, ...values })
            await db.update(classSessions).set({ status: "in_progress", updatedAt: nowIso }).where(eq(classSessions.id, sessionId))
        } else {
            if (!existing?.checkedInAt || existing.checkedOutAt) return NextResponse.json({ error: "Check-in is required before check-out" }, { status: 409 })
            await db.update(sessionTeacherAttendance).set({ checkedOutAt: nowIso, updatedAt: nowIso }).where(eq(sessionTeacherAttendance.sessionId, sessionId))
            await db.update(classSessions).set({ status: "completed", updatedAt: nowIso }).where(eq(classSessions.id, sessionId))
        }
        await db.insert(classSessionAuditLogs).values({ id: randomUUID(), sessionId, actorUserId: session.user.id, action, details: null, createdAt: nowIso })
        return NextResponse.json({ success: true })
    } catch (error) { const message = error instanceof Error ? error.message : "Request failed"; return NextResponse.json({ error: message }, { status: error instanceof ApiAuthorizationError ? error.status : message === "TIMETABLE_DISABLED" ? 403 : 400 }) }
}
