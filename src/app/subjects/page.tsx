import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import DepartmentsManager from "@/components/departments/DepartmentsManager"
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
    <main className="min-h-screen bg-gray-100 p-8">

        <div className="mx-auto max-w-5xl">

            <h1 className="text-3xl font-bold">
                Subjects & Departments
            </h1>

            <p className="mt-2 text-gray-600">
                Manage the subjects offered
                by your school.
            </p>

            <div className="mt-8">
                <DepartmentsManager
                    departments={departments.map(
                        (department) => ({
                            id: department.id,
                            name: department.name,
                        }),
                    )}
                />
            </div>

            <div className="mt-8">
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

        </div>

    </main>
)


}
