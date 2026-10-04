import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/auth/auth"
import StaffForm from "@/components/staffForm"

export default async function StaffPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        redirect("/login")
    }

    if (
        session.user.schoolRole !== "principal" &&
        session.user.schoolRole !== "deputy"
    ) {
        redirect("/dashboard")
    }

    return (
        <main className="min-h-screen bg-gray-500 p-8">
            <div className="mx-auto max-w-5xl space-y-6">

                <header>
                    <h1 className="text-3xl font-bold">
                        Staff
                    </h1>

                    <p className="mt-2 text-blue-600">
                        School staff members
                    </p>
                </header>

                <StaffForm />

            </div>
        </main>
    )
}
