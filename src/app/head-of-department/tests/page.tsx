import { and, eq, inArray } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"
import { departmentHeads, subjects, tests } from "@/db/schema"
import HeadOfDepartmentShell from "@/components/head-of-department/HeadOfDepartmentShell"

export default async function HeadOfDepartmentTestsPage() {
    const session = await requireSession()

    if (session.user.schoolRole !== "head_of_department") {
        redirect("/")
    }

    const db = await getSchoolDB()
    const academicYear = await getActiveAcademicYear()

    const departmentHead = await db.query.departmentHeads.findFirst({
        where: and(
            eq(departmentHeads.userId, session.user.id),
            eq(departmentHeads.academicYearId, academicYear.id),
        ),
        with: { department: true },
    })

    if (!departmentHead) {
        return (
            <HeadOfDepartmentShell>
                <main className="mx-auto w-full min-w-0 max-w-7xl">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Head of Department</p>
                        <h1 className="mt-1 text-2xl break-words font-bold text-slate-900 dark:text-slate-50">Tests</h1>
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                            You are not assigned to a department for the active academic year.
                        </p>
                    </div>
                </main>
            </HeadOfDepartmentShell>
        )
    }

    const departmentId = departmentHead.departmentId

    const departmentSubjects = await db.query.subjects.findMany({
        where: eq(subjects.departmentId, departmentId),
        orderBy: (subject, { asc }) => [asc(subject.name)],
    })

    const subjectIds = departmentSubjects.map((subject) => subject.id)

    const departmentTests = subjectIds.length > 0
        ? await db.query.tests.findMany({
              where: and(
                  eq(tests.academicYearId, academicYear.id),
                  inArray(tests.subjectId, subjectIds),
              ),
              with: { subject: true, class: true },
              orderBy: (test, { desc }) => [desc(test.testDate)],
          })
        : []

    return (
        <HeadOfDepartmentShell>
            <main className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
                <header className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Head of Department</p>
                    <h1 className="mt-2 text-2xl sm:text-3xl break-words font-bold tracking-tight text-slate-900 dark:text-slate-50">Tests</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Academic Year: <span className="font-semibold text-slate-700 dark:text-slate-200">{academicYear.name}</span>
                    </p>
                </header>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="min-w-0 overflow-x-auto overscroll-x-contain">
                        <table className="min-w-[36rem] divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                            <thead>
                                <tr className="text-slate-600 dark:text-slate-300">
                                    <th className="pb-3 pr-4 font-semibold">Test</th>
                                    <th className="pb-3 pr-4 font-semibold">Subject</th>
                                    <th className="pb-3 pr-4 font-semibold">Class</th>
                                    <th className="pb-3 pr-4 font-semibold">Date</th>
                                    <th className="pb-3 pr-4 font-semibold">Max score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {departmentTests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                            No tests are scheduled for this department yet.
                                        </td>
                                    </tr>
                                ) : (
                                    departmentTests.map((test) => (
                                        <tr key={test.id} className="align-middle text-slate-700 dark:text-slate-200">
                                            <td className="py-3 pr-4 font-medium">{test.name}</td>
                                            <td className="py-3 pr-4">{test.subject?.name ?? "Unknown subject"}</td>
                                            <td className="py-3 pr-4">{test.class?.name ?? "Unknown class"}</td>
                                            <td className="py-3 pr-4">{new Date(test.testDate).toLocaleDateString()}</td>
                                            <td className="py-3 pr-4">{test.maxScore}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </HeadOfDepartmentShell>
    )
}
