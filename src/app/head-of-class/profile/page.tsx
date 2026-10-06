import { and, eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"

import {
    classHeads,
    staffProfiles,
    studentEnrollments,
} from "@/db/schema"

import StaffProfile from "@/components/profile/StaffProfile"

export default async function HeadOfClassProfilePage() {
    const session = await requireSession()

    if (session.user.schoolRole !== "head_of_class") {
        redirect("/")
    }

    const db = await getSchoolDB()
    const academicYear = await getActiveAcademicYear()

    const [account, profile, assignment] =
        await Promise.all([
            centralDb.query.user.findFirst({
                where: eq(
                    user.id,
                    session.user.id,
                ),
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

            db.query.classHeads.findFirst({
                where: and(
                    eq(
                        classHeads.userId,
                        session.user.id,
                    ),
                    eq(
                        classHeads.academicYearId,
                        academicYear.id,
                    ),
                ),
                with: {
                    class: true,
                },
            }),
        ])

    if (!account) {
        redirect("/")
    }

    let studentCount = 0

    if (assignment) {
        const enrollments =
            await db.query.studentEnrollments.findMany({
                where: and(
                    eq(
                        studentEnrollments.classId,
                        assignment.classId,
                    ),
                    eq(
                        studentEnrollments.academicYearId,
                        academicYear.id,
                    ),
                ),
                columns: {
                    id: true,
                },
            })

        studentCount = enrollments.length
    }

    const roleAssignment = assignment
        ? {
              type: "head_of_class" as const,
              academicYear:
                  academicYear.name,
              className:
                  assignment.class.name,
              gradeLevel:
                  assignment.class.gradeLevel,
              studentCount,
              status: "Active",
          }
        : null

    return (
        <main className="min-h-dvh bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl space-y-6">
                <header>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Head of Class
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                        My Profile
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                        View your personal, professional,
                        account, and current class assignment
                        information.
                    </p>
                </header>

                <StaffProfile
                    user={{
                        id: account.id,
                        name: account.name,
                        email: account.email,
                        role: session.user.schoolRole,
                        emailVerified:
                            account.emailVerified,
                        createdAt:
                            account.createdAt,
                    }}
                    profile={profile ?? null}
                    roleAssignment={roleAssignment}
                />
            </div>
        </main>
    )
}