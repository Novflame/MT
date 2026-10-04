
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

import HeadOfDepartmentShell from "@/components/head-of-department/HeadOfDepartmentShell"

export default async function HeadOfDepartmentResultsPage() {
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
                    <EmptyAssignment />
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

                    <EmptyResults />
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

    type ResultRow = {
        studentId: string
        studentName: string
        className: string
        grades: number
        average: number
        passRate: number
        status: "Passed" | "Needs Attention"
    }

    const studentMap = new Map<
        string,
        {
            studentId: string
            studentName: string
            className: string
            percentages: number[]
        }
    >()

    for (const grade of relevantGrades) {
        let assessment:
            | typeof departmentTests[number]
            | typeof departmentExams[number]
            | undefined

        if (grade.testId) {
            assessment = testMap.get(
                grade.testId,
            )
        }

        if (grade.examId) {
            assessment = examMap.get(
                grade.examId,
            )
        }

        if (!assessment) {
            continue
        }

        if (
            !grade.enrollment ||
            !grade.enrollment.student ||
            !grade.enrollment.class
        ) {
            continue
        }

        if (assessment.subjectId === undefined) {
            continue
        }

        if (assessment.maxScore <= 0) {
            continue
        }

        const percentage =
            (grade.score /
                assessment.maxScore) *
            100

        const student =
            grade.enrollment.student

        const className =
            grade.enrollment.class.name

        const existing =
            studentMap.get(
                grade.studentEnrollmentId,
            )

        if (existing) {
            existing.percentages.push(
                percentage,
            )
        } else {
            studentMap.set(
                grade.studentEnrollmentId,
                {
                    studentId:
                        student.id,
                    studentName:
                        getStudentName(student),
                    className,
                    percentages: [
                        percentage,
                    ],
                },
            )
        }
    }

    const results: ResultRow[] =
        Array.from(
            studentMap.values(),
        ).map(student => {
            const total =
                student.percentages.reduce(
                    (sum, value) =>
                        sum + value,
                    0,
                )

            const average =
                student.percentages.length >
                0
                    ? total /
                      student.percentages
                          .length
                    : 0

            const passed =
                student.percentages.filter(
                    value =>
                        value >= 50,
                ).length

            const passRate =
                student.percentages.length >
                0
                    ? (passed /
                          student
                              .percentages
                              .length) *
                      100
                    : 0

            return {
                studentId:
                    student.studentId,
                studentName:
                    student.studentName,
                className:
                    student.className,
                grades:
                    student.percentages
                        .length,
                average,
                passRate,
                status:
                    average >= 50
                        ? "Passed"
                        : "Needs Attention",
            }
        })

    results.sort(
        (a, b) =>
            b.average - a.average,
    )

    const totalStudents =
        results.length

    const passedStudents =
        results.filter(
            result =>
                result.status ===
                "Passed",
        ).length

    const attentionStudents =
        results.filter(
            result =>
                result.status ===
                "Needs Attention",
        ).length

    const overallAverage =
        totalStudents > 0
            ? results.reduce(
                  (sum, result) =>
                      sum +
                      result.average,
                  0,
              ) / totalStudents
            : 0

    const overallPassRate =
        totalStudents > 0
            ? (passedStudents /
                  totalStudents) *
              100
            : 0

    const topStudents =
        results.slice(0, 5)

    const needsAttention =
        [...results]
            .sort(
                (a, b) =>
                    a.average -
                    b.average,
            )
            .slice(0, 5)

    const subjectResults =
        departmentSubjects.map(
            subject => {
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

                const percentages: number[] =
                    []

                for (const grade of subjectGrades) {
                    let maxScore = 0

                    if (
                        grade.testId
                    ) {
                        maxScore =
                            testMap.get(
                                grade.testId,
                            )?.maxScore ??
                            0
                    }

                    if (
                        grade.examId
                    ) {
                        maxScore =
                            examMap.get(
                                grade.examId,
                            )?.maxScore ??
                            0
                    }

                    if (
                        maxScore <= 0
                    ) {
                        continue
                    }

                    percentages.push(
                        (grade.score /
                            maxScore) *
                            100,
                    )
                }

                const average =
                    percentages.length >
                    0
                        ? percentages.reduce(
                              (
                                  sum,
                                  value,
                              ) =>
                                  sum +
                                  value,
                              0,
                          ) /
                          percentages.length
                        : 0

                const passed =
                    percentages.filter(
                        value =>
                            value >= 50,
                    ).length

                const passRate =
                    percentages.length >
                    0
                        ? (passed /
                              percentages.length) *
                          100
                        : 0

                return {
                    id: subject.id,
                    name: subject.name,
                    grades:
                        percentages.length,
                    average,
                    passRate,
                }
            },
        )

    subjectResults.sort(
        (a, b) =>
            b.average - a.average,
    )

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

                {/* Overview */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Students"
                        value={
                            totalStudents
                        }
                        description="Students with results"
                    />

                    <StatCard
                        label="Passed"
                        value={
                            passedStudents
                        }
                        description="Students at 50% or above"
                    />

                    <StatCard
                        label="Average"
                        value={`${overallAverage.toFixed(1)}%`}
                        description="Department average"
                    />

                    <StatCard
                        label="Pass Rate"
                        value={`${overallPassRate.toFixed(1)}%`}
                        description="Overall student pass rate"
                    />
                </section>

                {/* Result status */}
                <section className="grid gap-6 lg:grid-cols-3">
                    <InfoCard
                        title="Passed Students"
                        value={
                            passedStudents
                        }
                        description={`${overallPassRate.toFixed(1)}% of students`}
                        tone="success"
                    />

                    <InfoCard
                        title="Needs Attention"
                        value={
                            attentionStudents
                        }
                        description="Students below 50%"
                        tone="warning"
                    />

                    <InfoCard
                        title="Assessments"
                        value={
                            departmentTests.length +
                            departmentExams.length
                        }
                        description={`${departmentTests.length} tests · ${departmentExams.length} exams`}
                        tone="neutral"
                    />
                </section>

                {/* Performance overview */}
                <section className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <h2 className="text-lg font-bold text-slate-900">
                                Top Students
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Highest overall academic averages.
                            </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {topStudents.map(
                                (
                                    student,
                                    index,
                                ) => (
                                    <StudentResultRow
                                        key={
                                            student.studentId
                                        }
                                        student={
                                            student
                                        }
                                        rank={
                                            index +
                                            1
                                        }
                                    />
                                ),
                            )}

                            {topStudents.length ===
                                0 && (
                                <EmptyList />
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <h2 className="text-lg font-bold text-slate-900">
                                Needs Attention
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Students with the lowest averages.
                            </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {needsAttention.map(
                                (
                                    student,
                                    index,
                                ) => (
                                    <StudentResultRow
                                        key={
                                            student.studentId
                                        }
                                        student={
                                            student
                                        }
                                        rank={
                                            index +
                                            1
                                        }
                                    />
                                ),
                            )}

                            {needsAttention.length ===
                                0 && (
                                <EmptyList />
                            )}
                        </div>
                    </section>
                </section>

                {/* Subject results */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <h2 className="text-lg font-bold text-slate-900">
                            Results by Subject
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Department-wide results across every subject.
                        </p>
                    </div>

                    <div className="space-y-6 p-6">
                        {subjectResults.map(
                            subject => (
                                <div
                                    key={
                                        subject.id
                                    }
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {
                                                    subject.name
                                                }
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                {
                                                    subject.grades
                                                }{" "}
                                                graded entries
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-bold text-slate-900">
                                                {subject.average.toFixed(
                                                    1,
                                                )}
                                                %
                                            </p>

                                            <p className="text-xs text-slate-400">
                                                {
                                                    subject.passRate.toFixed(
                                                        1,
                                                    )
                                                }
                                                % pass
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
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
                                </div>
                            ),
                        )}

                        {subjectResults.length ===
                            0 && (
                            <EmptyList />
                        )}
                    </div>
                </section>

                {/* Complete results */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <h2 className="text-lg font-bold text-slate-900">
                            Student Results
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Complete department result summary.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-190 text-left">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">
                                        #
                                    </th>

                                    <th className="px-6 py-4">
                                        Student
                                    </th>

                                    <th className="px-6 py-4">
                                        Class
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

                                    <th className="px-6 py-4">
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {results.map(
                                    (
                                        result,
                                        index,
                                    ) => (
                                        <tr
                                            key={
                                                result.studentId
                                            }
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {index +
                                                    1}
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        result.studentName
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {
                                                    result.className
                                                }
                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {
                                                    result.grades
                                                }
                                            </td>

                                            <td className="px-6 py-4">
                                                <ScoreBadge
                                                    value={
                                                        result.average
                                                    }
                                                />
                                            </td>

                                            <td className="px-6 py-4">
                                                <ScoreBadge
                                                    value={
                                                        result.passRate
                                                    }
                                                />
                                            </td>

                                            <td className="px-6 py-4">
                                                <StatusBadge
                                                    status={
                                                        result.status
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ),
                                )}

                                {results.length ===
                                    0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                7
                                            }
                                            className="px-6 py-12 text-center text-sm text-slate-500"
                                        >
                                            No student results
                                            are available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
                        Results
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Department-wide student results and academic standing.
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

function InfoCard({
    title,
    value,
    description,
    tone,
}: {
    title: string
    value: string | number
    description: string
    tone: "success" | "warning" | "neutral"
}) {
    const styles =
        tone === "success"
            ? "border-emerald-200 bg-emerald-50"
            : tone === "warning"
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-white"

    const valueColor =
        tone === "success"
            ? "text-emerald-800"
            : tone === "warning"
              ? "text-amber-800"
              : "text-slate-900"

    return (
        <div
            className={`rounded-2xl border p-6 shadow-sm ${styles}`}
        >
            <p className="text-sm font-semibold text-slate-600">
                {title}
            </p>

            <p
                className={`mt-3 text-3xl font-bold ${valueColor}`}
            >
                {value}
            </p>

            <p className="mt-1 text-xs text-slate-500">
                {description}
            </p>
        </div>
    )
}

function StudentResultRow({
    student,
    rank,
}: {
    student: {
        studentId: string
        studentName: string
        className: string
        grades: number
        average: number
        passRate: number
        status:
            | "Passed"
            | "Needs Attention"
    }
    rank: number
}) {
    return (
        <div className="flex items-center gap-4 px-6 py-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                {rank}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                    {student.studentName}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    {student.className} ·{" "}
                    {student.grades} grades
                </p>
            </div>

            <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-slate-900">
                    {student.average.toFixed(
                        1,
                    )}
                    %
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    {student.passRate.toFixed(
                        1,
                    )}
                    % pass
                </p>
            </div>
        </div>
    )
}

function ScoreBadge({
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

function StatusBadge({
    status,
}: {
    status:
        | "Passed"
        | "Needs Attention"
}) {
    return (
        <span
            className={
                status === "Passed"
                    ? "inline-flex rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                    : "inline-flex rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700"
            }
        >
            {status}
        </span>
    )
}

function EmptyAssignment() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
                Head of Department
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Results
            </h1>

            <p className="mt-3 text-sm text-slate-500">
                You are not assigned to a department for the active
                academic year.
            </p>
        </div>
    )
}

function EmptyResults() {
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

function EmptyList() {
    return (
        <div className="px-6 py-10 text-center text-sm text-slate-500">
            No result data is available.
        </div>
    )
}

function getStudentName(student: {
    firstName: string
    middleName: string
    lastName: string
}) {
    return [
        student.firstName,
        student.middleName,
        student.lastName,
    ]
        .filter(Boolean)
        .join(" ")
}

