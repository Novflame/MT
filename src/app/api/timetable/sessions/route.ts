import { NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { getSchoolDB } from "@/db"
import { academicYears, classSessions, classTimetableSlots, classSessionAuditLogs, studentEnrollments, students, classTimetables, sessionStudentAttendance, sessionTeacherAttendance } from "@/db/schema"
import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"
import { assertTimetableEnabled, canAccessTimetableClass, dateWeekday } from "@/lib/timetable/access"

function errorResponse(error: unknown) {
    const message = error instanceof Error ? error.message : "Request failed"
    return NextResponse.json({ error: message }, { status: error instanceof ApiAuthorizationError ? error.status : message === "TIMETABLE_DISABLED" ? 403 : 400 })
}

export async function GET(request: Request) {
    try {
        const session = await requireApiPermission(request, "timetable.read")
        await assertTimetableEnabled(session.user.id)
        const { searchParams } = new URL(request.url)
        const date = searchParams.get("date")
        const classId = searchParams.get("classId")
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "A valid date is required" }, { status: 400 })
        const db = await getSchoolDB()
        const sessions = await db.select().from(classSessions).where(classId ? and(eq(classSessions.sessionDate, date), eq(classSessions.classId, classId)) : eq(classSessions.sessionDate, date))
        const role = session.user.schoolRole as import("@/auth/permissions").Role
        const visible = await Promise.all(sessions.map(async item => ({ item, allowed: await canAccessTimetableClass({ id: session.user.id, role }, item.classId, item.academicYearId, item.subjectId) })))
        const rows = visible.filter(item => item.allowed).map(item => item.item)
        const attendance = rows.length
            ? await db.select().from(sessionStudentAttendance).where(inArray(sessionStudentAttendance.sessionId, rows.map(row => row.id)))
            : []
        const attendanceBySession = new Map<string, number>()
        for (const row of attendance) attendanceBySession.set(row.sessionId, (attendanceBySession.get(row.sessionId) ?? 0) + 1)
        return NextResponse.json({ sessions: rows.map(row => ({ ...row, recordedStudentCount: attendanceBySession.get(row.id) ?? 0 })) })
    } catch (error) { return errorResponse(error) }
}

export async function POST(request: Request) {
    try {
        const session = await requireApiPermission(request, "sessions.manage")
        await assertTimetableEnabled(session.user.id)
        const { date, academicYearId } = await request.json()
        if (typeof academicYearId !== "string" || !academicYearId.trim()) return NextResponse.json({ error: "academicYearId is required" }, { status: 400 })
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00`))) return NextResponse.json({ error: "Invalid date" }, { status: 400 })
        const db = await getSchoolDB()
        const [year] = await db.select({ startDate: academicYears.startDate, endDate: academicYears.endDate }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1)
        if (!year) return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
        if (date < year.startDate || date > year.endDate) return NextResponse.json({ error: "Session date is outside the selected academic year" }, { status: 400 })
        const weekday = dateWeekday(date)
        const slots = await db.select({ slot: classTimetableSlots }).from(classTimetableSlots)
            .innerJoin(classTimetables, eq(classTimetables.id, classTimetableSlots.timetableId))
            .where(and(eq(classTimetableSlots.academicYearId, academicYearId), eq(classTimetableSlots.dayOfWeek, weekday), eq(classTimetables.isActive, true), eq(classTimetableSlots.isActive, true)))
        const now = new Date().toISOString()
        let created = 0
        for (const { slot } of slots) {
            const [existing] = await db.select({ id: classSessions.id }).from(classSessions).where(and(eq(classSessions.timetableSlotId, slot.id), eq(classSessions.sessionDate, date))).limit(1)
            if (existing) continue
            const [inserted] = await db.insert(classSessions).values({ id: randomUUID(), timetableSlotId: slot.id, academicYearId: slot.academicYearId, classId: slot.classId, subjectId: slot.subjectId, scheduledTeacherId: slot.teacherId, actualTeacherId: slot.teacherId, sessionDate: date, startTime: slot.startTime, endTime: slot.endTime, status: "scheduled", createdAt: now, updatedAt: now }).onConflictDoNothing().returning({ id: classSessions.id })
            if (inserted) created++
        }
        return NextResponse.json({ created, existing: slots.length - created })
    } catch (error) { return errorResponse(error) }
}

export async function PATCH(request: Request) {
    try {
        const session = await requireApiPermission(request, "sessions.manage")
        await assertTimetableEnabled(session.user.id)
        const { sessionId, action, actualTeacherId, reason } = await request.json()
        if (!sessionId || !["substitute", "cancel", "complete"].includes(action)) return NextResponse.json({ error: "Invalid session action" }, { status: 400 })
        const db = await getSchoolDB()
        const [item] = await db.select().from(classSessions).where(eq(classSessions.id, sessionId)).limit(1)
        if (!item) return NextResponse.json({ error: "Session not found" }, { status: 404 })
        const now = new Date().toISOString()
        if (action === "substitute") {
            const [attendanceStarted] = await db.select({ id: sessionTeacherAttendance.id }).from(sessionTeacherAttendance).where(eq(sessionTeacherAttendance.sessionId, sessionId)).limit(1)
            if (attendanceStarted || ["completed", "cancelled"].includes(item.status)) return NextResponse.json({ error: "A started or closed session cannot be reassigned" }, { status: 409 })
            if (typeof actualTeacherId !== "string" || !actualTeacherId.trim()) return NextResponse.json({ error: "actualTeacherId is required" }, { status: 400 })
            const { teacherAssignments } = await import("@/db/schema")
            const [assignment] = await db.select({ teacherId: teacherAssignments.teacherId }).from(teacherAssignments).where(and(eq(teacherAssignments.teacherId, actualTeacherId), eq(teacherAssignments.academicYearId, item.academicYearId), eq(teacherAssignments.classId, item.classId), eq(teacherAssignments.subjectId, item.subjectId))).limit(1)
            if (!assignment) return NextResponse.json({ error: "Substitute teacher is not assigned to this class and subject" }, { status: 400 })
            await db.update(classSessions).set({ actualTeacherId, status: "substituted", updatedAt: now }).where(eq(classSessions.id, sessionId))
        } else if (action === "cancel") {
            if (["completed", "cancelled"].includes(item.status)) return NextResponse.json({ error: "A completed or cancelled session cannot be cancelled again" }, { status: 409 })
            if (typeof reason !== "string" || !reason.trim()) return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 })
            await db.update(classSessions).set({ status: "cancelled", cancellationReason: reason.trim().slice(0, 500), updatedAt: now }).where(eq(classSessions.id, sessionId))
        } else {
            if (item.status === "cancelled") return NextResponse.json({ error: "Cancelled sessions cannot be completed" }, { status: 409 })
            await db.update(classSessions).set({ status: "completed", updatedAt: now }).where(eq(classSessions.id, sessionId))
        }
        await db.insert(classSessionAuditLogs).values({ id: randomUUID(), sessionId, actorUserId: session.user.id, action, details: JSON.stringify({ actualTeacherId, reason }), createdAt: now })
        return NextResponse.json({ success: true })
    } catch (error) { return errorResponse(error) }
}
