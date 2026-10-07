
import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import SubjectsManager from "@/components/subjects/SubjectsManager"

export default async function SubjectsPage() {
    await requirePermission("subjects.read")

    const db = await getSchoolDB()

    const departments =
        await db.query.departments.findMany({
            with: {
                subjects: true,
            },
            orderBy: (departments, { asc }) =>
                asc(departments.name),
        })

    const subjects = departments.flatMap(
        (department) =>
            department.subjects,
    )

    return (
        <main className="min-w-0">
            <div className="mx-auto w-full max-w-6xl">

                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                Academic Management
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                                Subjects
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                                Manage the subjects offered
                                by your school and organize
                                them by academic department.
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Subjects
                                </p>

                                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                                    {subjects.length}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Departments
                                </p>

                                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                                    {departments.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subjects Manager */}
                <SubjectsManager
                    departments={departments.map(
                        (department) => ({
                            id: department.id,
                            name: department.name,
                        }),
                    )}
                    subjects={subjects.map(
                        (subject) => ({
                            id: subject.id,
                            name: subject.name,
                            departmentId:
                                subject.departmentId,
                        }),
                    )}
                />
            </div>
        </main>
    )
}

