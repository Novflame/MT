
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

export default async function HeadOfDepartmentTeachersPage() {
    // =========================================================
    // SESSION
    // =========================================================

    const session = await requireSession()

    if (session.user.schoolRole !== "head_of_department") {
        redirect("/")
    }

    // =========================================================
    // DATABASE
    // =========================================================

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
            <HeadOfDepartmentShell>
                <main className="mx-auto w-full min-w-0 max-w-7xl">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">
                            Head of Department
                        </p>

                        <h1 className="mt-1 text-2xl break-words font-bold text-slate-900">
                            Teachers
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

    const departmentId =
        departmentHead.departmentId

    // =========================================================
    // DEPARTMENT SUBJECTS
    // =========================================================

    const departmentSubjects =
        await db.query.subjects.findMany({
            where: eq(
                subjects.departmentId,
                departmentId,
            ),
        })

    const subjectIds =
        departmentSubjects.map(
            subject => subject.id,
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
    // UNIQUE TEACHERS
    // =========================================================

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

    const teacherMap = new Map(
        teachers.map(teacher => [
            teacher.id,
            teacher,
        ]),
    )

    // =========================================================
    // BUILD TEACHER SUMMARY
    // =========================================================

    const teacherRows = teacherIds.map(
        teacherId => {
            const teacher =
                teacherMap.get(teacherId)

            const teacherAssignments =
                assignments.filter(
                    assignment =>
                        assignment.teacherId ===
                        teacherId,
                )

            const subjectMap =
                new Map<
                    string,
                    {
                        id: string
                        name: string
                    }
                >()

            const classMap =
                new Map<
                    string,
                    {
                        id: string
                        name: string
                    }
                >()

            for (const assignment of teacherAssignments) {
                subjectMap.set(
                    assignment.subject.id,
                    {
                        id: assignment.subject.id,
                        name: assignment.subject.name,
                    },
                )

                classMap.set(
                    assignment.class.id,
                    {
                        id: assignment.class.id,
                        name: assignment.class.name,
                    },
                )
            }

            return {
                id: teacherId,
                name:
                    teacher?.name ??
                    "Unknown Teacher",
                email:
                    teacher?.email ??
                    "No email",
                subjects:
                    Array.from(
                        subjectMap.values(),
                    ),
                classes:
                    Array.from(
                        classMap.values(),
                    ),
                assignmentCount:
                    teacherAssignments.length,
            }
        },
    )

    // =========================================================
    // UI
    // =========================================================

   
return (
    <HeadOfDepartmentShell>
        <main className="mx-auto w-full min-w-0 max-w-7xl space-y-8">

            {/* PAGE HEADER */}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

                <div className="p-6 sm:p-8 lg:p-10">

                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0">

                            <div className="flex items-center gap-4">

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                                    H
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                        Head of Department
                                    </p>

                                    <p className="mt-0.5 truncate text-base font-bold text-slate-900 dark:text-slate-100">
                                        {departmentHead.department.name}
                                    </p>
                                </div>

                            </div>

                            <div className="mt-8">

                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    Department Management
                                </p>

                                <h1 className="mt-2 text-2xl break-words font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                                    Teachers
                                </h1>

                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base dark:text-slate-400">
                                    Teachers assigned to your department
                                    during the active academic year.
                                </p>

                            </div>

                        </div>

                        {/* ACADEMIC YEAR */}

                        <div className="w-full shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:w-auto sm:min-w-48 dark:border-slate-700 dark:bg-slate-800">

                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Academic Year
                            </p>

                            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                                {academicYear.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Active academic year
                            </p>

                        </div>

                    </div>

                </div>

            </section>


            {/* SUMMARY */}

            <section className="grid gap-4 sm:grid-cols-3">

                <SummaryCard
                    label="Teachers"
                    value={teacherRows.length}
                />

                <SummaryCard
                    label="Subjects"
                    value={subjectIds.length}
                />

                <SummaryCard
                    label="Assignments"
                    value={assignments.length}
                />

            </section>


            {/* TEACHERS */}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

                <div className="border-b border-slate-200 px-6 py-6 sm:px-8 dark:border-slate-800">

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                                Department Teachers
                            </h2>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Current teaching assignments within{" "}
                                {departmentHead.department.name}.
                            </p>
                        </div>

                        <div className="text-sm font-medium text-slate-400 dark:text-slate-500">
                            {teacherRows.length}{" "}
                            {teacherRows.length === 1
                                ? "teacher"
                                : "teachers"}
                        </div>

                    </div>

                </div>


                {/* TABLE */}

                <div className="min-w-0 overflow-x-auto overscroll-x-contain">

                    <table className="w-full min-w-190 text-left">

                        <thead className="bg-slate-50 dark:bg-slate-800/60">

                            <tr className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">

                                <th className="px-6 py-4 sm:px-8">
                                    Teacher
                                </th>

                                <th className="px-6 py-4">
                                    Subjects
                                </th>

                                <th className="px-6 py-4">
                                    Classes
                                </th>

                                <th className="px-6 py-4">
                                    Assignments
                                </th>

                            </tr>

                        </thead>


                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

                            {teacherRows.map((teacher) => (

                                <tr
                                    key={teacher.id}
                                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >

                                    {/* TEACHER */}

                                    <td className="px-6 py-6 sm:px-8">

                                        <div className="flex items-center gap-4">

                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                {teacher.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="min-w-0">

                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    {teacher.name}
                                                </p>

                                                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                                                    {teacher.email}
                                                </p>

                                            </div>

                                        </div>

                                    </td>


                                    {/* SUBJECTS */}

                                    <td className="px-6 py-6">

                                        <div className="flex max-w-sm flex-wrap gap-2">

                                            {teacher.subjects.map(
                                                (subject) => (

                                                    <span
                                                        key={subject.id}
                                                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                                    >
                                                        {subject.name}
                                                    </span>

                                                ),
                                            )}

                                        </div>

                                    </td>


                                    {/* CLASSES */}

                                    <td className="px-6 py-6">

                                        <div className="flex max-w-sm flex-wrap gap-2">

                                            {teacher.classes.map(
                                                (schoolClass) => (

                                                    <span
                                                        key={schoolClass.id}
                                                        className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                                                    >
                                                        {schoolClass.name}
                                                    </span>

                                                ),
                                            )}

                                        </div>

                                    </td>


                                    {/* ASSIGNMENTS */}

                                    <td className="px-6 py-6">

                                        <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                                            {teacher.assignmentCount}
                                        </span>

                                    </td>

                                </tr>

                            ))}


                            {/* EMPTY STATE */}

                            {teacherRows.length === 0 && (

                                <tr>

                                    <td
                                        colSpan={4}
                                        className="px-6 py-16 text-center"
                                    >

                                        <div className="mx-auto max-w-md">

                                            <p className="text-base font-semibold text-slate-900 dark:text-white">
                                                No teachers assigned
                                            </p>

                                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                No teachers are currently
                                                assigned to this department
                                                for the active academic year.
                                            </p>

                                        </div>

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

// =============================================================
// SUMMARY CARD
// =============================================================

function SummaryCard({
    label,
    value,
}: {
    label: string
    value: number
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-medium text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>

        </div>
    )
}

