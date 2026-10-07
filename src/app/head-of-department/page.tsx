
import Link from "next/link"
import { redirect } from "next/navigation"
import { and, eq, inArray } from "drizzle-orm"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getActiveAcademicYear } from "@/db/academic-year"

import {
    departmentHeads,
    subjects,
    teacherAssignments,
    studentEnrollments,

    exams,
} from "@/db/schema"

export default async function HeadOfDepartmentPage() {
    // =========================================================
    // SESSION
    // =========================================================

    const session = await requireSession()

    if (session.user.schoolRole !== "head_of_department") {
        redirect("/")
    }

    const db = await getSchoolDB()
    const academicYear = await getActiveAcademicYear()

    // =========================================================
    // DEPARTMENT HEAD
    // =========================================================

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
            <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto w-full min-w-0 max-w-7xl">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                        <h1 className="text-2xl break-words font-bold text-slate-900">
                            Head of Department
                        </h1>

                        <p className="mt-2 text-slate-500">
                            You are not assigned to a department for
                            the active academic year.
                        </p>
                    </div>
                </div>
            </main>
        )
    }

    const departmentId = departmentHead.departmentId

    // =========================================================
    // SUBJECTS
    // =========================================================

    const departmentSubjects =
        await db.query.subjects.findMany({
            where: eq(
                subjects.departmentId,
                departmentId,
            ),
        })

    const subjectIds = departmentSubjects.map(
        (subject) => subject.id,
    )

    // =========================================================
    // TEACHER ASSIGNMENTS
    // =========================================================

    const assignments =
        subjectIds.length > 0
            ? await db.query.teacherAssignments.findMany({
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
            : []

    // =========================================================
    // TEACHERS
    // =========================================================

    const teacherIds = Array.from(
        new Set(
            assignments.map(
                (assignment) =>
                    assignment.teacherId,
            ),
        ),
    )

    const teachers =
        teacherIds.length > 0
            ? await centralDb
                  .select({
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      role: user.schoolRole,
                  })
                  .from(user)
                  .where(
                      inArray(
                          user.id,
                          teacherIds,
                      ),
                  )
            : []

    // =========================================================
    // STUDENTS
    // =========================================================

    const enrollments =
        await db.query.studentEnrollments.findMany({
            where: eq(
                studentEnrollments.academicYearId,
                academicYear.id,
            ),
            with: {
                student: true,
                class: true,
            },
        })

    const totalStudents = enrollments.length

    // =========================================================
    // EXAMS
    // =========================================================

    const departmentExams =
        subjectIds.length > 0
            ? await db.query.exams.findMany({
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
                  orderBy: (
                      exam,
                      { desc },
                  ) => [
                      desc(exam.examDate),
                  ],
              })
            : []

    // =========================================================
    // GRADES
    // =========================================================

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

    // =========================================================
    // DEPARTMENT GRADES
    // =========================================================

    const departmentGrades =
        allGrades.filter((grade) => {
            const subjectId =
                grade.exam?.subjectId ??
                grade.test?.subjectId

            const academicYearId =
                grade.exam?.academicYearId ??
                grade.test?.academicYearId

            return (
                subjectId !== undefined &&
                subjectIds.includes(subjectId) &&
                academicYearId === academicYear.id
            )
        })

    // =========================================================
    // STATISTICS
    // =========================================================

    const totalSubjects =
        departmentSubjects.length

    const totalTeachers =
        teacherIds.length

    const totalAssignments =
        assignments.length

    const totalExams =
        departmentExams.length

    const totalGrades =
        departmentGrades.length

    // =========================================================
    // SUBJECT PERFORMANCE
    // =========================================================

    const subjectPerformance =
        departmentSubjects.map((subject) => {
            const subjectGrades =
                departmentGrades.filter(
                    (grade) => {
                        const subjectId =
                            grade.exam?.subjectId ??
                            grade.test?.subjectId

                        return (
                            subjectId ===
                            subject.id
                        )
                    },
                )

            let totalPercent = 0
            let validCount = 0
            let passedCount = 0

            for (const grade of subjectGrades) {
                const maxScore =
                    grade.exam?.maxScore ??
                    grade.test?.maxScore ??
                    0

                if (maxScore <= 0) {
                    continue
                }

                const percent =
                    (grade.score /
                        maxScore) *
                    100

                totalPercent += percent
                validCount += 1

                if (percent >= 50) {
                    passedCount += 1
                }
            }

            const average =
                validCount > 0
                    ? Math.round(
                          totalPercent /
                              validCount,
                      )
                    : 0

            const passRate =
                validCount > 0
                    ? Math.round(
                          (passedCount /
                              validCount) *
                              100,
                      )
                    : 0

            const subjectAssignments =
                assignments.filter(
                    (assignment) =>
                        assignment.subjectId ===
                        subject.id,
                )

            const subjectTeachers =
                Array.from(
                    new Set(
                        subjectAssignments.map(
                            (assignment) =>
                                assignment.teacherId,
                        ),
                    ),
                )

            return {
                id: subject.id,
                name: subject.name,
                gradeCount:
                    subjectGrades.length,
                average,
                passRate,
                teacherCount:
                    subjectTeachers.length,
                assignmentCount:
                    subjectAssignments.length,
            }
        })

    // =========================================================
    // RECENT RESULTS
    // =========================================================

    const recentResults =
        [...departmentGrades]
            .sort((a, b) => {
                const dateA =
                    a.exam?.examDate ??
                    a.test?.testDate ??
                    ""

                const dateB =
                    b.exam?.examDate ??
                    b.test?.testDate ??
                    ""

                return dateB.localeCompare(
                    dateA,
                )
            })
            .slice(0, 12)
            .map((grade) => {
                const assessment =
                    grade.exam ?? grade.test

                const subject =
                    grade.exam?.subject ??
                    grade.test?.subject

                const classData =
                    grade.exam?.class ??
                    grade.test?.class

                const maxScore =
                    grade.exam?.maxScore ??
                    grade.test?.maxScore ??
                    0

                const percent =
                    maxScore > 0
                        ? Math.round(
                              (grade.score /
                                  maxScore) *
                                  100,
                          )
                        : 0

                const student =
                    grade.enrollment.student

                const studentName = [
                    student.firstName,
                    student.middleName,
                    student.lastName,
                ]
                    .filter(Boolean)
                    .join(" ")

                return {
                    id: grade.id,
                    studentName,
                    subjectName:
                        subject?.name ??
                        "Unknown",
                    className:
                        classData?.name ??
                        "Unknown",
                    assessmentName:
                        assessment?.name ??
                        "Assessment",
                    score: grade.score,
                    maxScore,
                    percent,
                }
            })

    // =========================================================
    // UI
    // =========================================================

    return (
        <div className="min-w-0 space-y-6">
            {/* HEADER */}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500">
                            Head of Department
                        </p>

                        <h1 className="mt-1 text-2xl sm:text-3xl break-words font-bold tracking-tight text-slate-950">
                            {departmentHead.department.name}
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Academic Year:{" "}
                            <span className="font-semibold text-slate-700">
                                {academicYear.name}
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <DashboardButton
                            href="/head-of-department/teachers"
                            label="Teachers"
                        />

                        <DashboardButton
                            href="/head-of-department/performance"
                            label="Performance"
                            dark
                        />
                    </div>
                </div>

                <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoItem
                        label="Department Head"
                        value={
                            session.user.name ??
                            "Department Head"
                        }
                    />

                    <InfoItem
                        label="Teachers"
                        value={String(totalTeachers)}
                    />

                    <InfoItem
                        label="Subjects"
                        value={String(totalSubjects)}
                    />

                    <InfoItem
                        label="Academic Year"
                        value={academicYear.name}
                    />
                </div>
            </section>

            {/* MAIN KPI */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardCard
                    href="/head-of-department/teachers"
                    label="Teachers"
                    value={totalTeachers}
                    detail="Department teaching staff"
                />

                <DashboardCard
                    href="/head-of-department/subjects"
                    label="Subjects"
                    value={totalSubjects}
                    detail="Subjects in department"
                />

                <DashboardCard
                    href="/head-of-department/assignments"
                    label="Assignments"
                    value={totalAssignments}
                    detail="Teaching assignments"
                />

                <DashboardCard
                    href="/head-of-department/grades"
                    label="Grades"
                    value={totalGrades}
                    detail="Recorded grade entries"
                />
            </section>

            {/* ACADEMIC KPI */}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardCard
                    href="/head-of-department/grades"
                    label="Students"
                    value={totalStudents}
                    detail="Active enrollments"
                />

                <DashboardCard
                    href="/head-of-department/exams"
                    label="Exams"
                    value={totalExams}
                    detail="Department examinations"
                />

                <DashboardCard
                    href="/head-of-department/results"
                    label="Results"
                    value={totalGrades}
                    detail="Recorded academic results"
                />

                <DashboardCard
                    href="/head-of-department/performance"
                    label="Performance"
                    value={subjectPerformance.length}
                    detail="Subjects being monitored"
                />
            </section>

            {/* SUBJECT PERFORMANCE + QUICK ACCESS */}

            <section className="grid gap-6 lg:grid-cols-3">
                {/* SUBJECT PERFORMANCE */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm lg:col-span-2">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Subject Performance
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Academic performance across
                                department subjects.
                            </p>
                        </div>

                        <Link
                            href="/head-of-department/performance"
                            className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                            View all
                        </Link>
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
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {
                                                    subject.name
                                                }
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                {
                                                    subject.teacherCount
                                                }{" "}
                                                teachers ·{" "}
                                                {
                                                    subject.assignmentCount
                                                }{" "}
                                                assignments ·{" "}
                                                {
                                                    subject.gradeCount
                                                }{" "}
                                                grades
                                            </p>
                                        </div>

                                        <span className="shrink-0 text-sm font-bold text-slate-900">
                                            {
                                                subject.average
                                            }
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

                                    <div className="mt-2 flex justify-between text-xs">
                                        <span className="text-slate-400">
                                            Pass rate
                                        </span>

                                        <span
                                            className={
                                                subject.passRate >=
                                                50
                                                    ? "font-semibold text-emerald-600"
                                                    : "font-semibold text-red-600"
                                            }
                                        >
                                            {
                                                subject.passRate
                                            }
                                            %
                                        </span>
                                    </div>
                                </div>
                            ),
                        )}

                        {subjectPerformance.length ===
                            0 && (
                            <EmptyState text="No subject performance data available." />
                        )}
                    </div>
                </div>

                {/* QUICK ACCESS */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                        Quick Access
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Navigate to department management.
                    </p>

                    <div className="mt-5 space-y-2">
                        <QuickLink
                            href="/head-of-department/teachers"
                            title="Teachers"
                            text="View department teachers"
                        />

                        <QuickLink
                            href="/head-of-department/subjects"
                            title="Subjects"
                            text="View department subjects"
                        />

                        <QuickLink
                            href="/head-of-department/assignments"
                            title="Assignments"
                            text="Review teaching workload"
                        />

                        <QuickLink
                            href="/head-of-department/grades"
                            title="Grades"
                            text="Monitor department grades"
                        />

                        <QuickLink
                            href="/head-of-department/exams"
                            title="Exams"
                            text="Review examinations"
                        />

                        <QuickLink
                            href="/head-of-department/results"
                            title="Results"
                            text="Review academic results"
                        />

                        <QuickLink
                            href="/head-of-department/performance"
                            title="Performance"
                            text="Analyze performance"
                        />
                    </div>
                </div>
            </section>

            {/* DEPARTMENT SNAPSHOT */}

            <section className="grid gap-6 lg:grid-cols-2">
                {/* TEACHERS */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Department Teachers
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Current teaching assignments.
                            </p>
                        </div>

                        <Link
                            href="/head-of-department/assignments"
                            className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                            Assignments
                        </Link>
                    </div>

                    <div className="mt-5 divide-y divide-slate-100">
                        {teachers
                            .slice(0, 6)
                            .map((teacher) => {
                                const workload =
                                    assignments.filter(
                                        (
                                            assignment,
                                        ) =>
                                            assignment.teacherId ===
                                            teacher.id,
                                    ).length

                                return (
                                    <div
                                        key={
                                            teacher.id
                                        }
                                        className="flex items-center justify-between gap-4 py-4"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {
                                                    teacher.name
                                                }
                                            </p>

                                            <p className="mt-1 truncate text-xs text-slate-400">
                                                {
                                                    teacher.email
                                                }
                                            </p>
                                        </div>

                                        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            {workload}{" "}
                                            {workload ===
                                            1
                                                ? "assignment"
                                                : "assignments"}
                                        </span>
                                    </div>
                                )
                            })}

                        {teachers.length === 0 && (
                            <EmptyState text="No teachers found." />
                        )}
                    </div>
                </div>

                {/* DEPARTMENT COVERAGE */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Department Coverage
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Teaching coverage by subject.
                        </p>
                    </div>

                    <div className="mt-6 space-y-5">
                        {subjectPerformance.map(
                            (subject) => (
                                <div
                                    key={
                                        subject.id
                                    }
                                >
                                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="text-sm font-semibold text-slate-800">
                                            {
                                                subject.name
                                            }
                                        </span>

                                        <span className="text-xs font-semibold text-slate-500">
                                            {
                                                subject.assignmentCount
                                            }{" "}
                                            assignments
                                        </span>
                                    </div>

                                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-700"
                                            style={{
                                                width: `${Math.min(
                                                    subject.assignmentCount *
                                                        20,
                                                    100,
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ),
                        )}

                        {subjectPerformance.length ===
                            0 && (
                            <EmptyState text="No coverage data available." />
                        )}
                    </div>
                </div>
            </section>

            {/* RECENT RESULTS */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Recent Results
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Latest grades recorded in your department.
                        </p>
                    </div>

                    <Link
                        href="/head-of-department/results"
                        className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                    >
                        View all results
                    </Link>
                </div>

                {recentResults.length === 0 ? (
                    <EmptyState text="No results have been recorded yet." />
                ) : (
                    <div className="min-w-0 overflow-x-auto overscroll-x-contain">
                        <table className="min-w-190 w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Student
                                    </th>

                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Subject
                                    </th>

                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Class
                                    </th>

                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Assessment
                                    </th>

                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Score
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {recentResults.map(
                                    (result) => (
                                        <tr
                                            key={
                                                result.id
                                            }
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        result.studentName
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {
                                                    result.subjectName
                                                }
                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {
                                                    result.className
                                                }
                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {
                                                    result.assessmentName
                                                }
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <span
                                                    className={
                                                        result.percent >=
                                                        50
                                                            ? "font-bold text-emerald-600"
                                                            : "font-bold text-red-600"
                                                    }
                                                >
                                                    {
                                                        result.score
                                                    }
                                                    /
                                                    {
                                                        result.maxScore
                                                    }
                                                </span>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {
                                                        result.percent
                                                    }
                                                    %
                                                </p>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* FOOTER ACTIONS */}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FooterLink
                    href="/head-of-department/teachers"
                    title="Teachers"
                    text="View department staff."
                />

                <FooterLink
                    href="/head-of-department/grades"
                    title="Grades"
                    text="Monitor grading activity."
                />

                <FooterLink
                    href="/head-of-department/results"
                    title="Results"
                    text="Review academic results."
                />

                <FooterLink
                    href="/head-of-department/profile"
                    title="Profile"
                    text="Manage your profile."
                />
            </section>
        </div>
    )
}

// =============================================================
// DASHBOARD BUTTON
// =============================================================

function DashboardButton({
    href,
    label,
    dark = false,
}: {
    href: string
    label: string
    dark?: boolean
}) {
    return (
        <Link
            href={href}
            className={
                dark
                    ? "inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    : "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            }
        >
            {label}
        </Link>
    )
}

// =============================================================
// DASHBOARD CARD
// =============================================================

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
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                        {value}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        {detail}
                    </p>
                </div>

                <span className="text-slate-300 transition group-hover:text-slate-600">
                    →
                </span>
            </div>
        </Link>
    )
}

// =============================================================
// INFO ITEM
// =============================================================

function InfoItem({
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

            <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {value}
            </p>
        </div>
    )
}

// =============================================================
// QUICK LINK
// =============================================================

function QuickLink({
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
            className="group block rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                        {title}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-400">
                        {text}
                    </p>
                </div>

                <span className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600">
                    →
                </span>
            </div>
        </Link>
    )
}

// =============================================================
// FOOTER LINK
// =============================================================

function FooterLink({
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

            <p className="mt-1 text-xs text-slate-500">
                {text}
            </p>
        </Link>
    )
}

// =============================================================
// EMPTY STATE
// =============================================================

function EmptyState({
    text,
}: {
    text: string
}) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 sm:p-6 text-center">
            <p className="text-sm text-slate-500">
                {text}
            </p>
        </div>
    )
}

