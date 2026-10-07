
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"
import { staffProfiles } from "@/db/schema"

import { getLocale } from "@/lib/i18n/server"
import {
    translations,
    type Locale,
} from "@/lib/i18n/translations"

import ManageStaffProfile from "@/components/profile/ManageStaffProfile"

export default async function ManageProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        redirect("/login")
    }

    const role = session.user.schoolRole

    const allowedRoles = [
        "principal",
        "deputy",
        "head_of_department",
        "head_of_class",
        "teacher",
    ] as const

    if (
        !role ||
        !allowedRoles.includes(
            role as (typeof allowedRoles)[number],
        )
    ) {
        redirect("/dashboard")
    }

    const currentUser = await centralDb
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.schoolRole,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1)

    const currentUserData = currentUser[0]

    if (!currentUserData) {
        redirect("/dashboard")
    }

    const db = await getSchoolDB()

    const profileResult = await db
        .select()
        .from(staffProfiles)
        .where(
            eq(
                staffProfiles.userId,
                session.user.id,
            ),
        )
        .limit(1)

    const locale = await getLocale()
    const t = translations[locale]

    return (
        <main
            className="min-h-dvh bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8"
            dir={locale === "ar" ? "rtl" : "ltr"}
        >
            <div className="mx-auto w-full max-w-5xl">
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

                <ManageStaffProfile
                    user={currentUserData}
                    profile={profileResult[0] ?? null}
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
        return "إدارة الملف الشخصي"
    }

    if (locale === "fr") {
        return "Gérer le profil"
    }

    return "Manage Profile"
}

function getProfileDescription(locale: Locale) {
    if (locale === "ar") {
        return "قم بتحديث معلوماتك الشخصية والمهنية."
    }

    if (locale === "fr") {
        return "Mettez à jour vos informations personnelles et professionnelles."
    }

    return "Update your personal and professional profile information."
}

