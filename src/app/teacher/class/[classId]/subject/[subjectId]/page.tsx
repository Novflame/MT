import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/auth/auth"

type PageProps = {
    params: Promise<{
        classId: string
        subjectId: string
    }>
}

export default async function TeacherSubjectPage({
    params,
}: PageProps) {

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
    // Route params
    // =========================

    const {
        classId,
        subjectId,
    } = await params


    // =========================
    // Validate params
    // =========================

    if (!classId || !subjectId) {
        redirect("/teacher")
    }


    // =========================
    // Page
    // =========================

    return (
        <main className="min-h-screen bg-gray-100 p-4 sm:p-8">

            <div className="mx-auto min-w-0 max-w-6xl">

                <header className="mb-8">

                    <h1 className="break-words text-2xl font-bold sm:text-3xl">
                        Teaching Class
                    </h1>

                    <p className="mt-2 break-all text-sm text-gray-500">
                        Class ID: {classId}
                    </p>

                    <p className="break-all text-sm text-gray-500">
                        Subject ID: {subjectId}
                    </p>

                </header>


                <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                    <ActionCard
                        href={`/teacher/class/${classId}/subject/${subjectId}/attendance`}
                        title="Attendance"
                        description="Take and manage student attendance"
                    />

                    <ActionCard
                        href={`/teacher/class/${classId}/subject/${subjectId}/exams`}
                        title="Exams"
                        description="Manage exams and student results"
                    />

                </section>

            </div>

        </main>
    )
}


function ActionCard({
    href,
    title,
    description,
}: {
    href: string
    title: string
    description: string
}) {

    return (
        <a
            href={href}
            className="block min-w-0 rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
        >

            <h2 className="break-words text-lg font-semibold sm:text-xl">
                {title}
            </h2>

            <p className="mt-2 break-words text-sm text-gray-600">
                {description}
            </p>

            <span className="mt-4 inline-block text-sm font-medium">
                Open 
            </span>

        </a>
    )
}