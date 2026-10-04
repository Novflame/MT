"use client"

import { useState } from "react"
// import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/auth/auth-client"

export default function LoginForm() {
    // const router = useRouter()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>,
    ) {
        e.preventDefault()

        setLoading(true)
        setError("")

       const { error } = await authClient.signIn.email({
    email,
    password,
})

if (error) {

    setError(
        `${error.code ?? "ERROR"}: ${error.message ?? "Login failed"}`
    )

    setLoading(false)
    return
}
setPassword("")
setEmail("")
window.location.href = "/dashboard"

    }
    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-2xl border bg-white p-8 shadow-xl shadow-slate-200/60">
            <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-200">
                    SM
                </div>
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
                    School Management
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                    Welcome back
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Sign in to manage your school and continue where you left off.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                        Email address
                    </label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                        Password
                    </label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full" />
                </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-center text-sm text-slate-500">
                Don&apos;t have a school account?{" "}
                <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                    Create a school
                </Link>
            </p>
        </form>
    )
}
