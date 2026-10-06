import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"
import { staffProfiles } from "@/db/schema"

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

    return (
        <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                        Manage Profile
                    </h1>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Update your personal and professional profile information.
                    </p>
                </div>

                <ManageStaffProfile
                    user={currentUserData}
                    profile={profileResult[0] ?? null}
                />
            </div>
        </main>
    )
}