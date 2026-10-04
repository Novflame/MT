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
            <main className="mx-auto max-w-5xl space-y-6">
                <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Settings</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Department Settings</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Preferences and management controls for this department view.</p>
                </header>

                <section className="grid gap-4 md:grid-cols-2">
                    <SettingCard title="Account" detail="Review your access level, email, and department responsibilities." />
                    <SettingCard title="Notifications" detail="Manage the notification cadence and awareness preferences for department updates." />
                    <SettingCard title="Academic year" detail="Review the current active academic year and department context." />
                    <SettingCard title="Security" detail="Keep your account and department access aligned with the school policy." />
                </section>
            </main>
        </HeadOfDepartmentShell>
    )
}

function SettingCard({ title, detail }: { title: string; detail: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{detail}</p>
        </div>
    )
}
