"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { authClient } from "@/auth/auth-client"

export default function LoginForm() {
    const router = useRouter()
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
                error.message ?? "Login failed. Please check your details and try again.",
            )
            setLoading(false)
            return
        }

        setPassword("")
        setEmail("")
        router.push("/dashboard")
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40"
        >
            <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-200/80 dark:bg-blue-500 dark:shadow-blue-950/40">
                    SM
                </div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                    School Management
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
                    Welcome back
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Sign in to manage your school and continue where you left off.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                        Email address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        aria-invalid={Boolean(error)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                    />
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        aria-invalid={Boolean(error)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
                {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Don&apos;t have a school account?{" "}
                <Link
                    href="/register"
                    className="font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                    Create a school
                </Link>
            </p>
        </form>
    )
}
