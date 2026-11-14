
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"

import { staffProfiles } from "@/db/schema"
import StaffProfile from "@/components/profile/StaffProfile"

import { getLocale } from "@/lib/i18n/server"
import type { Locale } from "@/lib/i18n/translations"

export default async function DashboardProfilePage() {
    const session = await requireSession()

    if (
        session.user.schoolRole !== "principal" &&
        session.user.schoolRole !== "deputy"
    ) {
        redirect("/")
    }

    const db = await getSchoolDB()

    const [account, profile] = await Promise.all([
        centralDb.query.user.findFirst({
            where: eq(user.id, session.user.id),
        }),

        db.query.staffProfiles.findFirst({
            where: eq(
                staffProfiles.userId,
                session.user.id,
            ),
            with: {
                department: true,
            },
        }),
    ])

    if (!account) {
        redirect("/")
    }

    const locale = await getLocale()

    return (
        <main
            className="min-h-dvh bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8"
            dir={locale === "ar" ? "rtl" : "ltr"}
        >
            <div className="mx-auto w-full max-w-7xl">
                <header className="mb-5 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:mb-6">
                    <div className="border-b border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-5 text-white sm:px-6 sm:py-6 dark:border-slate-800">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
                            {getProfileEyebrow(locale)}
                        </p>

                        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                            {getProfileTitle(locale)}
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                            {getProfileDescription(locale)}
                        </p>
                    </div>
                </header>

                <StaffProfile
                    user={{
                        id: account.id,
                        name: account.name,
                        email: account.email,
                        role: session.user.schoolRole,
                        emailVerified: account.emailVerified,
                        createdAt: account.createdAt,
                    }}
                    profile={profile ?? null}
                    roleAssignment={null}
                />
            </div>
        </main>
    )
}

function getProfileEyebrow(locale: Locale) {
    if (locale === "ar") {
        return "الملف الشخصي"
    }

    if (locale === "fr") {
        return "Profil"
    }

    return "Staff Profile"
}

function getProfileTitle(locale: Locale) {
    if (locale === "ar") {
        return "الملف الشخصي"
    }

    if (locale === "fr") {
        return "Profil"
    }

    return "Profile"
}

function getProfileDescription(locale: Locale) {
    if (locale === "ar") {
        return "عرض معلوماتك الشخصية والمهنية وبيانات القسم."
    }

    if (locale === "fr") {
        return "Consultez vos informations personnelles, professionnelles et départementales."
    }

    return "View your personal, professional, and department information."
}

