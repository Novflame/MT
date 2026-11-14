import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import HeadOfDepartmentShell from "@/components/head-of-department/HeadOfDepartmentShell"

export default async function HeadOfDepartmentSettingsPage() {
    const session = await requireSession()

    if (session.user.schoolRole !== "head_of_department") {
        redirect("/")
    }

    return (
        <HeadOfDepartmentShell>
            <main className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
                <header className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Settings</p>
                    <h1 className="mt-2 text-2xl sm:text-3xl break-words font-bold tracking-tight text-slate-900 dark:text-slate-50">Department Settings</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Department-specific preferences are not currently configurable here.</p>
                </header>

                    <section
                        className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 sm:p-6 text-sm leading-6 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        aria-label="Department settings availability"
                    >
                        This page does not currently provide editable settings. Your account, notification, and school settings remain available through their existing application pages.
                    </section>
                </main>
        </HeadOfDepartmentShell>
    )
}
