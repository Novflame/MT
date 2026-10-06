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

    const userName = session.user.name ?? "Department Head"
    const initials =
        userName
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "H"
    const roleLabel = session.user.schoolRole
        .split("_")
        .map((part, index) =>
            index === 1
                ? part
                : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join(" ")
    const departmentName = departmentHead?.department?.name ?? "Not assigned"

    return (
        <HeadOfDepartmentShell>
            <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
                <header className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                        Account
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
                        Profile
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                        View your account and professional information.
                    </p>
                </header>

                <section
                    aria-label="Profile identity"
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
                >
                    <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                        <div
                            aria-hidden="true"
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-xl font-bold text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200"
                        >
                            {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h2 className="break-words text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">
                                {userName}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                                Head of Department
                            </p>
                            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800 sm:grid-cols-2">
                                <IdentityDetail label="Department" value={departmentName} />
                                <IdentityDetail label="Academic year" value={academicYear.name} />
                            </div>
                        </div>
                    </div>
                </section>

                <section aria-labelledby="account-information-heading" className="space-y-3">
                    <SectionHeading
                        id="account-information-heading"
                        title="Personal / Account Information"
                        description="Your account details associated with this school."
                    />
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <InfoCard label="Name" value={userName} />
                        <InfoCard label="Email" value={session.user.email ?? "No email provided"} />
                    </div>
                </section>

                <section aria-labelledby="professional-information-heading" className="space-y-3">
                    <SectionHeading
                        id="professional-information-heading"
                        title="Professional Information"
                        description="Your current role and department assignment."
                    />
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <InfoCard label="Role" value={roleLabel} />
                        <InfoCard label="Department" value={departmentName} />
                        <InfoCard label="Academic year" value={academicYear.name} />
                    </div>
                </section>
            </div>
        </HeadOfDepartmentShell>
    )
}

function SectionHeading({
    id,
    title,
    description,
}: {
    id: string
    title: string
    description: string
}) {
    return (
        <div>
            <h2 id={id} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </div>
    )
}

function IdentityDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p className="mt-1 break-words font-semibold text-slate-800 dark:text-slate-200">
                {value}
            </p>
        </div>
    )
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p className="mt-2 break-words text-base font-semibold text-slate-900 dark:text-slate-100">
                {value}
            </p>
        </div>
    )
}
