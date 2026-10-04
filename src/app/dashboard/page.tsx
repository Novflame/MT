import { redirect } from "next/navigation"
import { headers } from "next/headers"
import DashboardOverview from "@/components/dashboard/DashboardOverview"

import { auth } from "@/auth/auth"
import DashboardShell from "@/components/dashboard/DashboardShell"

export default async function DashboardPage() {

    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        redirect("/login")
    }

    const role = session.user.schoolRole

    if (
        role === "teacher" ||
        role === "head_of_class"
    ) {
        redirect("/teacher")
    }

    if (role === "parent") {
        redirect("/parent")
    }

    if (role === "student") {
        redirect("/student")
    }

    if (role === "head_of_department") {
    redirect("/head-of-department")
}

    if (
        role !== "principal" &&
        role !== "deputy"
    ) {
        redirect("/")
    }

    return (

        <DashboardShell>

    <div className="mx-auto max-w-[1600px]">

        <div className="mb-8">

            <p className="text-sm font-medium text-slate-500">
                School Overview
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
                Welcome back, {session.user.name}
            </p>

        </div>

        <DashboardOverview />

    </div>

</DashboardShell>
    )
}