import { NextResponse } from "next/server"

import { getSchoolDB } from "@/db"
import { requirePermission } from "@/auth/session"

import {
    attendance,
    grades,
    students,
    studentEnrollments,
    teacherAssignments,
    exams,
    tests,
    subjects,
} from "@/db/schema"


export async function GET() {

    try {

        await requirePermission("reports.read")

        const db = await getSchoolDB()


        // ==========================================
        // Load data
        // ==========================================

        const [
            studentRows,
            enrollmentRows,
            attendanceRows,
            gradeRows,
            examRows,
            testRows,
            assignmentRows,
            subjectRows,
        ] = await Promise.all([

            db.select().from(students),

            db.select().from(studentEnrollments),

            db.select().from(attendance),

            db.select().from(grades),

            db.select().from(exams),

            db.select().from(tests),

            db.select().from(teacherAssignments),

            db.select().from(subjects),

        ])


        // ==========================================
        // Attendance statistics
        // ==========================================

        const present =
            attendanceRows.filter(
                row => row.status === "present",
            ).length

        const absent =
            attendanceRows.filter(
                row => row.status === "absent",
            ).length

        const late =
            attendanceRows.filter(
                row => row.status === "late",
            ).length

        const excused =
            attendanceRows.filter(
                row => row.status === "excused",
            ).length


        const attendanceRate =
            attendanceRows.length
                ? Number(
                    (
                        (present /
                            attendanceRows.length) *
                        100
                    ).toFixed(1),
                )
                : 0


        // ==========================================
        // Teacher count
        // ==========================================

        const teacherCount =
            new Set(
                assignmentRows.map(
                    row => row.teacherId,
                ),
            ).size


        // ==========================================
        // Overall grade statistics
        // ==========================================

        let earned = 0
        let maximum = 0


        for (const grade of gradeRows) {

            let maxScore = 0

            if (grade.testId) {

                const test =
                    testRows.find(
                        item =>
                            item.id ===
                            grade.testId,
                    )

                maxScore =
                    test?.maxScore ?? 0
            }

            else if (grade.examId) {

                const exam =
                    examRows.find(
                        item =>
                            item.id ===
                            grade.examId,
                    )

                maxScore =
                    exam?.maxScore ?? 0
            }


            earned += grade.score
            maximum += maxScore
        }


        const averageScore =
            maximum
                ? Number(
                    (
                        (earned /
                            maximum) *
                        100
                    ).toFixed(1),
                )
                : 0


        // ==========================================
        // Academic performance by subject
        // ==========================================

        type SubjectPerformance = {
            subjectId: string
            subjectName: string
            earned: number
            maximum: number
            gradesCount: number
        }


        const performanceBySubject =
            new Map<
                string,
                SubjectPerformance
            >()


        for (const grade of gradeRows) {

            let subjectId: string | null = null
            let maxScore = 0


            // ------------------------------
            // Grade belongs to a test
            // ------------------------------

            if (grade.testId) {

                const test =
                    testRows.find(
                        item =>
                            item.id ===
                            grade.testId,
                    )

                if (test) {

                    subjectId =
                        test.subjectId

                    maxScore =
                        test.maxScore
                }
            }


            // ------------------------------
            // Grade belongs to an exam
            // ------------------------------

            else if (grade.examId) {

                const exam =
                    examRows.find(
                        item =>
                            item.id ===
                            grade.examId,
                    )

                if (exam) {

                    subjectId =
                        exam.subjectId

                    maxScore =
                        exam.maxScore
                }
            }


            // ------------------------------
            // Invalid / missing subject
            // ------------------------------

            if (!subjectId) {
                continue
            }


            const subject =
                subjectRows.find(
                    item =>
                        item.id ===
                        subjectId,
                )


            if (!subject) {
                continue
            }


            const existing =
                performanceBySubject.get(
                    subjectId,
                ) ?? {
                    subjectId,
                    subjectName:
                        subject.name,
                    earned: 0,
                    maximum: 0,
                    gradesCount: 0,
                }


            existing.earned +=
                grade.score

            existing.maximum +=
                maxScore

            existing.gradesCount++


            performanceBySubject.set(
                subjectId,
                existing,
            )
        }


        const academicPerformance =
            Array.from(
                performanceBySubject.values(),
            )
                .map(subject => ({

                    subjectId:
                        subject.subjectId,

                    subjectName:
                        subject.subjectName,

                    averageScore:
                        subject.maximum
                            ? Number(
                                (
                                    (subject.earned /
                                        subject.maximum) *
                                    100
                                ).toFixed(1),
                            )
                            : 0,

                    gradesCount:
                        subject.gradesCount,
                }))
                .sort(
                    (a, b) =>
                        b.averageScore -
                        a.averageScore,
                )


        // ==========================================
        // Attendance trend
        // ==========================================

        const attendanceByDate =
            new Map<
                string,
                {
                    present: number
                    absent: number
                    late: number
                    excused: number
                }
            >()


        for (const record of attendanceRows) {

            const existing =
                attendanceByDate.get(
                    record.date,
                ) ?? {
                    present: 0,
                    absent: 0,
                    late: 0,
                    excused: 0,
                }


            if (
                record.status === "present"
            ) {
                existing.present++
            }

            if (
                record.status === "absent"
            ) {
                existing.absent++
            }

            if (
                record.status === "late"
            ) {
                existing.late++
            }

            if (
                record.status === "excused"
            ) {
                existing.excused++
            }


            attendanceByDate.set(
                record.date,
                existing,
            )
        }


        const attendanceTrend =
            Array.from(
                attendanceByDate.entries(),
            )
                .sort(
                    ([dateA], [dateB]) =>
                        dateA.localeCompare(
                            dateB,
                        ),
                )
                .map(
                    ([date, values]) => ({
                        date,
                        ...values,
                    }),
                )


        // ==========================================
        // Response
        // ==========================================

        return NextResponse.json({

            // KPI

            students:
                studentRows.length,

            enrollments:
                enrollmentRows.length,

            teachers:
                teacherCount,

            exams:
                examRows.length,

            tests:
                testRows.length,

            grades:
                gradeRows.length,

            attendanceRecords:
                attendanceRows.length,

            attendanceRate,

            averageScore,


            // Attendance

            attendanceSummary: {
                present,
                absent,
                late,
                excused,
            },

            attendanceTrend,


            // Academic performance

            academicPerformance,


            // Metadata

            generatedAt:
                new Date().toISOString(),
        })

    } catch (error) {

        console.error(
            "ANALYTICS ERROR:",
            error,
        )


        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get analytics",
            },
            {
                status: 500,
            },
        )
    }
}