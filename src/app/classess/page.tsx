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
        <main className="min-h-screen p-8">

            <div className="mx-auto max-w-5xl bg-gray-500">

                <h1 className="text-3xl font-bold">
                    Classes
                </h1>

                <p className="mt-2 text-gray-600">
                    Manage your school classes.
                </p>

                <div className="mt-8 bg-gray-500">
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

            </div>

        </main>
    )
}