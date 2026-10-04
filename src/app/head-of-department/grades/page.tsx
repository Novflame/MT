
import { and, eq, inArray } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"

import {
    departmentHeads,
    subjects,
    tests,
    exams,
    
} from "@/db/schema"

import HeadOfDepartmentShell
    from "@/components/head-of-department/HeadOfDepartmentShell"

export default async function HeadOfDepartmentGradesPage() {
    const session = await requireSession()

    if (session.user.schoolRole !== "head_of_department") {
        redirect("/")
    }

    const db = await getSchoolDB()
    const academicYear = await getActiveAcademicYear()

    const departmentHead =
        await db.query.departmentHeads.findFirst({
            where: and(
                eq(
                    departmentHeads.userId,
                    session.user.id,
                ),
                eq(
                    departmentHeads.academicYearId,
                    academicYear.id,
                ),
            ),
            with: {
                department: true,
            },
        })

    if (!departmentHead) {
        return (
            <HeadOfDepartmentShell>
                <main className="mx-auto max-w-7xl">
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">
                            Head of Department
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-slate-900">
                            Grades
                        </h1>

                        <p className="mt-3 text-sm text-slate-500">
                            You are not assigned to a department
                            for the active academic year.
                        </p>
                    </div>
                </main>
            </HeadOfDepartmentShell>
        )
    }

    const departmentSubjects =
        await db.query.subjects.findMany({
            where: eq(
                subjects.departmentId,
                departmentHead.departmentId,
            ),
            orderBy: (subjects, { asc }) => [
                asc(subjects.name),
            ],
        })

    const subjectIds =
        departmentSubjects.map(
            subject => subject.id,
        )

    if (subjectIds.length === 0) {
        return (
            <HeadOfDepartmentShell>
                <main className="mx-auto max-w-7xl space-y-6">
                    <Header
                        departmentName={
                            departmentHead.department.name
                        }
                        academicYear={
                            academicYear.name
                        }
                    />

                    <EmptyState />
                </main>
            </HeadOfDepartmentShell>
        )
    }

    const [
        departmentTests,
        departmentExams,
        departmentGrades,
    ] = await Promise.all([
        db.query.tests.findMany({
            where: and(
                eq(
                    tests.academicYearId,
                    academicYear.id,
                ),
                inArray(
                    tests.subjectId,
                    subjectIds,
                ),
            ),
            with: {
                subject: true,
                class: true,
            },
            orderBy: (tests, { desc }) => [
                desc(tests.testDate),
            ],
        }),

        db.query.exams.findMany({
            where: and(
                eq(
                    exams.academicYearId,
                    academicYear.id,
                ),
                inArray(
                    exams.subjectId,
                    subjectIds,
                ),
            ),
            with: {
                subject: true,
                class: true,
            },
            orderBy: (exams, { desc }) => [
                desc(exams.examDate),
            ],
        }),

        db.query.grades.findMany({
            with: {
                enrollment: {
                    with: {
                        student: true,
                        class: true,
                    },
                },
                test: {
                    with: {
                        subject: true,
                        class: true,
                    },
                },
                exam: {
                    with: {
                        subject: true,
                        class: true,
                    },
                },
            },
        }),
    ])

    const testMap = new Map(
        departmentTests.map(test => [
            test.id,
            test,
        ]),
    )

    const examMap = new Map(
        departmentExams.map(exam => [
            exam.id,
            exam,
        ]),
    )

    const relevantGrades =
        departmentGrades.filter(
            grade => {
                if (grade.testId) {
                    return testMap.has(
                        grade.testId,
                    )
                }

                if (grade.examId) {
                    return examMap.has(
                        grade.examId,
                    )
                }

                return false
            },
        )

    const subjectRows =
        departmentSubjects.map(
            subject => {
                const subjectTests =
                    departmentTests.filter(
                        test =>
                            test.subjectId ===
                            subject.id,
                    )

                const subjectExams =
                    departmentExams.filter(
                        exam =>
                            exam.subjectId ===
                            subject.id,
                    )

                const subjectGrades =
                    relevantGrades.filter(
                        grade => {
                            if (
                                grade.testId
                            ) {
                                return (
                                    testMap.get(
                                        grade.testId,
                                    )
                                        ?.subjectId ===
                                    subject.id
                                )
                            }

                            if (
                                grade.examId
                            ) {
                                return (
                                    examMap.get(
                                        grade.examId,
                                    )
                                        ?.subjectId ===
                                    subject.id
                                )
                            }

                            return false
                        },
                    )

                let totalPercentage = 0
                let passed = 0
                let validGrades = 0

                for (const grade of subjectGrades) {
                    let maxScore = 0

                    if (grade.testId) {
                        maxScore =
                            testMap.get(
                                grade.testId,
                            )?.maxScore ?? 0
                    }

                    if (grade.examId) {
                        maxScore =
                            examMap.get(
                                grade.examId,
                            )?.maxScore ?? 0
                    }

                    if (maxScore <= 0) {
                        continue
                    }

                    const percentage =
                        (grade.score /
                            maxScore) *
                        100

                    totalPercentage +=
                        percentage

                    validGrades++

                    if (
                        percentage >=
                        50
                    ) {
                        passed++
                    }
                }

                const average =
                    validGrades > 0
                        ? totalPercentage /
                          validGrades
                        : 0

                const passRate =
                    validGrades > 0
                        ? (passed /
                              validGrades) *
                          100
                        : 0

                const studentIds =
                    new Set(
                        subjectGrades.map(
                            grade =>
                                grade
                                    .studentEnrollmentId,
                        ),
                    )

                return {
                    id: subject.id,
                    name: subject.name,
                    testCount:
                        subjectTests.length,
                    examCount:
                        subjectExams.length,
                    gradeCount:
                        subjectGrades.length,
                    studentCount:
                        studentIds.size,
                    average,
                    passRate,
                }
            },
        )

    const totalGrades =
        relevantGrades.length

    const studentsWithGrades =
        new Set(
            relevantGrades.map(
                grade =>
                    grade.studentEnrollmentId,
            ),
        ).size

    let totalPercentage = 0
    let validGrades = 0
    let passedGrades = 0

    for (const grade of relevantGrades) {
        let maxScore = 0

        if (grade.testId) {
            maxScore =
                testMap.get(
                    grade.testId,
                )?.maxScore ?? 0
        }

        if (grade.examId) {
            maxScore =
                examMap.get(
                    grade.examId,
                )?.maxScore ?? 0
        }

        if (maxScore <= 0) {
            continue
        }

        const percentage =
            (grade.score / maxScore) *
            100

        totalPercentage += percentage
        validGrades++

        if (percentage >= 50) {
            passedGrades++
        }
    }

    const overallAverage =
        validGrades > 0
            ? totalPercentage /
              validGrades
            : 0

    const overallPassRate =
        validGrades > 0
            ? (passedGrades /
                  validGrades) *
              100
            : 0

    const highestSubject =
        subjectRows.length > 0
            ? subjectRows.reduce(
                  (best, subject) =>
                      subject.average >
                      best.average
                          ? subject
                          : best,
                  subjectRows[0],
              )
            : null

    const lowestSubject =
        subjectRows.length > 0
            ? subjectRows.reduce(
                  (lowest, subject) =>
                      subject.average <
                      lowest.average
                          ? subject
                          : lowest,
                  subjectRows[0],
              )
            : null

    const recentItems = [
        ...departmentTests.map(
            test => ({
                id: `test-${test.id}`,
                type: "Test",
                name: test.name,
                subject:
                    test.subject.name,
                className:
                    test.class.name,
                date: test.testDate,
            }),
        ),
        ...departmentExams.map(
            exam => ({
                id: `exam-${exam.id}`,
                type: "Exam",
                name: exam.name,
                subject:
                    exam.subject.name,
                className:
                    exam.class.name,
                date: exam.examDate,
            }),
        ),
    ]
        .sort((a, b) =>
            b.date.localeCompare(
                a.date,
            ),
        )
        .slice(0, 10)

    return (
        <HeadOfDepartmentShell>
            <main className="mx-auto max-w-7xl space-y-6">
                <Header
                    departmentName={
                        departmentHead.department.name
                    }
                    academicYear={
                        academicYear.name
                    }
                />

                {/* Main statistics */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Graded Entries"
                        value={totalGrades}
                        description="Recorded grades"
                    />

                    <StatCard
                        label="Students"
                        value={
                            studentsWithGrades
                        }
                        description="Students with grades"
                    />

                    <StatCard
                        label="Average"
                        value={`${overallAverage.toFixed(1)}%`}
                        description="Department average"
                    />

                    <StatCard
                        label="Pass Rate"
                        value={`${overallPassRate.toFixed(1)}%`}
                        description="Grades at 50% or above"
                    />
                </section>

                {/* Academic overview */}
                <section className="grid gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">
                            Strongest Subject
                        </p>

                        <p className="mt-3 text-xl font-bold text-slate-900">
                            {highestSubject
                                ?.name ??
                                "—"}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                            {highestSubject
                                ? `${highestSubject.average.toFixed(1)}% average`
                                : "No grades yet"}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">
                            Subject Needing Attention
                        </p>

                        <p className="mt-3 text-xl font-bold text-slate-900">
                            {lowestSubject
                                ?.name ??
                                "—"}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                            {lowestSubject
                                ? `${lowestSubject.average.toFixed(1)}% average`
                                : "No grades yet"}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">
                            Assessment Activity
                        </p>

                        <div className="mt-4 flex gap-3">
                            <div className="flex-1 rounded-xl bg-slate-50 p-4">
                                <p className="text-xs text-slate-400">
                                    Tests
                                </p>

                                <p className="mt-1 text-2xl font-bold text-slate-900">
                                    {
                                        departmentTests.length
                                    }
                                </p>
                            </div>

                            <div className="flex-1 rounded-xl bg-slate-50 p-4">
                                <p className="text-xs text-slate-400">
                                    Exams
                                </p>

                                <p className="mt-1 text-2xl font-bold text-slate-900">
                                    {
                                        departmentExams.length
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Performance bars */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            Subject Performance
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Average academic performance across
                            department subjects.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {subjectRows.map(
                            subject => (
                                <div
                                    key={
                                        subject.id
                                    }
                                >
                                    <div className="mb-2 flex items-center justify-between gap-4">
                                        <span className="truncate text-sm font-semibold text-slate-700">
                                            {
                                                subject.name
                                            }
                                        </span>

                                        <span className="shrink-0 text-sm font-bold text-slate-900">
                                            {subject.average.toFixed(
                                                1,
                                            )}
                                            %
                                        </span>
                                    </div>

                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-900"
                                            style={{
                                                width: `${Math.min(
                                                    Math.max(
                                                        subject.average,
                                                        0,
                                                    ),
                                                    100,
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                        <span>
                                            {
                                                subject.gradeCount
                                            }{" "}
                                            grades
                                        </span>

                                        <span>
                                            {
                                                subject.studentCount
                                            }{" "}
                                            students
                                        </span>

                                        <span>
                                            Pass{" "}
                                            {subject.passRate.toFixed(
                                                1,
                                            )}
                                            %
                                        </span>
                                    </div>
                                </div>
                            ),
                        )}

                        {subjectRows.length ===
                            0 && (
                            <p className="py-8 text-center text-sm text-slate-500">
                                No subject performance
                                data is available.
                            </p>
                        )}
                    </div>
                </section>

                {/* Detailed table */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <h2 className="text-lg font-bold text-slate-900">
                            Grade Summary by Subject
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Detailed academic statistics for every
                            subject.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-190 text-left">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">
                                        Subject
                                    </th>

                                    <th className="px-6 py-4">
                                        Students
                                    </th>

                                    <th className="px-6 py-4">
                                        Tests
                                    </th>

                                    <th className="px-6 py-4">
                                        Exams
                                    </th>

                                    <th className="px-6 py-4">
                                        Grades
                                    </th>

                                    <th className="px-6 py-4">
                                        Average
                                    </th>

                                    <th className="px-6 py-4">
                                        Pass Rate
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {subjectRows.map(
                                    subject => (
                                        <tr
                                            key={
                                                subject.id
                                            }
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-5">
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        subject.name
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-6 py-5 text-sm text-slate-700">
                                                {
                                                    subject.studentCount
                                                }
                                            </td>

                                            <td className="px-6 py-5 text-sm text-slate-700">
                                                {
                                                    subject.testCount
                                                }
                                            </td>

                                            <td className="px-6 py-5 text-sm text-slate-700">
                                                {
                                                    subject.examCount
                                                }
                                            </td>

                                            <td className="px-6 py-5 text-sm text-slate-700">
                                                {
                                                    subject.gradeCount
                                                }
                                            </td>

                                            <td className="px-6 py-5">
                                                <PerformanceBadge
                                                    value={
                                                        subject.average
                                                    }
                                                />
                                            </td>

                                            <td className="px-6 py-5">
                                                <PerformanceBadge
                                                    value={
                                                        subject.passRate
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ),
                                )}

                                {subjectRows.length ===
                                    0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                7
                                            }
                                            className="px-6 py-12 text-center text-sm text-slate-500"
                                        >
                                            No grade data
                                            available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Recent assessments */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <h2 className="text-lg font-bold text-slate-900">
                            Recent Assessments
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Latest tests and exams in the department.
                        </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {recentItems.map(
                            item => (
                                <div
                                    key={
                                        item.id
                                    }
                                    className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={
                                                    item.type ===
                                                    "Exam"
                                                        ? "rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                                                        : "rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                                                }
                                            >
                                                {
                                                    item.type
                                                }
                                            </span>

                                            <span className="font-semibold text-slate-900">
                                                {
                                                    item.name
                                                }
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm text-slate-500">
                                            {
                                                item.subject
                                            }{" "}
                                            ·{" "}
                                            {
                                                item.className
                                            }
                                        </p>
                                    </div>

                                    <span className="shrink-0 text-sm text-slate-400">
                                        {
                                            item.date
                                        }
                                    </span>
                                </div>
                            ),
                        )}

                        {recentItems.length ===
                            0 && (
                            <p className="px-6 py-12 text-center text-sm text-slate-500">
                                No tests or exams found.
                            </p>
                        )}
                    </div>
                </section>
            </main>
        </HeadOfDepartmentShell>
    )
}

function Header({
    departmentName,
    academicYear,
}: {
    departmentName: string
    academicYear: string
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {departmentName}
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                        Grades
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Academic grade performance across your department.
                    </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Academic Year
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                        {academicYear}
                    </p>
                </div>
            </div>
        </section>
    )
}

function StatCard({
    label,
    value,
    description,
}: {
    label: string
    value: string | number
    description: string
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>

            <p className="mt-1 text-xs text-slate-400">
                {description}
            </p>
        </div>
    )
}

function PerformanceBadge({
    value,
}: {
    value: number
}) {
    const className =
        value >= 80
            ? "bg-emerald-50 text-emerald-700"
            : value >= 60
              ? "bg-blue-50 text-blue-700"
              : value >= 50
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"

    return (
        <span
            className={`inline-flex rounded-lg px-3 py-1.5 text-sm font-semibold ${className}`}
        >
            {value.toFixed(1)}%
        </span>
    )
}

function EmptyState() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">
                No subjects found
            </p>

            <p className="mt-2 text-sm text-slate-500">
                There are currently no subjects assigned to this
                department.
            </p>
        </div>
    )
}

