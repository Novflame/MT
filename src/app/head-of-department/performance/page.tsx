import { and, eq, inArray } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"
import { departmentHeads, exams, grades, subjects, teacherAssignments, tests } from "@/db/schema"
import HeadOfDepartmentShell from "@/components/head-of-department/HeadOfDepartmentShell"

export default async function HeadOfDepartmentPerformancePage() {
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
                        <h1 className="mt-1 text-2xl break-words font-bold text-slate-900 dark:text-slate-50">Performance</h1>
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

    const [assignments, examRecords, testRecords, gradeRecords] = await Promise.all([
        subjectIds.length > 0
            ? db.query.teacherAssignments.findMany({
                  where: and(
                      eq(teacherAssignments.academicYearId, academicYear.id),
                      inArray(teacherAssignments.subjectId, subjectIds),
                  ),
                  with: { subject: true },
              })
            : [],
        subjectIds.length > 0
            ? db.query.exams.findMany({
                  where: and(
                      eq(exams.academicYearId, academicYear.id),
                      inArray(exams.subjectId, subjectIds),
                  ),
                  with: { subject: true },
              })
            : [],
        subjectIds.length > 0
            ? db.query.tests.findMany({
                  where: and(
                      eq(tests.academicYearId, academicYear.id),
                      inArray(tests.subjectId, subjectIds),
                  ),
                  with: { subject: true },
              })
            : [],
        db.query.grades.findMany({
            with: {
                exam: { with: { subject: true } },
                test: { with: { subject: true } },
            },
        }),
    ])

    const subjectRows = departmentSubjects.map((subject) => {
        const subjectGrades = gradeRecords.filter((grade) => {
            const subjectId = grade.exam?.subjectId ?? grade.test?.subjectId
            return subjectId === subject.id && (grade.exam?.academicYearId === academicYear.id || grade.test?.academicYearId === academicYear.id)
        })

        let totalPercent = 0
        let validCount = 0
        let passedCount = 0

        for (const grade of subjectGrades) {
            const maxScore = grade.exam?.maxScore ?? grade.test?.maxScore ?? 0
            if (maxScore <= 0) continue

            const percent = (grade.score / maxScore) * 100
            totalPercent += percent
            validCount += 1

            if (percent >= 50) {
                passedCount += 1
            }
        }

        const average = validCount > 0 ? Math.round(totalPercent / validCount) : 0
        const passRate = validCount > 0 ? Math.round((passedCount / validCount) * 100) : 0

        return {
            subject: subject.name,
            average,
            passRate,
            assignments: assignments.filter((assignment) => assignment.subjectId === subject.id).length,
            assessments: [...examRecords.filter((exam) => exam.subjectId === subject.id), ...testRecords.filter((test) => test.subjectId === subject.id)].length,
            gradeCount: subjectGrades.length,
        }
    })

    const totalAssessments = subjectRows.reduce((sum, item) => sum + item.assessments, 0)
    const averageDepartmentScore = subjectRows.length > 0
        ? Math.round(subjectRows.reduce((sum, item) => sum + item.average, 0) / subjectRows.length)
        : 0
    const averagePassRate = subjectRows.length > 0
        ? Math.round(subjectRows.reduce((sum, item) => sum + item.passRate, 0) / subjectRows.length)
        : 0

    return (
        <HeadOfDepartmentShell>
            <main className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
                <header className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Head of Department</p>
                    <h1 className="mt-2 text-2xl sm:text-3xl break-words font-bold tracking-tight text-slate-900 dark:text-slate-50">
                        {departmentHead.department.name}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Academic Year: <span className="font-semibold text-slate-700 dark:text-slate-200">{academicYear.name}</span>
                    </p>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Subjects" value={String(subjectRows.length)} detail="Tracked departments" />
                    <StatCard label="Average" value={`${averageDepartmentScore}%`} detail="Department score" />
                    <StatCard label="Pass rate" value={`${averagePassRate}%`} detail="Assessment success" />
                    <StatCard label="Assessments" value={String(totalAssessments)} detail="Tests and exams" />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Subject performance</h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Department-wide academic progress</p>
                        </div>
                    </div>

                    <div className="mt-5 min-w-0 overflow-x-auto overscroll-x-contain">
                        <table className="min-w-[36rem] divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                            <thead>
                                <tr className="text-slate-600 dark:text-slate-300">
                                    <th className="pb-3 pr-4 font-semibold">Subject</th>
                                    <th className="pb-3 pr-4 font-semibold">Average</th>
                                    <th className="pb-3 pr-4 font-semibold">Pass rate</th>
                                    <th className="pb-3 pr-4 font-semibold">Assessments</th>
                                    <th className="pb-3 pr-4 font-semibold">Grade entries</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {subjectRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                            There are no performance records for this department yet.
                                        </td>
                                    </tr>
                                ) : (
                                    subjectRows.map((row) => (
                                        <tr key={row.subject} className="align-middle text-slate-700 dark:text-slate-200">
                                            <td className="py-3 pr-4 font-medium">{row.subject}</td>
                                            <td className="py-3 pr-4">{row.average}%</td>
                                            <td className="py-3 pr-4">
                                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                                                    {row.passRate}%
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">{row.assessments}</td>
                                            <td className="py-3 pr-4">{row.gradeCount}</td>
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

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
    )
}
