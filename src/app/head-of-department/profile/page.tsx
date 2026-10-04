import { and, eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"
import { departmentHeads } from "@/db/schema"
import HeadOfDepartmentShell from "@/components/head-of-department/HeadOfDepartmentShell"

export default async function HeadOfDepartmentProfilePage() {
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

    return (
        <HeadOfDepartmentShell>
            <main className="mx-auto max-w-5xl space-y-6">
                <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Profile</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{session.user.name ?? "Department Head"}</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Academic Year: <span className="font-semibold text-slate-700 dark:text-slate-200">{academicYear.name}</span>
                    </p>
                </header>

                <section className="grid gap-4 md:grid-cols-2">
                    <InfoCard label="Name" value={session.user.name ?? "Unknown user"} />
                    <InfoCard label="Email" value={session.user.email ?? "No email provided"} />
                    <InfoCard label="Role" value="Head of Department" />
                    <InfoCard label="Department" value={departmentHead?.department?.name ?? "Not assigned"} />
                </section>
            </main>
        </HeadOfDepartmentShell>
    )
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</p>
        </div>
    )
}
