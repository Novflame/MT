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

    <div className="mx-auto w-full min-w-0 max-w-[1600px]">

        <header className="mb-6 space-y-1 sm:mb-8">

            <p className="text-sm font-medium text-slate-500">
                School Overview
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Dashboard
            </h1>

            <p className="text-sm text-slate-500">
                Welcome back, {session.user.name}
            </p>

        </header>

        <DashboardOverview />

    </div>

</DashboardShell>
    )
}