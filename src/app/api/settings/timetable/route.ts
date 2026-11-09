import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { centralDb } from "@/db/central"
import { getSchoolDB } from "@/db"
import { schoolFeatureFlags } from "@/db/centeral-schema"
import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"

export async function GET(request: Request) {
    try {
        const session = await requireApiPermission(request, "settings.read")
        try {
            const [flags] = await centralDb.select({ timetableEnabled: schoolFeatureFlags.timetableEnabled, graceMinutes: schoolFeatureFlags.timetableAttendanceGraceMinutes })
                .from(schoolFeatureFlags).where(eq(schoolFeatureFlags.schoolId, session.user.schoolId)).limit(1)
            return NextResponse.json({ timetableEnabled: Boolean(flags?.timetableEnabled), graceMinutes: flags?.graceMinutes ?? 10, migrationPending: false })
        } catch {
            return NextResponse.json({ timetableEnabled: false, graceMinutes: 10, migrationPending: true })
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Request failed"
        const status = error instanceof ApiAuthorizationError ? error.status : /no such table|no such column/i.test(message) ? 503 : 500
        return NextResponse.json({ error: status === 503 ? "TIMETABLE_MIGRATION_PENDING" : message }, { status })
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await requireApiPermission(request, "settings.update")
        if (session.user.schoolRole !== "principal" && session.user.schoolRole !== "deputy") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        const body = await request.json()
        if (body.timetableEnabled !== undefined && typeof body.timetableEnabled !== "boolean") return NextResponse.json({ error: "timetableEnabled must be boolean" }, { status: 400 })
        if (body.graceMinutes !== undefined && (!Number.isInteger(body.graceMinutes) || body.graceMinutes < 0 || body.graceMinutes > 240)) return NextResponse.json({ error: "graceMinutes must be between 0 and 240" }, { status: 400 })
        if (body.timetableEnabled === undefined && body.graceMinutes === undefined) return NextResponse.json({ error: "No valid settings supplied" }, { status: 400 })
        if (body.timetableEnabled === true) {
            const schoolDb = await getSchoolDB()
            const requiredTables = [
                "class_timetables", "class_timetable_slots", "class_sessions",
                "session_teacher_attendance", "session_student_attendance",
                "class_session_notification_events", "class_timetable_audit_logs",
                "class_session_audit_logs",
            ]
            for (const tableName of requiredTables) {
                const schemaReady = await schoolDb.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${tableName}`)
                if (!schemaReady) return NextResponse.json({ error: "SCHOOL_TIMETABLE_MIGRATION_PENDING", missingTable: tableName }, { status: 409 })
            }
        }
        const [existing] = await centralDb.select().from(schoolFeatureFlags).where(eq(schoolFeatureFlags.schoolId, session.user.schoolId)).limit(1)
        const now = new Date()
        const values = {
            schoolId: session.user.schoolId,
            timetableEnabled: body.timetableEnabled ?? existing?.timetableEnabled ?? false,
            timetableAttendanceGraceMinutes: body.graceMinutes ?? existing?.timetableAttendanceGraceMinutes ?? 10,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        }
        await centralDb.insert(schoolFeatureFlags).values(values).onConflictDoUpdate({
            target: schoolFeatureFlags.schoolId,
            set: { timetableEnabled: values.timetableEnabled, timetableAttendanceGraceMinutes: values.timetableAttendanceGraceMinutes, updatedAt: now },
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Request failed"
        const status = error instanceof ApiAuthorizationError ? error.status : /no such table|no such column/i.test(message) ? 503 : 500
        return NextResponse.json({ error: status === 503 ? "TIMETABLE_MIGRATION_PENDING" : message }, { status })
    }
}
