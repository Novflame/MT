import Link from "next/link"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/auth/auth"

type Assignment = {
    teacherId: string
    subjectId: string
    subjectName: string
    classId: string
    className: string
    gradeLevel: number
    teacher: {
        id: string
        name: string
        email: string
    } | null
}

export default async function TeacherPage() {

    // =========================
    // Authentication
    // =========================

    const session =
        await auth.api.getSession({
            headers: await headers(),
        })

    if (!session) {
        redirect("/login")
    }


    // =========================
    // Authorization
    // =========================

    if (
        session.user.schoolRole !== "teacher" &&
        session.user.schoolRole !== "head_of_class"
    ) {
        redirect("/")
    }


    // =========================
    // Get assignments
    // =========================

    const response =
        await fetch(
            "http://localhost:3000/api/teacher-assignments",
            {
                headers: {
                    cookie:
                        (await headers()).get(
                            "cookie",
                        ) ?? "",
                },

                cache: "no-store",
            },
        )


    if (!response.ok) {
    // const error = await response.text()

    
    throw new Error(
        "Failed to load teacher assignments",
    )
}


    const data =
        await response.json()


    const assignments:
        Assignment[] =
        data.assignments ?? []


    // =========================
    // Dashboard
    // =========================

    return (
        <main className="min-h-screen bg-gray-100 p-4 sm:p-8">

            <div className="mx-auto min-w-0 max-w-6xl">

                {/* Header */}

                <header className="mb-8">

                    <h1 className="break-words text-2xl font-bold sm:text-3xl">
                        Teacher Dashboard
                    </h1>

                    <p className="mt-2 break-words text-gray-600">
                        Welcome,{" "}
                        {session.user.name}
                    </p>

                </header>


                {/* Statistics */}

                <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                    <StatCard
                        title="Classes"
                        value={
                            new Set(
                                assignments.map(
                                    assignment =>
                                        assignment.classId,
                                ),
                            ).size
                        }
                    />

                    <StatCard
                        title="Subjects"
                        value={
                            new Set(
                                assignments.map(
                                    assignment =>
                                        assignment.subjectId,
                                ),
                            ).size
                        }
                    />

                    <StatCard
                        title="Assignments"
                        value={
                            assignments.length
                        }
                    />

                </section>


                {/* Assignments */}

                <section>

                    <h2 className="mb-4 text-xl font-semibold sm:text-2xl">
                        My Teaching Assignments
                    </h2>


                    {assignments.length === 0 ? (

                        <div className="rounded-lg border bg-white p-6">

                            <p className="text-gray-600">
                                You have no teaching
                                assignments for the
                                current academic year.
                            </p>

                        </div>

                    ) : (

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                            {assignments.map(
                                assignment => (

                                    <AssignmentCard
                                        key={`${assignment.classId}-${assignment.subjectId}`}
                                        assignment={
                                            assignment
                                        }
                                    />

                                ),
                            )}

                        </div>

                    )}

                </section>

            </div>

        </main>
    )
}


// =====================================================
// Stat Card
// =====================================================

function StatCard({
    title,
    value,
}: {
    title: string
    value: number
}) {

    return (

        <div className="rounded-lg border bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
                {title}
            </p>

            <p className="mt-2 text-3xl font-bold">
                {value}
            </p>

        </div>
    )
}


// =====================================================
// Assignment Card
// =====================================================

function AssignmentCard({
    assignment,
}: {
    assignment: Assignment
}) {

    return (

        <Link
            href={
                `/teacher/class/${assignment.classId}/subject/${assignment.subjectId}`
            }
            className="block rounded-lg border bg-white p-6 shadow-sm transition hover:shadow-md"
        >

            <h3 className="break-words text-lg font-semibold sm:text-xl">
                {assignment.className}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
                Grade {assignment.gradeLevel}
            </p>

            <div className="mt-4">

                <p className="break-words font-medium">
                    {assignment.subjectName}
                </p>

            </div>

            <p className="mt-4 text-sm text-blue-700 font-medium">
                Open class 
            </p>

        </Link>
    )
}