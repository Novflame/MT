import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { getSchoolDB } from "@/db"
import { classSessions, sessionStudentAttendance, studentEnrollments, students, classSessionAuditLogs } from "@/db/schema"
import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"
import { assertTimetableEnabled, canAccessTimetableClass } from "@/lib/timetable/access"

const statuses = new Set(["present", "absent", "late", "excused"])

async function loadSession(sessionId: string) {
    const db = await getSchoolDB()
    const [item] = await db.select().from(classSessions).where(eq(classSessions.id, sessionId)).limit(1)
    return { db, item }
}

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
    try {
        const session = await requireApiPermission(request, "timetable.read")
        await assertTimetableEnabled(session.user.id)
        const { sessionId } = await context.params
        const { db, item } = await loadSession(sessionId)
        if (!item) return NextResponse.json({ error: "Session not found" }, { status: 404 })
        const allowed = await canAccessTimetableClass({ id: session.user.id, role: session.user.schoolRole as import("@/auth/permissions").Role }, item.classId, item.academicYearId, item.subjectId)
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        const roster = await db.select({ enrollmentId: studentEnrollments.id, studentId: students.id, firstName: students.firstName, middleName: students.middleName, lastName: students.lastName, attendance: sessionStudentAttendance.status, note: sessionStudentAttendance.note })
            .from(studentEnrollments).innerJoin(students, eq(students.id, studentEnrollments.studentId))
            .leftJoin(sessionStudentAttendance, and(eq(sessionStudentAttendance.studentEnrollmentId, studentEnrollments.id), eq(sessionStudentAttendance.sessionId, sessionId)))
            .where(and(eq(studentEnrollments.classId, item.classId), eq(studentEnrollments.academicYearId, item.academicYearId)))
        return NextResponse.json({ roster })
    } catch (error) { const message = error instanceof Error ? error.message : "Request failed"; return NextResponse.json({ error: message }, { status: error instanceof ApiAuthorizationError ? error.status : message === "TIMETABLE_DISABLED" ? 403 : 400 }) }
}

export async function PUT(request: Request, context: { params: Promise<{ sessionId: string }> }) {
    try {
        const session = await requireApiPermission(request, "sessions.attendance")
        await assertTimetableEnabled(session.user.id)
        const { sessionId } = await context.params
        const body = await request.json()
        if (!Array.isArray(body.records) || body.records.length > 200) return NextResponse.json({ error: "records must be an array of at most 200 items" }, { status: 400 })
        const { db, item } = await loadSession(sessionId)
        if (!item) return NextResponse.json({ error: "Session not found" }, { status: 404 })
        if (item.status === "cancelled") return NextResponse.json({ error: "Cancelled sessions cannot receive attendance" }, { status: 409 })
        const role = session.user.schoolRole as import("@/auth/permissions").Role
        const allowed = await canAccessTimetableClass({ id: session.user.id, role }, item.classId, item.academicYearId, item.subjectId)
        if (!allowed || (role === "teacher" && item.actualTeacherId !== session.user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        const enrollments = await db.select({ id: studentEnrollments.id }).from(studentEnrollments).where(and(eq(studentEnrollments.classId, item.classId), eq(studentEnrollments.academicYearId, item.academicYearId)))
        const validIds = new Set(enrollments.map(row => row.id))
        for (const record of body.records) {
            if (!validIds.has(record.enrollmentId) || !statuses.has(record.status)) return NextResponse.json({ error: "Invalid enrollment or attendance status" }, { status: 400 })
        }
        const now = new Date().toISOString()
        for (const record of body.records) {
            await db.insert(sessionStudentAttendance).values({ id: randomUUID(), sessionId, studentEnrollmentId: record.enrollmentId, status: record.status, note: typeof record.note === "string" ? record.note.slice(0, 500) : null, recordedBy: session.user.id, recordedAt: now })
                .onConflictDoUpdate({ target: [sessionStudentAttendance.sessionId, sessionStudentAttendance.studentEnrollmentId], set: { status: record.status, note: typeof record.note === "string" ? record.note.slice(0, 500) : null, recordedBy: session.user.id, recordedAt: now } })
        }
        await db.insert(classSessionAuditLogs).values({ id: randomUUID(), sessionId, actorUserId: session.user.id, action: "student_attendance_saved", details: JSON.stringify({ count: body.records.length }), createdAt: now })
        return NextResponse.json({ saved: body.records.length })
    } catch (error) { const message = error instanceof Error ? error.message : "Request failed"; return NextResponse.json({ error: message }, { status: error instanceof ApiAuthorizationError ? error.status : message === "TIMETABLE_DISABLED" ? 403 : 400 }) }
}
