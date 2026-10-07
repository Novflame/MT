
import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import DepartmentsManager from "@/components/departments/DepartmentsManager"

export default async function DepartmentsPage() {
    await requirePermission("departments.read")

    const db = await getSchoolDB()

    const departments =
        await db.query.departments.findMany({
            orderBy: (departments, { asc }) =>
                asc(departments.name),
        })

    return (
        <main className="min-w-0">
            <div className="mx-auto w-full max-w-6xl">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        Departments
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                        Create, edit, and manage the
                        academic departments in your
                        school.
                    </p>
                </div>

                <DepartmentsManager
                    departments={departments.map(
                        (department) => ({
                            id: department.id,
                            name: department.name,
                        }),
                    )}
                />
            </div>
        </main>
    )
}

