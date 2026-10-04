
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"


export default function NewUserPage() {

    const router = useRouter()

    const [name, setName] =
        useState("")

    const [email, setEmail] =
        useState("")

    const [password, setPassword] =
        useState("")

    const [schoolRole, setSchoolRole] =
        useState("teacher")

    const [saving, setSaving] =
        useState(false)

    const [error, setError] =
        useState("")


    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {

        event.preventDefault()

        setError("")
        setSaving(true)


        try {

            const response =
                await fetch(
                    "/api/settings/users",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            name,
                            email,
                            password,
                            schoolRole,
                        }),
                    },
                )


            const result =
                await response.json()


            if (!response.ok) {

                setError(
                    result.error ??
                    "Failed to create user.",
                )

                return
            }


            router.push(
                "/settings/users",
            )

        } catch (error) {

            console.error(
                "Failed to create user:",
                error,
            )

            setError(
                "Something went wrong. Please try again.",
            )

        } finally {

            setSaving(false)

        }
    }


    return (
        <main className="min-h-screen bg-slate-50 p-6">

            <div className="mx-auto max-w-3xl">


                {/* Header */}

                <div className="mb-8">

                    <Link
                        href="/settings/users"
                        className="
                            text-sm
                            text-slate-500
                            hover:text-slate-900
                        "
                    >
                        ← Back to Users
                    </Link>


                    <h1
                        className="
                            mt-4
                            text-2xl
                            font-bold
                            text-slate-900
                        "
                    >
                        Add Staff User
                    </h1>


                    <p
                        className="
                            mt-1
                            text-sm
                            text-slate-500
                        "
                    >
                        Create an account for a staff
                        member of your school.
                    </p>

                </div>


                {/* Form */}

                <form
                    onSubmit={handleSubmit}
                    className="
                        overflow-hidden
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        shadow-sm
                    "
                >

                    {/* Section */}

                    <div
                        className="
                            border-b
                            border-slate-200
                            p-6
                        "
                    >

                        <h2
                            className="
                                text-lg
                                font-semibold
                                text-slate-900
                            "
                        >
                            Account Information
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            Enter the login information
                            for this staff member.
                        </p>

                    </div>


                    <div className="space-y-6 p-6">


                        {/* Name */}

                        <div>

                            <label
                                htmlFor="name"
                                className="
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                "
                            >
                                Full Name
                            </label>

                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(event) =>
                                    setName(
                                        event.target.value,
                                    )
                                }
                                required
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    px-3
                                    py-2.5
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-slate-500
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
                            />

                        </div>


                        {/* Email */}

                        <div>

                            <label
                                htmlFor="email"
                                className="
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                "
                            >
                                Email
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(
                                        event.target.value,
                                    )
                                }
                                required
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    px-3
                                    py-2.5
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-slate-500
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
                            />

                        </div>


                        {/* Password */}

                        <div>

                            <label
                                htmlFor="password"
                                className="
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                "
                            >
                                Temporary Password
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value,
                                    )
                                }
                                required
                                minLength={8}
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    px-3
                                    py-2.5
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-slate-500
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
                            />

                            <p
                                className="
                                    mt-2
                                    text-xs
                                    text-slate-500
                                "
                            >
                                Minimum 8 characters.
                            </p>

                        </div>


                        {/* Role */}

                        <div>

                            <label
                                htmlFor="school-role"
                                className="
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                "
                            >
                                School Role
                            </label>

                            <select
                                id="school-role"
                                value={schoolRole}
                                onChange={(event) =>
                                    setSchoolRole(
                                        event.target.value,
                                    )
                                }
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    bg-white
                                    px-3
                                    py-2.5
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-slate-500
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
                            >

                                <option value="teacher">
                                    Teacher
                                </option>

                                <option value="head_of_class">
                                    Head of Class
                                </option>

                                <option value="head_of_department">
                                    Head of Department
                                </option>

                                <option value="deputy">
                                    Deputy
                                </option>

                                <option value="principal">
                                    Principal
                                </option>

                            </select>

                        </div>


                        {/* Error */}

                        {error && (

                            <div
                                className="
                                    rounded-lg
                                    border
                                    border-red-200
                                    bg-red-50
                                    px-4
                                    py-3
                                    text-sm
                                    text-red-600
                                "
                            >
                                {error}
                            </div>

                        )}

                    </div>


                    {/* Footer */}

                    <div
                        className="
                            flex
                            justify-between
                            border-t
                            border-slate-200
                            p-6
                        "
                    >

                        <Link
                            href="/settings/users"
                            className="
                                rounded-lg
                                border
                                border-slate-300
                                bg-white
                                px-5
                                py-2.5
                                text-sm
                                font-medium
                                text-slate-700
                                hover:bg-slate-50
                            "
                        >
                            Cancel
                        </Link>


                        <button
                            type="submit"
                            disabled={saving}
                            className="
                                rounded-lg
                                bg-slate-900
                                px-5
                                py-2.5
                                text-sm
                                font-medium
                                text-white
                                hover:bg-slate-800
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            {saving
                                ? "Creating..."
                                : "Create User"}
                        </button>

                    </div>

                </form>

            </div>

        </main>
    )
}

