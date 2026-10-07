
import Link from "next/link"
import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getStudentFullName } from "@/lib/student-name"
import { getLocale } from "@/lib/i18n/server"
import { eq, isNotNull } from "drizzle-orm"

import {
    grades,
    parentStudents,
    parents,
    studentUsers,
    teacherAssignments,
} from "@/db/schema"

type ExamType = "QUIZ" | "MONTHLY" | "MIDTERM" | "FINAL"

type ResultTranslations = {
    schoolManagementSystem: string
    examResults: string
    examResultsDescription: string
    finalResults: string

    results: string
    exams: string
    average: string
    passed: string

    noExamResults: string
    noExamResultsDescription: string

    student: string
    students: string
    score: string
    percentage: string
    grade: string
    status: string
    passedStatus: string
    failedStatus: string

    maxScore: string

    quiz: string
    monthly: string
    midterm: string
    final: string
    class: string
    subject: string
}

const resultTranslations: Record<
    "en" | "ar" | "fr",
    ResultTranslations
> = {
    en: {
        schoolManagementSystem: "School Management System",
        examResults: "Exam Results",
        examResultsDescription:
            "Quiz, Monthly, Midterm and Final examination results",
        finalResults: "Final Results",

        results: "Results",
        exams: "Exams",
        average: "Average",
        passed: "Passed",

        noExamResults: "No exam results found",
        noExamResultsDescription:
            "There are no recorded examination grades available for your account.",

        student: "Student",
        students: "Students",
        score: "Score",
        percentage: "Percentage",
        grade: "Grade",
        status: "Status",
        passedStatus: "Passed",
        failedStatus: "Failed",

        maxScore: "Max Score",

        quiz: "Quiz",
        monthly: "Monthly",
        midterm: "Midterm",
        final: "Final",
        class: "Class",
        subject: "Subject",
    },

    ar: {
        schoolManagementSystem: "نظام إدارة المدارس",
        examResults: "نتائج الاختبارات",
        examResultsDescription:
            "نتائج الاختبارات القصيرة والشهرية ونصف الفصل والنهائية",
        finalResults: "النتائج النهائية",

        results: "النتائج",
        exams: "الاختبارات",
        average: "المتوسط",
        passed: "الناجحون",

        noExamResults: "لا توجد نتائج اختبارات",
        noExamResultsDescription:
            "لا توجد درجات اختبارات مسجلة متاحة لحسابك.",

        student: "الطالب",
        students: "الطلاب",
        score: "الدرجة",
        percentage: "النسبة المئوية",
        grade: "التقدير",
        status: "الحالة",
        passedStatus: "ناجح",
        failedStatus: "راسب",

        maxScore: "الدرجة القصوى",

        quiz: "اختبار قصير",
        monthly: "اختبار شهري",
        midterm: "اختبار نصف الفصل",
        final: "اختبار نهائي",
        class: "الفصل",
        subject: "المادة",
    },

    fr: {
        schoolManagementSystem: "Système de gestion scolaire",
        examResults: "Résultats des examens",
        examResultsDescription:
            "Résultats des quiz, examens mensuels, de mi-semestre et finaux",
        finalResults: "Résultats finaux",

        results: "Résultats",
        exams: "Examens",
        average: "Moyenne",
        passed: "Réussis",

        noExamResults: "Aucun résultat d'examen trouvé",
        noExamResultsDescription:
            "Aucune note d'examen enregistrée n'est disponible pour votre compte.",

        student: "Élève",
        students: "Élèves",
        score: "Note",
        percentage: "Pourcentage",
        grade: "Mention",
        status: "Statut",
        passedStatus: "Réussi",
        failedStatus: "Échec",

        maxScore: "Note maximale",

        quiz: "Quiz",
        monthly: "Mensuel",
        midterm: "Mi-semestre",
        final: "Final",
        class: "Classe",
        subject: "Matière",
    },
}

function letterGrade(percent: number) {
    if (percent >= 90) return "A+"
    if (percent >= 80) return "A"
    if (percent >= 70) return "B"
    if (percent >= 60) return "C"
    if (percent >= 50) return "D"
    return "F"
}

function typeLabel(
    type: string,
    t: ResultTranslations,
) {
    switch (type) {
        case "QUIZ":
            return t.quiz
        case "MONTHLY":
            return t.monthly
        case "MIDTERM":
            return t.midterm
        case "FINAL":
            return t.final
        default:
            return type
    }
}

