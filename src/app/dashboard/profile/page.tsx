import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"

import { staffProfiles } from "@/db/schema"
import StaffProfile from "@/components/profile/StaffProfile"

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

    return (
        <div className="min-h-dvh bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
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
        </div>
    )
}