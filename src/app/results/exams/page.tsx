
import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getStudentFullName } from "@/lib/student-name"
import { eq, isNotNull } from "drizzle-orm"

import {
    
    grades,
    parentStudents,
    parents,
    studentUsers,
    teacherAssignments,
} from "@/db/schema"

type ExamType = "QUIZ" | "MONTHLY" | "MIDTERM" | "FINAL"

function letterGrade(percent: number) {
    if (percent >= 90) return "A+"
    if (percent >= 80) return "A"
    if (percent >= 70) return "B"
    if (percent >= 60) return "C"
    if (percent >= 50) return "D"
    return "F"
}

function typeLabel(type: string) {
    switch (type) {
        case "QUIZ":
            return "Quiz"
        case "MONTHLY":
            return "Monthly"
        case "MIDTERM":
            return "Midterm"
        case "FINAL":
            return "Final"
        default:
            return type
    }
}

function typeClass(type: string) {
    switch (type) {
        case "QUIZ":
            return "bg-blue-50 text-blue-700"
        case "MONTHLY":
            return "bg-violet-50 text-violet-700"
        case "MIDTERM":
            return "bg-amber-50 text-amber-700"
        case "FINAL":
            return "bg-emerald-50 text-emerald-700"
        default:
            return "bg-slate-100 text-slate-700"
    }
}