function typeClass(type: string) {
    switch (type) {
        case "QUIZ":
            return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"

        case "MONTHLY":
            return "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"

        case "MIDTERM":
            return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"

        case "FINAL":
            return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"

        default:
            return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
}

function gradeClass(percent: number) {
    if (percent >= 50) {
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    }

    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
}

export default async function ExamResultsPage() {
    const session = await requirePermission("results.read")
    const db = await getSchoolDB()
    const locale = await getLocale()
    const t = resultTranslations[locale]

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

    const [allGrades, allEnrollments] = await Promise.all([
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
                className: exam.class?.name ?? t.class,

                subjectId: exam.subjectId,
                subjectName: exam.subject?.name ?? t.subject,

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
        <main className="min-h-dvh bg-slate-100 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 dark:bg-slate-950">
            <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
                {/* Header */}

                <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
                                {t.schoolManagementSystem}
                            </p>

                            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                                {t.examResults}
                            </h1>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {t.examResultsDescription}
                            </p>
                        </div>

                        <Link
                            href="/results"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path d="m15 18-6-6 6-6" />
                            </svg>

                            {t.finalResults}
                        </Link>
                    </div>
                </header>

                {/* Summary */}

                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t.results}
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                            {totalResults}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t.exams}
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                            {examGroups.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
                        <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-400">
                            {t.average}
                        </p>

                        <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
                            {averagePercentage}%
                        </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            {t.passed}
                        </p>

                        <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                            {passedResults}
                        </p>
                    </div>
                </section>

                {/* Results */}

                {examGroups.length === 0 ? (
                    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm sm:px-6 sm:py-14 dark:border-slate-800 dark:bg-slate-900">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                            <svg
                                width="26"
                                height="26"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="text-slate-500 dark:text-slate-400"
                                aria-hidden="true"
                            >
                                <path d="M4 4h16v16H4z" />
                                <path d="M8 8h8" />
                                <path d="M8 12h8" />
                                <path d="M8 16h5" />
                            </svg>
                        </div>

                        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                            {t.noExamResults}
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t.noExamResultsDescription}
                        </p>
                    </section>
                ) : (
                    <div className="space-y-4 sm:space-y-5">
                        {examGroups.map((exam) => (
                            <section
                                key={exam.examId}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                            >
                                {/* Exam header */}

                                <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900/70">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="max-w-full truncate text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                                                    {exam.examName}
                                                </h2>

                                                <span
                                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${typeClass(
                                                        exam.examType,
                                                    )}`}
                                                >
                                                    {typeLabel(
                                                        exam.examType,
                                                        t,
                                                    )}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-500 sm:text-sm dark:text-slate-400">
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
                                                    {t.maxScore}:{" "}
                                                    {
                                                        exam.maxScore
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            <span className="inline-flex rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                                                {
                                                    exam.rows
                                                        .length
                                                }{" "}
                                                {exam.rows
                                                    .length ===
                                                1
                                                    ? t.student
                                                    : t.students}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}

                                <div className="max-w-full overflow-x-auto">
                                    <table className="w-full min-w-180 text-left rtl:text-right">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6 dark:text-slate-400">
                                                    {t.student}
                                                </th>

                                                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                    {t.score}
                                                </th>

                                                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                    {t.percentage}
                                                </th>

                                                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                    {t.grade}
                                                </th>

                                                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                    {t.status}
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {exam.rows.map(
                                                (row) => {
                                                    const passed =
                                                        row.percentage >=
                                                        50

                                                    return (
                                                        <tr
                                                            key={
                                                                row.id
                                                            }
                                                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                                                        >
                                                            <td className="px-4 py-4 sm:px-6">
                                                                <div className="min-w-35 font-medium text-slate-900 dark:text-white">
                                                                    {
                                                                        row.studentName
                                                                    }
                                                                </div>
                                                            </td>

                                                            <td className="whitespace-nowrap px-4 py-4">
                                                                <span className="font-semibold text-slate-900 dark:text-white">
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

                                                            <td className="whitespace-nowrap px-4 py-4">
                                                                <span
                                                                    className={`font-semibold ${
                                                                        passed
                                                                            ? "text-emerald-700 dark:text-emerald-400"
                                                                            : "text-red-700 dark:text-red-400"
                                                                    }`}
                                                                >
                                                                    {
                                                                        row.percentage
                                                                    }
                                                                    %
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-4">
                                                                <span
                                                                    className={`inline-flex min-w-10 items-center justify-center rounded-lg px-2.5 py-1 text-sm font-bold ${gradeClass(
                                                                        row.percentage,
                                                                    )}`}
                                                                >
                                                                    {
                                                                        row.letter
                                                                    }
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-4">
                                                                <span
                                                                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                        passed
                                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                                            : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                                                    }`}
                                                                >
                                                                    {passed
                                                                        ? t.passedStatus
                                                                        : t.failedStatus}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                },
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

