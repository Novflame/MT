
import { and, eq, inArray } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getActiveAcademicYear } from "@/db/academic-year"

import {
    departmentHeads,
    subjects,
    teacherAssignments,
} from "@/db/schema"

import HeadOfDepartmentShell
    from "@/components/head-of-department/HeadOfDepartmentShell"

export default async function HeadOfDepartmentAssignmentsPage() {
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
                <main className="mx-auto w-full min-w-0 max-w-7xl">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">
                            Head of Department
                        </p>

                        <h1 className="mt-1 text-2xl break-words font-bold text-slate-900">
                            Assignments
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

    const teacherIds = Array.from(
        new Set(
            assignments.map(
                assignment =>
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

    const teacherMap = new Map(
        teachers.map(teacher => [
            teacher.id,
            teacher,
        ]),
    )

    const assignmentRows = assignments.map(
        assignment => {
            const teacher =
                teacherMap.get(
                    assignment.teacherId,
                )

            return {
                id: `${assignment.academicYearId}-${assignment.teacherId}-${assignment.subjectId}-${assignment.classId}`,
                teacherId:
                    assignment.teacherId,
                teacherName:
                    teacher?.name ??
                    "Unknown Teacher",
                teacherEmail:
                    teacher?.email ??
                    "No email",
                subjectId:
                    assignment.subjectId,
                subjectName:
                    assignment.subject.name,
                classId:
                    assignment.classId,
                className:
                    assignment.class.name,
            }
        },
    )

    const totalTeachers =
        new Set(
            assignments.map(
                assignment =>
                    assignment.teacherId,
            ),
        ).size

    const totalSubjects =
        new Set(
            assignments.map(
                assignment =>
                    assignment.subjectId,
            ),
        ).size

    const totalClasses =
        new Set(
            assignments.map(
                assignment =>
                    assignment.classId,
            ),
        ).size

    const teacherLoad = new Map<
        string,
        number
    >()

    for (const assignment of assignments) {
        teacherLoad.set(
            assignment.teacherId,
            (teacherLoad.get(
                assignment.teacherId,
            ) ?? 0) + 1,
        )
    }

    const subjectLoad = new Map<
        string,
        number
    >()

    for (const assignment of assignments) {
        subjectLoad.set(
            assignment.subjectId,
            (subjectLoad.get(
                assignment.subjectId,
            ) ?? 0) + 1,
        )
    }

    const busiestTeacher =
        teacherIds.length > 0
            ? teacherIds.reduce(
                  (best, teacherId) =>
                      (teacherLoad.get(
                          teacherId,
                      ) ?? 0) >
                      (teacherLoad.get(
                          best,
                      ) ?? 0)
                          ? teacherId
                          : best,
                  teacherIds[0],
              )
            : null

    const busiestTeacherName =
        busiestTeacher
            ? teacherMap.get(
                  busiestTeacher,
              )?.name ?? "Unknown Teacher"
            : "—"

    const busiestTeacherCount =
        busiestTeacher
            ? teacherLoad.get(
                  busiestTeacher,
              ) ?? 0
            : 0

    return (
        <HeadOfDepartmentShell>
            <main className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
                {/* Header */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                {departmentHead.department.name}
                            </p>

                            <h1 className="mt-1 text-2xl sm:text-3xl break-words font-bold tracking-tight text-slate-900">
                                Assignments
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Teaching assignments across your department
                                for the active academic year.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 px-5 py-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Academic Year
                            </p>

                            <p className="mt-1 font-semibold text-slate-900">
                                {academicYear.name}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Statistics */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Assignments"
                        value={assignments.length}
                        description="Active teaching assignments"
                    />

                    <StatCard
                        label="Teachers"
                        value={totalTeachers}
                        description="Teachers with assignments"
                    />

                    <StatCard
                        label="Subjects"
                        value={totalSubjects}
                        description="Subjects being taught"
                    />

                    <StatCard
                        label="Classes"
                        value={totalClasses}
                        description="Classes covered"
                    />
                </section>

                {/* Load summary */}
                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Teacher Workload
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Number of class-subject assignments per
                                    teacher.
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-900 px-4 py-3 text-right text-white">
                                <p className="text-xs text-slate-300">
                                    Highest
                                </p>

                                <p className="mt-1 text-sm font-semibold">
                                    {busiestTeacherName}
                                </p>

                                <p className="text-xs text-slate-300">
                                    {busiestTeacherCount} assignments
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
                            {teacherIds.map(
                                teacherId => {
                                    const teacher =
                                        teacherMap.get(
                                            teacherId,
                                        )

                                    const count =
                                        teacherLoad.get(
                                            teacherId,
                                        ) ?? 0

                                    const percentage =
                                        assignments.length > 0
                                            ? (count /
                                                  assignments.length) *
                                              100
                                            : 0

                                    return (
                                        <div
                                            key={teacherId}
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-4">
                                                <span className="truncate text-sm font-semibold text-slate-700">
                                                    {teacher?.name ??
                                                        "Unknown Teacher"}
                                                </span>

                                                <span className="shrink-0 text-sm font-bold text-slate-900">
                                                    {count}
                                                </span>
                                            </div>

                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-slate-900"
                                                    style={{
                                                        width: `${percentage}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                },
                            )}

                            {teacherIds.length === 0 && (
                                <p className="py-8 text-center text-sm text-slate-500">
                                    No teacher assignments found.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Subject Coverage
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Number of teaching assignments per subject.
                            </p>
                        </div>

                        <div className="mt-6 space-y-4">
                            {departmentSubjects.map(
                                subject => {
                                    const count =
                                        subjectLoad.get(
                                            subject.id,
                                        ) ?? 0

                                    const percentage =
                                        assignments.length > 0
                                            ? (count /
                                                  assignments.length) *
                                              100
                                            : 0

                                    return (
                                        <div
                                            key={subject.id}
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-4">
                                                <span className="truncate text-sm font-semibold text-slate-700">
                                                    {subject.name}
                                                </span>

                                                <span className="shrink-0 text-sm font-bold text-slate-900">
                                                    {count}
                                                </span>
                                            </div>

                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-slate-500"
                                                    style={{
                                                        width: `${percentage}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                },
                            )}
                        </div>
                    </div>
                </section>

                {/* Assignment table */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                        <h2 className="text-lg font-bold text-slate-900">
                            Department Assignments
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Complete teaching assignment list for the
                            department.
                        </p>
                    </div>

                    <div className="min-w-0 overflow-x-auto overscroll-x-contain">
                        <table className="w-full min-w-190 text-left">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">
                                        Teacher
                                    </th>

                                    <th className="px-6 py-4">
                                        Subject
                                    </th>

                                    <th className="px-6 py-4">
                                        Class
                                    </th>

                                    <th className="px-6 py-4">
                                        Load
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {assignmentRows.map(
                                    assignment => (
                                        <tr
                                            key={assignment.id}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-5">
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        assignment.teacherName
                                                    }
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {
                                                        assignment.teacherEmail
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-6 py-5">
                                                <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                                                    {
                                                        assignment.subjectName
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-6 py-5">
                                                <span className="inline-flex rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                                                    {
                                                        assignment.className
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-6 py-5">
                                                <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">
                                                    {teacherLoad.get(
                                                        assignment.teacherId,
                                                    ) ?? 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ),
                                )}

                                {assignmentRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-6 py-12 text-center text-sm text-slate-500"
                                        >
                                            No teaching assignments are
                                            currently registered for this
                                            department.
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

