import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { parents } from "@/db/schema"
import { requireSession } from "@/auth/session"
import { getSchoolDB, getActiveAcademicYear } from "@/db"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getStudentFullName } from "@/lib/student-name"

export default async function ParentProfilePage() {
    const session = await requireSession()

    if (session.user.schoolRole !== "parent") {
        redirect("/")
    }

    const db = await getSchoolDB()
    const academicYear =
        await getActiveAcademicYear()

    const [account, parent] =
        await Promise.all([
            centralDb.query.user.findFirst({
                where: eq(
                    user.id,
                    session.user.id,
                ),
            }),

            db.query.parents.findFirst({
                where: eq(
                    parents.userId,
                    session.user.id,
                ),
                with: {
                    parentStudents: {
                        with: {
                            student: true,
                        },
                    },
                },
            }),
        ])

    if (!account || !parent) {
        redirect("/")
    }

    const children =
        await Promise.all(
            parent.parentStudents.map(
                async (relation) => {
                    const enrollment =
                        await db.query.studentEnrollments.findFirst(
                            {
                                where: (
                                    enrollment,
                                    { and, eq },
                                ) =>
                                    and(
                                        eq(
                                            enrollment.studentId,
                                            relation.student.id,
                                        ),
                                        eq(
                                            enrollment.academicYearId,
                                            academicYear.id,
                                        ),
                                    ),
                                with: {
                                    class: true,
                                    academicYear: true,
                                },
                            },
                        )

                    return {
                        id: relation.student.id,
                        name:
                            getStudentFullName(
                                relation.student,
                            ),
                        admissionNumber:
                            relation.student
                                .admissionNumber,
                        className:
                            enrollment?.class
                                .name ?? null,
                        gradeLevel:
                            enrollment?.class
                                .gradeLevel ??
                            null,
                        academicYear:
                            enrollment
                                ?.academicYear
                                ?.name ?? null,
                    }
                },
            ),
        )

    return (
        <main className="min-h-dvh bg-slate-100 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <header>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Parent Portal
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                        My Profile
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                        View your account information and
                        the children linked to your parent
                        account.
                    </p>
                </header>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {parent.name
                                .split(" ")
                                .map(
                                    (part) =>
                                        part[0],
                                )
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                            <h2 className="break-words text-2xl font-bold">
                                {parent.name}
                            </h2>

                            <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                                {account.email}
                            </p>

                            <span className="mt-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                Parent
                            </span>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Phone
                        </p>

                        <p className="mt-2 break-words text-lg font-semibold">
                            {parent.phone}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Linked children
                        </p>

                        <p className="mt-2 text-lg font-semibold">
                            {children.length}
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                        <h2 className="text-lg font-bold">
                            My Children
                        </h2>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Students currently linked to
                            your parent account.
                        </p>
                    </div>

                    {children.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                            <p className="font-medium text-slate-700 dark:text-slate-200">
                                No children linked
                            </p>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                No student is currently
                                linked to this parent
                                account.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {children.map(
                                (child) => (
                                    <div
                                        key={
                                            child.id
                                        }
                                        className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="break-words text-base font-semibold">
                                                {
                                                    child.name
                                                }
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                Admission
                                                number:{" "}
                                                {
                                                    child.admissionNumber
                                                }
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2 sm:justify-end">
                                            {child.className ? (
                                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                    {
                                                        child.className
                                                    }
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    No active
                                                    class
                                                </span>
                                            )}

                                            {child.academicYear ? (
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {
                                                        child.academicYear
                                                    }
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}