export default async function ExamResultsPage() {
    const session = await requirePermission("results.read")
    const db = await getSchoolDB()

    const role = session.user.schoolRole

    /*
     * ---------------------------------------------------------
     * Determine which students are visible
     * ---------------------------------------------------------
     */

    let allowedStudentIds: Set<string> | null = null

    if (role === "student") {
        const studentUser = await db.query.studentUsers.findFirst({
            where: eq(studentUsers.userId, session.user.id),
        })

        allowedStudentIds = new Set(
            studentUser ? [studentUser.studentId] : [],
        )
    }

    if (role === "parent") {
        const parent = await db.query.parents.findFirst({
            where: eq(parents.userId, session.user.id),
        })

        if (parent) {
            const children = await db.query.parentStudents.findMany({
                where: eq(parentStudents.parentId, parent.id),
            })

            allowedStudentIds = new Set(
                children.map((child) => child.studentId),
            )
        } else {
            allowedStudentIds = new Set()
        }
    }

    /*
     * ---------------------------------------------------------
     * Teacher assignments
     * ---------------------------------------------------------
     *
     * A teacher can see an exam only when the exam's
     *
     * academicYearId + classId + subjectId
     *
     * matches one of the teacher's assignments.
     */

    let teacherAssignmentKeys: Set<string> | null = null

    if (role === "teacher") {
        const assignments =
            await db.query.teacherAssignments.findMany({
                where: eq(
                    teacherAssignments.teacherId,
                    session.user.id,
                ),
            })

        teacherAssignmentKeys = new Set(
            assignments.map(
                (assignment) =>
                    `${assignment.academicYearId}:${assignment.classId}:${assignment.subjectId}`,
            ),
        )
    }

    /*
     * ---------------------------------------------------------
     * Load data
     * ---------------------------------------------------------
     */

  
const [
    allGrades,
    allEnrollments,
] = await Promise.all([
    db.query.grades.findMany({
        where: isNotNull(grades.examId),
        with: {
            exam: {
                with: {
                    subject: true,
                    class: true,
                },
            },
        },
    }),

    db.query.studentEnrollments.findMany({
        with: {
            student: true,
        },
    }),
])


    /*
     * ---------------------------------------------------------
     * Enrollment lookup
     * ---------------------------------------------------------
     */

    const enrollmentMap = new Map(
        allEnrollments.map((enrollment) => [
            enrollment.id,
            enrollment,
        ]),
    )

    /*
     * ---------------------------------------------------------
     * Build result rows
     * ---------------------------------------------------------
     */

    const resultRows = allGrades
        .filter((grade) => grade.examId !== null)
        .map((grade) => {
            const exam = grade.exam

            if (!exam) {
                return null
            }

            const enrollment = enrollmentMap.get(
                grade.studentEnrollmentId,
            )

            if (!enrollment) {
                return null
            }

            /*
             * Student / parent restriction
             */

            if (
                allowedStudentIds &&
                !allowedStudentIds.has(enrollment.studentId)
            ) {
                return null
            }

            /*
             * Teacher restriction
             */

            if (teacherAssignmentKeys) {
                const assignmentKey =
                    `${exam.academicYearId}:${exam.classId}:${exam.subjectId}`

                if (!teacherAssignmentKeys.has(assignmentKey)) {
                    return null
                }
            }

            const maxScore = exam.maxScore
            const percentage =
                maxScore > 0
                    ? Math.round((grade.score / maxScore) * 100)
                    : 0

            return {
                id: grade.id,

                examId: exam.id,
                examName: exam.name,
                examType: exam.type as ExamType,
                examDate: exam.examDate,

                academicYearId: exam.academicYearId,

                classId: exam.classId,
                className: exam.class?.name ?? "Class",

                subjectId: exam.subjectId,
                subjectName: exam.subject?.name ?? "Subject",

                enrollmentId: enrollment.id,
                studentId: enrollment.studentId,

                studentName: getStudentFullName(
                    enrollment.student,
                ),

                score: grade.score,
                maxScore,

                percentage,
                letter: letterGrade(percentage),
            }
        })
        .filter(
            (
                row,
            ): row is NonNullable<typeof row> =>
                row !== null,
        )

    /*
     * ---------------------------------------------------------
     * Sort
     * ---------------------------------------------------------
     */

    resultRows.sort((a, b) => {
        const examDate =
            b.examDate.localeCompare(a.examDate)

        if (examDate !== 0) {
            return examDate
        }

        const examName =
            a.examName.localeCompare(b.examName)

        if (examName !== 0) {
            return examName
        }

        return a.studentName.localeCompare(
            b.studentName,
        )
    })

    /*
     * ---------------------------------------------------------
     * Statistics
     * ---------------------------------------------------------
     */

    const totalResults = resultRows.length

    const averagePercentage =
        totalResults > 0
            ? Math.round(
                  resultRows.reduce(
                      (sum, row) =>
                          sum + row.percentage,
                      0,
                  ) / totalResults,
              )
            : 0

    const passedResults = resultRows.filter(
        (row) => row.percentage >= 50,
    ).length

    /*
     * ---------------------------------------------------------
     * Group results by exam
     * ---------------------------------------------------------
     */

    const groupedExams = new Map<
        string,
        {
            examId: string
            examName: string
            examType: ExamType
            examDate: string
            className: string
            subjectName: string
            maxScore: number
            rows: typeof resultRows
        }
    >()

    for (const row of resultRows) {
        const existing = groupedExams.get(
            row.examId,
        )

        if (existing) {
            existing.rows.push(row)
            continue
        }

        groupedExams.set(row.examId, {
            examId: row.examId,
            examName: row.examName,
            examType: row.examType,
            examDate: row.examDate,
            className: row.className,
            subjectName: row.subjectName,
            maxScore: row.maxScore,
            rows: [row],
        })
    }

    const examGroups = Array.from(
        groupedExams.values(),
    )

    /*
     * ---------------------------------------------------------
     * Render
     * ---------------------------------------------------------
     */

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Header */}

                <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                School Management System
                            </p>

                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                                Exam Results
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                Quiz, Monthly, Midterm and Final
                                examination results
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <a
                                href="/results"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                <svg
                                    width="17"
                                    height="17"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="m15 18-6-6 6-6" />
                                </svg>

                                Final Results
                            </a>
                        </div>
                    </div>
                </header>

                {/* Summary */}

                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Results
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-900">
                            {totalResults}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Exams
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-900">
                            {examGroups.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Average
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-900">
                            {averagePercentage}%
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Passed
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-900">
                            {passedResults}
                        </p>
                    </div>
                </section>

                {/* Results */}

                {examGroups.length === 0 ? (
                    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                            <svg
                                width="26"
                                height="26"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="text-slate-500"
                            >
                                <path d="M4 4h16v16H4z" />
                                <path d="M8 8h8" />
                                <path d="M8 12h8" />
                                <path d="M8 16h5" />
                            </svg>
                        </div>

                        <h2 className="mt-4 text-lg font-semibold text-slate-900">
                            No exam results found
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            There are no recorded examination
                            grades available for your account.
                        </p>
                    </section>
                ) : (
                    <div className="space-y-5">
                        {examGroups.map((exam) => (
                            <section
                                key={exam.examId}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                            >
                                {/* Exam header */}

                                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="truncate text-lg font-bold text-slate-900">
                                                    {exam.examName}
                                                </h2>

                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeClass(
                                                        exam.examType,
                                                    )}`}
                                                >
                                                    {typeLabel(
                                                        exam.examType,
                                                    )}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                                <span>
                                                    {exam.subjectName}
                                                </span>

                                                <span>
                                                    {exam.className}
                                                </span>

                                                <span>
                                                    {exam.examDate}
                                                </span>

                                                <span>
                                                    Max Score:{" "}
                                                    {exam.maxScore}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                                                {exam.rows.length}{" "}
                                                {exam.rows.length ===
                                                1
                                                    ? "Student"
                                                    : "Students"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}

                                <div className="overflow-x-auto">
<table className="w-full `min-w-180` text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-white">
                                                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6">
                                                    Student
                                                </th>

                                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Score
                                                </th>

                                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Percentage
                                                </th>

                                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Grade
                                                </th>

                                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {exam.rows.map(
                                                (row) => (
                                                    <tr
                                                        key={
                                                            row.id
                                                        }
                                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                                    >
                                                        <td className="px-5 py-4 sm:px-6">
                                                            <div className="font-medium text-slate-900">
                                                                {
                                                                    row.studentName
                                                                }
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span className="font-semibold text-slate-900">
                                                                {
                                                                    row.score
                                                                }
                                                            </span>

                                                            <span className="text-slate-400">
                                                                {" "}
                                                                /{" "}
                                                                {
                                                                    row.maxScore
                                                                }
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span className="font-semibold text-slate-900">
                                                                {
                                                                    row.percentage
                                                                }
                                                                %
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-700">
                                                                {
                                                                    row.letter
                                                                }
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {row.percentage >=
                                                            50 ? (
                                                                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                                    Passed
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                                                    Failed
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}

