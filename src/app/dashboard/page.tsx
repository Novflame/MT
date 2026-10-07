
import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/auth/auth"

import DashboardOverview from "@/components/dashboard/DashboardOverview"
import DashboardShell from "@/components/dashboard/DashboardShell"

import { getLocale } from "@/lib/i18n/server"
import type { Locale } from "@/lib/i18n/translations"

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        redirect("/login")
    }

    const role = session.user.schoolRole

    if (
        role === "teacher" ||
        role === "head_of_class"
    ) {
        redirect("/teacher")
    }

    if (role === "parent") {
        redirect("/parent")
    }

    if (role === "student") {
        redirect("/student")
    }

    if (role === "head_of_department") {
        redirect("/head-of-department")
    }

    if (
        role !== "principal" &&
        role !== "deputy"
    ) {
        redirect("/")
    }

    const locale = await getLocale()

    return (
        <DashboardShell>
            <main
                className="min-h-dvh"
                dir={locale === "ar" ? "rtl" : "ltr"}
            >
                <div className="mx-auto w-full min-w-0 max-w-400">
                    <header className="mb-6 space-y-1 sm:mb-8">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {getOverviewLabel(locale)}
                        </p>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                            {getDashboardLabel(locale)}
                        </h1>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {getWelcomeText(
                                locale,
                                session.user.name,
                            )}
                        </p>
                    </header>

                    <DashboardOverview />
                </div>
            </main>
        </DashboardShell>
    )
}

function getOverviewLabel(locale: Locale) {
    if (locale === "ar") {
        return "نظرة عامة على المدرسة"
    }

    if (locale === "fr") {
        return "Aperçu de l'école"
    }

    return "School Overview"
}

function getDashboardLabel(locale: Locale) {
    if (locale === "ar") {
        return "لوحة التحكم"
    }

    if (locale === "fr") {
        return "Tableau de bord"
    }

    return "Dashboard"
}

function getWelcomeText(
    locale: Locale,
    name: string,
) {
    if (locale === "ar") {
        return `مرحباً بعودتك، ${name}`
    }

    if (locale === "fr") {
        return `Bon retour, ${name}`
    }

    return `Welcome back, ${name}`
}

