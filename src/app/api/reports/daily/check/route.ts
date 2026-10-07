
import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"

import { checkDailyAttendanceReports } from "@/lib/reports/daily-attendance"
import { getSchoolDB } from "@/db"
import { notifications } from "@/db/schema"

export const dynamic = "force-dynamic"

function isAuthorized(request: Request) {
    const configuredSecret =
        process.env.DAILY_REPORT_CRON_SECRET

    if (!configuredSecret) {
        return false
    }

    const authorization =
        request.headers.get("authorization")

    return authorization === `Bearer ${configuredSecret}`
}

export async function POST(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            {
                error: "Unauthorized",
            },
            {
                status: 401,
            },
        )
    }

    try {
        const result =
            await checkDailyAttendanceReports()

        if (
            !result.academicYearId ||
            result.missingReports.length === 0
        ) {
            return NextResponse.json({
                success: true,
                date: result.date,
                assignmentsChecked:
                    result.assignmentsChecked,
                missingReports: 0,
                notificationsCreated: 0,
            })
        }

        const db = await getSchoolDB()

        let notificationsCreated = 0

        for (const report of result.missingReports) {
            const title =
                "Missing Daily Attendance Report"

            const message =
                `Attendance report is missing for ` +
                `${report.className} — ` +
                `${report.subjectName} ` +
                `on ${report.date}.`

            const existing =
                await db.query.notifications.findFirst({
                    where: (notification, { and, eq }) =>
                        and(
                            eq(
                                notification.recipientUserId,
                                report.teacherId,
                            ),
                            eq(
                                notification.title,
                                title,
                            ),
                            eq(
                                notification.message,
                                message,
                            ),
                        ),
                })

            if (existing) {
                continue
            }

            await db.insert(notifications).values({
                id: randomUUID(),
                recipientUserId:
                    report.teacherId,
                title,
                message,
                type: "attendance",
                isRead: false,
                createdAt:
                    new Date().toISOString(),
            })

            notificationsCreated++
        }

        return NextResponse.json({
            success: true,
            date: result.date,
            assignmentsChecked:
                result.assignmentsChecked,
            missingReports:
                result.missingReports.length,
            notificationsCreated,
        })
    } catch (error) {
        console.error(
            "Daily attendance report check failed:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to check daily attendance reports.",
            },
            {
                status: 500,
            },
        )
    }
}

