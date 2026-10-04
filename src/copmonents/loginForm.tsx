"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "../auth/auth-client"

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
            setError(error.message ?? "Login failed")
            setLoading(false)
            return
        }

        router.push("/dashboard")
        router.refresh()
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full max-w-md p-6 border rounded shadow space-y-4"
        >
            <h1 className="text-2xl font-bold text-center">
                School Management System
            </h1>

            <h2 className="text-lg font-semibold">
                Login
            </h2>

            <div>
                <label className="block mb-1">
                    Email
                </label>

                <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                        setEmail(e.target.value)
                    }
                    required
                    className="w-full p-2 border rounded"
                />
            </div>

            <div>
                <label className="block mb-1">
                    Password
                </label>

                <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                        setPassword(e.target.value)
                    }
                    required
                    className="w-full p-2 border rounded"
                />
            </div>

            {error && (
                <p className="text-red-600 text-sm">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white p-2 rounded"
            >
                {loading ? "Signing in..." : "Login"}
            </button>

            <div className="text-center text-sm">
                <span>
                    Don&apos;t have a school account?{" "}
                </span>
                <Link
                    href="/register"
                    className="text-blue-600 hover:underline"
                >
                    Create a school
                </Link>
            </div>
        </form>
    )
}
