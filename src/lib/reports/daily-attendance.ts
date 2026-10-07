
import { and, eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import {
    academicYears,
    attendance,
    teacherAssignments,
} from "@/db/schema"

type MissingAttendanceReport = {
    teacherId: string
    classId: string
    className: string
    subjectId: string
    subjectName: string
    date: string
}

type DailyAttendanceCheckResult = {
    date: string
    academicYearId: string | null
    assignmentsChecked: number
    missingReports: MissingAttendanceReport[]
}

function getTodayDate() {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

export async function checkDailyAttendanceReports(
    date = getTodayDate(),
): Promise<DailyAttendanceCheckResult> {
    const db = await getSchoolDB()

    const academicYear = await db.query.academicYears.findFirst({
        where: eq(academicYears.isActive, true),
    })

    if (!academicYear) {
        return {
            date,
            academicYearId: null,
            assignmentsChecked: 0,
            missingReports: [],
        }
    }

    const assignments =
        await db.query.teacherAssignments.findMany({
            where: eq(
                teacherAssignments.academicYearId,
                academicYear.id,
            ),
            with: {
                class: true,
                subject: true,
            },
        })

    const missingReports: MissingAttendanceReport[] = []

    for (const assignment of assignments) {
        const records = await db.query.attendance.findMany({
            where: and(
                eq(
                    attendance.subjectId,
                    assignment.subjectId,
                ),
                eq(
                    attendance.date,
                    date,
                ),
            ),
            with: {
                studentEnrollment: true,
            },
        })

        const classRecords = records.filter(
            (record) =>
                record.studentEnrollment.classId ===
                assignment.classId,
        )

        if (classRecords.length === 0) {
            missingReports.push({
                teacherId: assignment.teacherId,
                classId: assignment.classId,
                className: assignment.class.name,
                subjectId: assignment.subjectId,
                subjectName: assignment.subject.name,
                date,
            })
        }
    }

    return {
        date,
        academicYearId: academicYear.id,
        assignmentsChecked: assignments.length,
        missingReports,
    }
}

