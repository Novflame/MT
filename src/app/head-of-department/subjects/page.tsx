
import { and, eq, inArray } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"

import {
    departmentHeads,
    subjects,
    teacherAssignments,
} from "@/db/schema"

import HeadOfDepartmentShell
    from "@/components/head-of-department/HeadOfDepartmentShell"

export default async function HeadOfDepartmentSubjectsPage() {
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
                            Subjects
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

    const departmentId = departmentHead.departmentId

    const departmentSubjects =
        await db.query.subjects.findMany({
            where: eq(
                subjects.departmentId,
                departmentId,
            ),
            orderBy: (subjects, { asc }) => [
                asc(subjects.name),
            ],
        })

    const subjectIds = departmentSubjects.map(
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
                        academicYear={academicYear.name}
                    />

                    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                        <p className="text-lg font-semibold text-slate-900">
                            No subjects found
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                            There are currently no subjects assigned
                            to this department.
                        </p>
                    </div>
                </main>
            </HeadOfDepartmentShell>
        )
    }

    const [
        assignments,
        tests,
        exams,
        allGrades,
    ] = await Promise.all([
        db.query.teacherAssignments.findMany({
            where: and(
                eq(
                    teacherAssignments.academicYearId,
                    academicYear.id,
                ),
                inArray(
                    teacherAssignments.subjectId,
                    subjectIds,
                ),
            ),
            with: {
                subject: true,
                class: true,
            },
        }),

        db.query.tests.findMany({
            where: and(
                eq(
                    db._.fullSchema.tests.academicYearId,
                    academicYear.id,
                ),
                inArray(
                    db._.fullSchema.tests.subjectId,
                    subjectIds,
                ),
            ),
        }),

        db.query.exams.findMany({
            where: and(
                eq(
                    db._.fullSchema.exams.academicYearId,
                    academicYear.id,
                ),
                inArray(
                    db._.fullSchema.exams.subjectId,
                    subjectIds,
                ),
            ),
        }),

        db.query.grades.findMany({
            with: {
                test: true,
                exam: true,
            },
        }),
    ])

    const testMap = new Map(
        tests.map(test => [
            test.id,
            test,
        ]),
    )

    const examMap = new Map(
        exams.map(exam => [
            exam.id,
            exam,
        ]),
    )

    const subjectRows = departmentSubjects.map(
        subject => {
            const subjectAssignments =
                assignments.filter(
                    assignment =>
                        assignment.subjectId ===
                        subject.id,
                )

            const subjectTests =
                tests.filter(
                    test =>
                        test.subjectId ===
                        subject.id,
                )

            const subjectExams =
                exams.filter(
                    exam =>
                        exam.subjectId ===
                        subject.id,
                )

            const subjectGrades =
                allGrades.filter(grade => {
                    if (grade.testId) {
                        const test =
                            testMap.get(
                                grade.testId,
                            )

                        return (
                            test?.subjectId ===
                                subject.id &&
                            test.academicYearId ===
                                academicYear.id
                        )
                    }

                    if (grade.examId) {
                        const exam =
                            examMap.get(
                                grade.examId,
                            )

                        return (
                            exam?.subjectId ===
                                subject.id &&
                            exam.academicYearId ===
                                academicYear.id
                        )
                    }

                    return false
                })

            const teacherIds = new Set(
                subjectAssignments.map(
                    assignment =>
                        assignment.teacherId,
                ),
            )

            const classIds = new Set(
                subjectAssignments.map(
                    assignment =>
                        assignment.classId,
                ),
            )

            let totalPercentage = 0
            let passedCount = 0

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
                    (grade.score / maxScore) * 100

                totalPercentage += percentage

                if (percentage >= 50) {
                    passedCount++
                }
            }

            const averagePercentage =
                subjectGrades.length > 0
                    ? totalPercentage /
                      subjectGrades.length
                    : 0

            const passRate =
                subjectGrades.length > 0
                    ? (passedCount /
                          subjectGrades.length) *
                      100
                    : 0

            return {
                id: subject.id,
                name: subject.name,

                teacherCount:
                    teacherIds.size,

                classCount:
                    classIds.size,

                assignmentCount:
                    subjectAssignments.length,

                testCount:
                    subjectTests.length,

                examCount:
                    subjectExams.length,

                gradeCount:
                    subjectGrades.length,

                averagePercentage,

                passRate,
            }
        },
    )

    const totalTeachers = new Set(
        assignments.map(
            assignment =>
                assignment.teacherId,
        ),
    ).size

    const totalClasses = new Set(
        assignments.map(
            assignment =>
                assignment.classId,
        ),
    ).size

    const totalAssignments =
        assignments.length

    const totalTests = tests.length
    const totalExams = exams.length

    const totalGrades =
        subjectRows.reduce(
            (total, subject) =>
                total + subject.gradeCount,
            0,
        )

    const gradedSubjects =
        subjectRows.filter(
            subject =>
                subject.gradeCount > 0,
        )

    const overallAverage =
        gradedSubjects.length > 0
            ? gradedSubjects.reduce(
                  (total, subject) =>
                      total +
                      subject.averagePercentage,
                  0,
              ) /
              gradedSubjects.length
            : 0

    const overallPassRate =
        gradedSubjects.length > 0
            ? gradedSubjects.reduce(
                  (total, subject) =>
                      total +
                      subject.passRate,
                  0,
              ) /
              gradedSubjects.length
            : 0

    return (
        <HeadOfDepartmentShell>
            <main className="mx-auto max-w-7xl space-y-6">
                <Header
                    departmentName={
                        departmentHead.department.name
                    }
                    academicYear={academicYear.name}
                />

                {/* KPI */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Subjects"
                        value={subjectRows.length}
                        description="Department subjects"
                    />

                    <StatCard
                        label="Teachers"
                        value={totalTeachers}
                        description="Assigned teachers"
                    />

                    <StatCard
                        label="Classes"
                        value={totalClasses}
                        description="Classes covered"
                    />

                    <StatCard
                        label="Assignments"
                        value={totalAssignments}
                        description="Teaching assignments"
                    />
                </section>

                {/* Academic statistics */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Tests"
                        value={totalTests}
                        description="Tests this year"
                    />

                    <StatCard
                        label="Exams"
                        value={totalExams}
                        description="Exams this year"
                    />

                    <StatCard
                        label="Graded Entries"
                        value={totalGrades}
                        description="Recorded grades"
                    />

                    <StatCard
                        label="Overall Average"
                        value={`${overallAverage.toFixed(1)}%`}
                        description={`${overallPassRate.toFixed(1)}% pass rate`}
                    />
                </section>

                {/* Charts */}
                <section className="grid gap-6 lg:grid-cols-2">
                    <SubjectPerformanceChart
                        subjects={subjectRows}
                    />

                    <SubjectCoverageChart
                        subjects={subjectRows}
                    />
                </section>

                {/* Detailed table */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <h2 className="text-lg font-bold text-slate-900">
                            Subject Overview
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Academic activity and performance across
                            all subjects in the department.
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
                                        Teachers
                                    </th>

                                    <th className="px-6 py-4">
                                        Classes
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
                                            key={subject.id}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-5">
                                                <p className="font-semibold text-slate-900">
                                                    {subject.name}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {
                                                        subject.assignmentCount
                                                    }{" "}
                                                    assignments
                                                </p>
                                            </td>

                                            <td className="px-6 py-5">
                                                {subject.teacherCount}
                                            </td>

                                            <td className="px-6 py-5">
                                                {subject.classCount}
                                            </td>

                                            <td className="px-6 py-5">
                                                {subject.testCount}
                                            </td>

                                            <td className="px-6 py-5">
                                                {subject.examCount}
                                            </td>

                                            <td className="px-6 py-5">
                                                {subject.gradeCount}
                                            </td>

                                            <td className="px-6 py-5">
                                                <PerformanceBadge
                                                    value={
                                                        subject.averagePercentage
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

                                {subjectRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-6 py-12 text-center text-sm text-slate-500"
                                        >
                                            No subject data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Subject cards */}
                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-slate-900">
                            Subject Performance
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Detailed academic snapshot for each subject.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {subjectRows.map(
                            subject => (
                                <SubjectCard
                                    key={subject.id}
                                    subject={subject}
                                />
                            ),
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
                        Subjects
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Academic overview and performance of all
                        department subjects.
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

function SubjectPerformanceChart({
    subjects,
}: {
    subjects: {
        id: string
        name: string
        averagePercentage: number
        passRate: number
    }[]
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                    Subject Performance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Average score and pass rate as percentages for each subject. Compare the displayed values; bars show the average score.
                </p>
            </div>

            {subjects.length > 0 ? (
            <div className="space-y-5">
                {subjects.map(subject => (
                    <div key={subject.id}>
                        <div className="mb-2 flex items-start justify-between gap-4">
                            <span className="min-w-0 break-words text-sm font-semibold text-slate-700">
                                {subject.name}
                            </span>

                            <span className="min-w-0 break-words text-right text-sm font-bold text-slate-900">
                                Average score: {subject.averagePercentage}%
                            </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                            <div
                                className="h-full rounded-full bg-slate-900"
                                style={{
                                    width: `${Math.min(
                                        Math.max(
                                            subject.averagePercentage,
                                            0,
                                        ),
                                        100,
                                    )}%`,
                                }}
                            />
                        </div>

                        <div className="mt-1 flex justify-end">
                            <span className="text-sm text-slate-600">
                                Pass rate: {subject.passRate}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            ) : (
                <p className="text-sm text-slate-600" role="status">
                    No subject performance data available.
                </p>
            )}
        </section>
    )
}

function SubjectCoverageChart({
    subjects,
}: {
    subjects: {
        id: string
        name: string
        teacherCount: number
        classCount: number
        assignmentCount: number
    }[]
}) {
    const maxAssignments = Math.max(
        ...subjects.map(
            subject =>
                subject.assignmentCount,
        ),
        1,
    )

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                    Subject Coverage
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Teaching assignments, teachers, and classes per subject. Bar lengths compare assignment counts; exact counts are shown beside each subject.
                </p>
            </div>

            {subjects.length > 0 ? (
            <div className="space-y-5">
                {subjects.map(subject => (
                    <div key={subject.id}>
                        <div className="mb-2 flex items-start justify-between gap-4">
                            <span className="min-w-0 break-words text-sm font-semibold text-slate-700">
                                {subject.name}
                            </span>

                            <span className="min-w-0 break-words text-right text-sm font-bold text-slate-900">
                                Assignments: {subject.assignmentCount}
                            </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                            <div
                                className="h-full rounded-full bg-slate-500"
                                style={{
                                    width: `${
                                        (subject.assignmentCount /
                                            maxAssignments) *
                                        100
                                    }%`,
                                }}
                            />
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                            <span>
                                Teachers: {subject.teacherCount}
                            </span>

                            <span>
                                Classes: {subject.classCount}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            ) : (
                <p className="text-sm text-slate-600" role="status">
                    No subject coverage data available.
                </p>
            )}
        </section>
    )
}

function PerformanceBadge({
    value,
}: {
    value: number
}) {
    const rounded = value.toFixed(1)

    return (
        <span
            className={
                value >= 80
                    ? "inline-flex rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                    : value >= 60
                      ? "inline-flex rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700"
                      : value >= 50
                        ? "inline-flex rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700"
                        : "inline-flex rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700"
            }
        >
            {rounded}%
        </span>
    )
}

function SubjectCard({
    subject,
}: {
    subject: {
        name: string
        teacherCount: number
        classCount: number
        assignmentCount: number
        testCount: number
        examCount: number
        gradeCount: number
        averagePercentage: number
        passRate: number
    }
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-bold text-slate-900">
                        {subject.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                        {subject.assignmentCount} teaching assignments
                    </p>
                </div>

                <PerformanceBadge
                    value={subject.averagePercentage}
                />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniStat
                    label="Teachers"
                    value={subject.teacherCount}
                />

                <MiniStat
                    label="Classes"
                    value={subject.classCount}
                />

                <MiniStat
                    label="Tests"
                    value={subject.testCount}
                />

                <MiniStat
                    label="Exams"
                    value={subject.examCount}
                />
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                        Pass rate
                    </span>

                    <span className="font-semibold text-slate-900">
                        {subject.passRate.toFixed(1)}%
                    </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-slate-900"
                        style={{
                            width: `${Math.min(
                                Math.max(
                                    subject.passRate,
                                    0,
                                ),
                                100,
                            )}%`,
                        }}
                    />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                    {subject.gradeCount} graded entries
                </p>
            </div>
        </article>
    )
}

function MiniStat({
    label,
    value,
}: {
    label: string
    value: number
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">
                {value}
            </p>
        </div>
    )
}
