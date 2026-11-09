import { NextResponse } from "next/server"
import { randomUUID, timingSafeEqual } from "node:crypto"

import { checkDailyAttendanceReports } from "@/lib/reports/daily-attendance"
import { getSchoolDBForSystemTask } from "@/db"
import { centralDb } from "@/db/central"
import { schools } from "@/db/centeral-schema"
import { notifications } from "@/db/schema"

export const dynamic = "force-dynamic"

function isAuthorized(request: Request) {
    const configuredSecret = process.env.DAILY_REPORT_CRON_SECRET
    if (!configuredSecret || configuredSecret.length < 32) return false
    const authorization = request.headers.get("authorization")
    if (!authorization?.startsWith("Bearer ")) return false
    const supplied = Buffer.from(authorization.slice(7))
    const expected = Buffer.from(configuredSecret)
    return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function POST(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const schoolRows = await centralDb.select({ id: schools.id, name: schools.name }).from(schools)
    const schoolResults: Array<{ schoolId: number; success: boolean; assignmentsChecked?: number; missingReports?: number; notificationsCreated?: number; error?: string }> = []

    for (const school of schoolRows) {
        try {
            // The school id originates from the trusted central database, never request input.
            const db = await getSchoolDBForSystemTask(school.id)
            const result = await checkDailyAttendanceReports(db)
            let notificationsCreated = 0

            for (const report of result.missingReports) {
                const title = "Missing Daily Attendance Report"
                const message = `Attendance report is missing for ${report.className} — ${report.subjectName} on ${report.date}.`
                const existing = await db.query.notifications.findFirst({
                    where: (notification, { and, eq }) => and(
                        eq(notification.recipientUserId, report.teacherId),
                        eq(notification.title, title),
                        eq(notification.message, message),
                    ),
                })
                if (existing) continue

                await db.insert(notifications).values({
                    id: randomUUID(),
                    recipientUserId: report.teacherId,
                    title,
                    message,
                    type: "attendance",
                    isRead: false,
                    createdAt: new Date().toISOString(),
                })
                notificationsCreated++
            }

            schoolResults.push({
                schoolId: school.id,
                success: true,
                assignmentsChecked: result.assignmentsChecked,
                missingReports: result.missingReports.length,
                notificationsCreated,
            })
        } catch (error) {
            console.error(`Daily attendance report check failed for school ${school.id}:`, error)
            schoolResults.push({
                schoolId: school.id,
                success: false,
                error: "Failed to process school attendance reports",
            })
        }
    }

    const failed = schoolResults.filter((result) => !result.success).length
    return NextResponse.json({
        success: failed === 0,
        schoolsProcessed: schoolResults.length,
        schoolsFailed: failed,
        results: schoolResults,
    }, { status: failed === 0 ? 200 : 207 })
}
