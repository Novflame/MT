
import Link from "next/link"
import { redirect } from "next/navigation"
import {
    and,
    eq,
    inArray,
} from "drizzle-orm"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import {
    departmentHeads,
    exams,
    subjects,
    teacherAssignments,
    tests,
    studentEnrollments,
} from "@/db/schema"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"

export default async function HeadOfDepartmentPage() {
    const session = await requireSession()

    if (
        session.user.schoolRole !==
        "head_of_department"
    ) {
        redirect("/dashboard")
    }

    const db = await getSchoolDB()

    const academicYear =
        await db.query.academicYears.findFirst({
            where: (year, { eq }) =>
                eq(year.isActive, true),
        })

    if (!academicYear) {
        return (
            <Message>
                No active academic year is configured.
            </Message>
        )
    }

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
            <Message>
                You are not assigned to a department
                for the active academic year.
            </Message>
        )
    }

    const departmentId =
        departmentHead.departmentId

    const departmentSubjects =
        await db.query.subjects.findMany({
            where: eq(
                subjects.departmentId,
                departmentId,
            ),
            orderBy: (subject, { asc }) =>
                asc(subject.name),
        })

    const subjectIds =
        departmentSubjects.map(
            (subject) => subject.id,
        )

    if (subjectIds.length === 0) {
        return (
            <Message>
                No subjects are assigned to your
                department yet.
            </Message>
        )
    }

    const assignments =
        await db.query.teacherAssignments.findMany({
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
        })

    const teacherIds = [
        ...new Set(
            assignments.map(
                (assignment) =>
                    assignment.teacherId,
            ),
        ),
    ]

    const teachers =
        teacherIds.length > 0
            ? await centralDb
                  .select({
                      id: user.id,
                      name: user.name,
                      email: user.email,
                  })
                  .from(user)
                  .where(
                      and(
                          eq(
                              user.schoolId,
                              session.user.schoolId,
                          ),
                          inArray(
                              user.id,
                              teacherIds,
                          ),
                      ),
                  )
            : []

    const enrollments =
        await db.query.studentEnrollments.findMany({
            where: eq(
                studentEnrollments.academicYearId,
                academicYear.id,
            ),
            with: {
                class: true,
            },
        })

    const departmentClassIds = [
        ...new Set(
            assignments.map(
                (assignment) =>
                    assignment.classId,
            ),
        ),
    ]

    const departmentStudents =
        enrollments.filter((enrollment) =>
            departmentClassIds.includes(
                enrollment.classId,
            ),
        )

    const departmentExams =
        await db.query.exams.findMany({
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
            orderBy: (exam, { desc }) =>
                desc(exam.examDate),
        })

    const departmentTests =
        await db.query.tests.findMany({
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
            orderBy: (test, { desc }) =>
                desc(test.testDate),
        })

    const allGrades =
        await db.query.grades.findMany({
            with: {
                enrollment: {
                    with: {
                        student: true,
                        class: true,
                    },
                },
                exam: {
                    with: {
                        subject: true,
                        class: true,
                    },
                },
                test: {
                    with: {
                        subject: true,
                        class: true,
                    },
                },
            },
        })

    const departmentGrades =
        allGrades.filter((grade) => {
            if (grade.exam) {
                return (
                    grade.exam.academicYearId ===
                        academicYear.id &&
                    subjectIds.includes(
                        grade.exam.subjectId,
                    )
                )
            }

            if (grade.test) {
                return (
                    grade.test.academicYearId ===
                        academicYear.id &&
                    subjectIds.includes(
                        grade.test.subjectId,
                    )
                )
            }

            return false
        })

    /*
     * --------------------------------------------------
     * Dashboard calculations
     * --------------------------------------------------
     */

    const totalTeachers = teachers.length
    const totalSubjects =
        departmentSubjects.length
    const totalAssignments =
        assignments.length
    const totalStudents =
        departmentStudents.length

    const totalAssessments =
        departmentExams.length +
        departmentTests.length

    const gradedEntries =
        departmentGrades.length

    const percentages =
        departmentGrades
            .map((grade) => {
                const maxScore =
                    grade.exam?.maxScore ??
                    grade.test?.maxScore ??
                    0

                if (maxScore <= 0) {
                    return null
                }

                return (
                    (grade.score / maxScore) *
                    100
                )
            })
            .filter(
                (
                    value,
                ): value is number =>
                    value !== null,
            )

    const overallAverage =
        percentages.length > 0
            ? percentages.reduce(
                  (sum, value) =>
                      sum + value,
                  0,
              ) / percentages.length
            : 0

    const passedCount =
        percentages.filter(
            (value) => value >= 50,
        ).length

    const passRate =
        percentages.length > 0
            ? (passedCount /
                  percentages.length) *
              100
            : 0

    /*
     * Subject performance
     */

    const subjectPerformance =
        departmentSubjects.map(
            (subject) => {
                const subjectGrades =
                    departmentGrades.filter(
                        (grade) =>
                            grade.exam
                                ?.subjectId ===
                                subject.id ||
                            grade.test
                                ?.subjectId ===
                                subject.id,
                    )

                const values =
                    subjectGrades
                        .map((grade) => {
                            const maxScore =
                                grade.exam
                                    ?.maxScore ??
                                grade.test
                                    ?.maxScore ??
                                0

                            if (
                                maxScore <= 0
                            ) {
                                return null
                            }

                            return (
                                (grade.score /
                                    maxScore) *
                                100
                            )
                        })
                        .filter(
                            (
                                value,
                            ): value is number =>
                                value !==
                                null,
                        )

                const average =
                    values.length > 0
                        ? values.reduce(
                              (
                                  sum,
                                  value,
                              ) =>
                                  sum +
                                  value,
                              0,
                          ) /
                          values.length
                        : 0

                return {
                    id: subject.id,
                    name: subject.name,
                    average,
                    grades:
                        values.length,
                    exams:
                        departmentExams.filter(
                            (exam) =>
                                exam.subjectId ===
                                subject.id,
                        ).length,
                    tests:
                        departmentTests.filter(
                            (test) =>
                                test.subjectId ===
                                subject.id,
                        ).length,
                }
            },
        )

    /*
     * Teacher workload
     */

    const teacherWorkload =
        teachers
            .map((teacher) => {
                const teacherAssignments =
                    assignments.filter(
                        (assignment) =>
                            assignment.teacherId ===
                            teacher.id,
                    )

                return {
                    id: teacher.id,
                    name: teacher.name,
                    assignments:
                        teacherAssignments.length,
                }
            })
            .sort(
                (a, b) =>
                    b.assignments -
                    a.assignments,
            )
            .slice(0, 6)

    /*
     * Recent activity
     */

    const recentAssessments = [
        ...departmentExams.map((exam) => ({
            id: `exam-${exam.id}`,
            name: exam.name,
            subject:
                exam.subject.name,
            className:
                exam.class.name,
            type: exam.type,
            date: exam.examDate,
            kind: "Exam" as const,
        })),
        ...departmentTests.map((test) => ({
            id: `test-${test.id}`,
            name: test.name,
            subject:
                test.subject.name,
            className:
                test.class.name,
            type: "TEST",
            date: test.testDate,
            kind: "Test" as const,
        })),
    ]
        .sort((a, b) =>
            b.date.localeCompare(a.date),
        )
        .slice(0, 6)

    return (
        <div className="space-y-6">
            {/* HEADER */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500">
                            Head of Department
                        </p>

                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                            {
                                departmentHead
                                    .department
                                    .name
                            }
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Department academic
                            overview and performance
                            management.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/head-of-department/teachers"
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Teachers
                        </Link>

                        <Link
                            href="/head-of-department/subjects"
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Subjects
                        </Link>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                        label="Academic Year"
                        value={
                            academicYear.name
                        }
                    />

                    <Info
                        label="Teachers"
                        value={totalTeachers.toString()}
                    />

                    <Info
                        label="Subjects"
                        value={totalSubjects.toString()}
                    />

                    <Info
                        label="Students"
                        value={totalStudents.toString()}
                    />
                </div>
            </section>

            {/* KPI CARDS */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardCard
                    href="/head-of-department/teachers"
                    label="Teachers"
                    value={totalTeachers}
                    detail="Department teachers"
                />

                <DashboardCard
                    href="/head-of-department/subjects"
                    label="Subjects"
                    value={totalSubjects}
                    detail="Department subjects"
                />

                <DashboardCard
                    href="/head-of-department/assignments"
                    label="Assignments"
                    value={totalAssignments}
                    detail="Teaching assignments"
                />

                <DashboardCard
                    href="/head-of-department/grades"
                    label="Graded Entries"
                    value={gradedEntries}
                    detail={`${totalStudents} students`}
                />
            </section>

            {/* ACADEMIC OVERVIEW */}

            <section className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Academic Performance
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Overall department
                                assessment performance.
                            </p>
                        </div>

                        <Link
                            href="/head-of-department/performance"
                            className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                            View performance
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <StatBox
                            label="Average"
                            value={`${overallAverage.toFixed(
                                1,
                            )}%`}
                        />

                        <StatBox
                            label="Pass Rate"
                            value={`${passRate.toFixed(
                                1,
                            )}%`}
                        />

                        <StatBox
                            label="Assessments"
                            value={totalAssessments.toString()}
                        />
                    </div>

                    <div className="mt-6 space-y-5">
                        {subjectPerformance.map(
                            (subject) => (
                                <div
                                    key={
                                        subject.id
                                    }
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {
                                                    subject.name
                                                }
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                {
                                                    subject.exams
                                                }{" "}
                                                exams ·{" "}
                                                {
                                                    subject.tests
                                                }{" "}
                                                tests ·{" "}
                                                {
                                                    subject.grades
                                                }{" "}
                                                graded
                                            </p>
                                        </div>

                                        <span className="text-sm font-bold text-slate-900">
                                            {subject.average.toFixed(
                                                1,
                                            )}
                                            %
                                        </span>
                                    </div>

                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-900"
                                            style={{
                                                width: `${Math.min(
                                                    subject.average,
                                                    100,
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                </div>

                {/* QUICK ACTIONS */}

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                        Quick Access
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Jump directly to department
                        management areas.
                    </p>

                    <div className="mt-5 space-y-2">
                        <QuickLink
                            href="/head-of-department/teachers"
                            title="Teachers"
                            description="View teaching staff"
                        />

                        <QuickLink
                            href="/head-of-department/subjects"
                            title="Subjects"
                            description="View department subjects"
                        />

                        <QuickLink
                            href="/head-of-department/assignments"
                            title="Assignments"
                            description="Review teacher workload"
                        />

                        <QuickLink
                            href="/head-of-department/tests"
                            title="Tests"
                            description="Monitor continuous assessment"
                        />

                        <QuickLink
                            href="/head-of-department/exams"
                            title="Exams"
                            description="Monitor examinations"
                        />

                        <QuickLink
                            href="/head-of-department/results"
                            title="Results"
                            description="Review student results"
                        />
                    </div>
                </div>
            </section>

            {/* TEACHERS + ASSESSMENTS */}

            <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Teacher Workload
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Assignment distribution.
                            </p>
                        </div>

                        <Link
                            href="/head-of-department/assignments"
                            className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                            All assignments
                        </Link>
                    </div>

                    <div className="mt-6 space-y-5">
                        {teacherWorkload.map(
                            (teacher) => {
                                const maxWorkload =
                                    Math.max(
                                        ...teacherWorkload.map(
                                            (
                                                item,
                                            ) =>
                                                item.assignments,
                                        ),
                                        1,
                                    )

                                return (
                                    <div
                                        key={
                                            teacher.id
                                        }
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {
                                                    teacher.name
                                                }
                                            </p>

                                            <span className="text-xs font-bold text-slate-500">
                                                {
                                                    teacher.assignments
                                                }
                                            </span>
                                        </div>

                                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-slate-700"
                                                style={{
                                                    width: `${(teacher.assignments /
                                                        maxWorkload) *
                                                        100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )
                            },
                        )}

                        {teacherWorkload.length ===
                            0 && (
                            <Empty text="No teacher assignments found." />
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Recent Assessments
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Latest tests and exams.
                            </p>
                        </div>

                        <Link
                            href="/head-of-department/exams"
                            className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                            View exams
                        </Link>
                    </div>

                    <div className="mt-5 divide-y divide-slate-100">
                        {recentAssessments.map(
                            (item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-4 py-4"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">
                                            {
                                                item.name
                                            }
                                        </p>

                                        <p className="mt-1 truncate text-xs text-slate-400">
                                            {
                                                item.subject
                                            }{" "}
                                            ·{" "}
                                            {
                                                item.className
                                            }
                                        </p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                            {
                                                item.kind
                                            }
                                        </span>

                                        <p className="mt-2 text-xs text-slate-400">
                                            {
                                                item.date
                                            }
                                        </p>
                                    </div>
                                </div>
                            ),
                        )}

                        {recentAssessments.length ===
                            0 && (
                            <Empty text="No recent assessments found." />
                        )}
                    </div>
                </div>
            </section>

            {/* BOTTOM NAVIGATION */}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <BottomLink
                    href="/head-of-department/grades"
                    title="Grades"
                    text="Monitor department grading."
                />

                <BottomLink
                    href="/head-of-department/results"
                    title="Results"
                    text="Review student results."
                />

                <BottomLink
                    href="/head-of-department/performance"
                    title="Performance"
                    text="Analyze academic performance."
                />

                <BottomLink
                    href="/head-of-department/profile"
                    title="Profile"
                    text="Manage your account."
                />
            </section>
        </div>
    )
}

/* -------------------------------------------------- */
/* UI helpers */
/* -------------------------------------------------- */

function DashboardCard({
    href,
    label,
    value,
    detail,
}: {
    href: string
    label: string
    value: number
    detail: string
}) {
    return (
        <Link
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-bold tracking-tight text-slate-950">
                    {value}
                </p>

                <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">
                    →
                </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
                {detail}
            </p>
        </Link>
    )
}

function StatBox({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
                {value}
            </p>
        </div>
    )
}

function Info({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
                {value}
            </p>
        </div>
    )
}

function QuickLink({
    href,
    title,
    description,
}: {
    href: string
    title: string
    description: string
}) {
    return (
        <Link
            href={href}
            className="group flex items-center justify-between rounded-xl border border-slate-100 p-3.5 transition hover:border-slate-200 hover:bg-slate-50"
        >
            <div>
                <p className="text-sm font-semibold text-slate-800">
                    {title}
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                    {description}
                </p>
            </div>

            <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">
                →
            </span>
        </Link>
    )
}

function BottomLink({
    href,
    title,
    text,
}: {
    href: string
    title: string
    text: string
}) {
    return (
        <Link
            href={href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
            <p className="text-sm font-bold text-slate-900">
                {title}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
                {text}
            </p>
        </Link>
    )
}

function Empty({
    text,
}: {
    text: string
}) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">
                {text}
            </p>
        </div>
    )
}

function Message({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
                Head of Department
            </h1>

            <p className="mt-2 text-sm text-slate-500">
                {children}
            </p>
        </div>
    )
}

