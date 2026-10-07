
import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import ExamsManager from "@/components/exams/ExamsManager"

export default async function ExamsPage() {
    await requirePermission("exams.read")

    const db = await getSchoolDB()

    const departments =
        await db.query.departments.findMany({
            with: {
                subjects: true,
            },
            orderBy: (departments, { asc }) =>
                asc(departments.name),
        })

    const classes =
        await db.query.schoolClases.findMany({
            orderBy: (schoolClases, { asc }) =>
                asc(schoolClases.gradeLevel),
        })

    return (
        <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">
            <div className="mx-auto max-w-6xl">

                <h1 className="text-3xl font-bold">
                    Exams
                </h1>

                <p className="mt-2 text-gray-600">
                    Manage school exams.
                </p>

                <ExamsManager
                    departments={departments}
                    classes={classes}
                />

            </div>
        </main>
    )
}