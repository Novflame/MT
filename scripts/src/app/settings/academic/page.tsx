import Link from "next/link"

export default function AcademicSettingsPage() {
    return (
        <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Academic settings</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Academic-year activation and lifecycle settings are managed from the Academic Year section.
                    No separate academic settings are configured on this page yet.
                </p>
                <Link
                    href="/academic-year"
                    className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    Open Academic Years
                </Link>
            </section>
        </main>
    )
}
