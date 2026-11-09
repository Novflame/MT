import { NextResponse } from "next/server"
import { and, eq, inArray, lte } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { centralDb } from "@/db/central"
import { schoolFeatureFlags, user } from "@/db/centeral-schema"
import { getSchoolDBForSystemTask } from "@/db"
import { classSessions, classSessionNotificationEvents, notifications, sessionTeacherAttendance, sessionStudentAttendance, studentEnrollments } from "@/db/schema"
import { getTimetableLocalParts, schoolLocalDateTimeToDate } from "@/lib/timetable/access"

export async function POST(request: Request) {
    const secret = process.env.TIMETABLE_CRON_SECRET
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    let enabledSchools
    try {
        enabledSchools = await centralDb.select({ id: schoolFeatureFlags.schoolId, grace: schoolFeatureFlags.timetableAttendanceGraceMinutes }).from(schoolFeatureFlags).where(eq(schoolFeatureFlags.timetableEnabled, true))
    } catch {
        return NextResponse.json({ error: "TIMETABLE_MIGRATION_PENDING" }, { status: 503 })
    }
    let notificationsCreated = 0
    for (const school of enabledSchools) {
        const db = await getSchoolDBForSystemTask(school.id)
        const now = new Date()
        const { date: today } = getTimetableLocalParts(now)
        const rows = await db.select().from(classSessions).where(and(lte(classSessions.sessionDate, today), inArray(classSessions.status, ["scheduled", "in_progress", "substituted", "completed"])))
        const recipients = await centralDb.select({ id: user.id }).from(user).where(and(eq(user.schoolId, school.id), inArray(user.schoolRole, ["principal", "deputy"])))
        for (const item of rows) {
            const deadline = schoolLocalDateTimeToDate(item.sessionDate, item.endTime).getTime() + school.grace * 60000
            if (now.getTime() < deadline) continue
            const [teacherAttendance] = await db.select().from(sessionTeacherAttendance).where(eq(sessionTeacherAttendance.sessionId, item.id)).limit(1)
            const expected = await db.select({ id: studentEnrollments.id }).from(studentEnrollments).where(and(eq(studentEnrollments.classId, item.classId), eq(studentEnrollments.academicYearId, item.academicYearId)))
            const recorded = await db.select({ id: sessionStudentAttendance.id }).from(sessionStudentAttendance).where(eq(sessionStudentAttendance.sessionId, item.id))
            const missingStudents = expected.length - recorded.length
            const eventTypes = [
                !teacherAttendance?.checkedInAt ? "teacher_checkin_missing" : null,
                teacherAttendance?.checkedInAt && !teacherAttendance.checkedOutAt ? "teacher_checkout_missing" : null,
                missingStudents > 0 ? "student_attendance_missing" : null,
            ].filter(Boolean) as string[]
            for (const eventType of eventTypes) {
                const nowIso = now.toISOString()
                const [event] = await db.insert(classSessionNotificationEvents)
                    .values({ id: randomUUID(), sessionId: item.id, eventType, createdAt: nowIso })
                    .onConflictDoNothing()
                    .returning({ id: classSessionNotificationEvents.id })
                if (!event) continue
                for (const recipient of recipients) {
                    await db.insert(notifications).values({ id: randomUUID(), recipientUserId: recipient.id, title: eventType === "teacher_checkin_missing" ? "Missing teacher check-in" : eventType === "teacher_checkout_missing" ? "Missing teacher check-out" : "Student attendance incomplete", message: `Class session ${item.id} (${item.sessionDate}, ${item.startTime}) has ${eventType === "teacher_checkin_missing" ? "no teacher check-in" : eventType === "teacher_checkout_missing" ? "no teacher check-out" : `${missingStudents} student attendance records missing`}.`, type: "attendance", isRead: false, createdAt: nowIso })
                    notificationsCreated++
                }
            }
        }
    }
    return NextResponse.json({ schoolsChecked: enabledSchools.length, notificationsCreated })
}
