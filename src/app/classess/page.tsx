
import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import ClassesManager from "@/components/classess/ClassesManager"

export default async function ClassesPage() {
    await requirePermission("classes.read")

    const db = await getSchoolDB()

    const classes =
        await db.query.schoolClases.findMany({
            orderBy: (schoolClases, { asc }) =>
                asc(schoolClases.gradeLevel),
        })

    return (
        <main className="min-w-0">
            <div className="mx-auto w-full max-w-6xl">
                <div className="mb-6 sm:mb-8 bg-blue-800">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 dark:text-white sm:text-3xl">
                        Classes
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 dark:text-slate-400 sm:text-base">
                        Manage your school classes and
                        organize students by grade level.
                    </p>
                </div>

                <ClassesManager
                    classes={classes.map(
                        (schoolClass) => ({
                            id: schoolClass.id,
                            name: schoolClass.name,
                            gradeLevel:
                                schoolClass.gradeLevel,
                        }),
                    )}
                />
            </div>
        </main>
    )
}

