
import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import StudentProfile from "@/components/students/StudentProfile"
type Props = {
    params: Promise<{
        id: string
    }>
}


export default async function StudentProfilePage({
    params,
}: Props) {

    await requirePermission(
        "students.read",
    )


    const { id } =
        await params


    const db =
        await getSchoolDB()


    const student =
        await db.query.students.findFirst({

            where: (
                student,
                { eq },
            ) =>
                eq(
                    student.id,
                    id,
                ),

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
        })


    if (!student) {

        return (
            <main className="min-h-screen bg-slate-950 text-white p-8">

                <div className="mx-auto max-w-5xl">

                    <h1 className="text-2xl font-bold">
                        Student not found
                    </h1>

                    <p className="mt-2 text-slate-400">
                        The requested student does not exist.
                    </p>

                </div>

            </main>
        )
    }


    return (
        <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8">

            <div className="mx-auto max-w-7xl">

                <StudentProfile
                    studentId={student.id}
                />

            </div>

        </main>
    )
}