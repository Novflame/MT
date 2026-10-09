import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getActiveAcademicYear, getSchoolDB } from "@/db"

export default async function StudentProfilePage() {
    const session = await requireSession()

    if (session.user.schoolRole !== "student") {
        redirect("/")
    }

    const db = await getSchoolDB()
    const academicYear = await getActiveAcademicYear()

    const studentUser = await db.query.studentUsers.findFirst({
        where: (studentUser, { eq }) =>
            eq(studentUser.userId, session.user.id),
        with: {
            student: {
                with: {
                    enrollments: {
                        with: {
                            class: true,
                            academicYear: true,
                        },
                    },
                    parentStudents: {
                        with: {
                            parent: true,
                        },
                    },
                },
            },
        },
    })

    const student = studentUser?.student

    if (!student) {
        return (
            <main className="min-h-dvh bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-7xl">
                    <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-700 shadow-sm dark:border-red-900/50 dark:bg-slate-900 dark:text-red-300">
                        <h1 className="text-lg font-semibold">
                            Student profile unavailable
                        </h1>

                        <p className="mt-2 text-sm">
                            Your student account is not currently linked to a
                            student record.
                        </p>
                    </div>
                </div>
            </main>
        )
    }

    // const currentEnrollment =
    //     student.enrollments.find(
    //         (enrollment) =>
    //             enrollment.academicYearId === academicYear.id,
    //     ) ?? student.enrollments[0] ?? null  never used

    // const parents = student.parentStudents.map((relation) => relation.parent) never used

    return (
        <main className="min-h-dvh bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl space-y-6">
                <header>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Student Portal
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                        My Profile
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                        View your personal, contact, school, and enrollment
                        information.
                    </p>
                </header>

                {/* StudentProfile presentation component goes here */}
            </div>
        </main>
    )
}