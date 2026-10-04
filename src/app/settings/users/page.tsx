
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type SchoolUser = {
    id: string
    name: string
    email: string
    schoolRole: string
    banned: boolean | number
}

export default function UsersSettingsPage() {

    const [users, setUsers] =
        useState<SchoolUser[]>([])

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState("")


    // =========================================
    // Load users
    // =========================================

    useEffect(() => {

        async function loadUsers() {

            try {

                const response =
                    await fetch(
                        "/api/settings/users",
                    )

                const result =
                    await response.json()


                if (!response.ok) {

                    setError(
                        result.error ??
                        "Failed to load users",
                    )

                    return
                }


                setUsers(
                    result.users ?? [],
                )

            } catch (error) {

                console.error(
                    "Failed to load users:",
                    error,
                )

                setError(
                    "Failed to load users",
                )

            } finally {

                setLoading(false)

            }
        }


        loadUsers()

    }, [])


    // =========================================
    // Loading
    // =========================================

    if (loading) {

        return (
            <main className="min-h-screen bg-slate-50 p-6">

                <div className="mx-auto max-w-6xl">

                    <p className="text-sm text-slate-500">
                        Loading users...
                    </p>

                </div>

            </main>
        )
    }


    // =========================================
    // Render
    // =========================================

    return (
        <main className="min-h-screen bg-slate-50 p-6">

            <div className="mx-auto max-w-6xl">


                {/* Header */}

                <div
                    className="
                        mb-8
                        flex
                        items-start
                        justify-between
                        gap-4
                    "
                >

                    <div>

                        <h1
                            className="
                                text-2xl
                                font-bold
                                text-slate-900
                            "
                        >
                            Users
                        </h1>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            Manage staff members who have
                            access to your school system.
                        </p>

                    </div>


                    {/* Add User */}

                    <Link
                        href="/settings/users/new"
                        className="
                            rounded-lg
                            bg-slate-900
                            px-4
                            py-2.5
                            text-sm
                            font-medium
                            text-white
                            hover:bg-slate-800
                        "
                    >
                        Add User
                    </Link>

                </div>


                {/* Error */}

                {error && (

                    <div
                        className="
                            mb-6
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


                {/* Users */}

                <div
                    className="
                        overflow-hidden
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        shadow-sm
                    "
                >

                    {/* Section header */}

                    <div
                        className="
                            border-b
                            border-slate-200
                            px-6
                            py-4
                        "
                    >

                        <h2
                            className="
                                text-lg
                                font-semibold
                                text-slate-900
                            "
                        >
                            School Staff
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            {users.length} user
                            {users.length === 1
                                ? ""
                                : "s"}
                        </p>

                    </div>


                    {/* Empty */}

                    {users.length === 0 ? (

                        <div
                            className="
                                px-6
                                py-12
                                text-center
                            "
                        >

                            <p
                                className="
                                    text-sm
                                    font-medium
                                    text-slate-700
                                "
                            >
                                No staff users found.
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Add a staff member to give
                                them access to the system.
                            </p>

                            <Link
                                href="/settings/users/new"
                                className="
                                    mt-4
                                    inline-block
                                    text-sm
                                    font-medium
                                    text-slate-900
                                    underline
                                "
                            >
                                Add staff user
                            </Link>

                        </div>

                    ) : (

                        <div className="overflow-x-auto">

                            <table className="w-full">

                                <thead>

                                    <tr
                                        className="
                                            border-b
                                            border-slate-200
                                            bg-slate-50
                                        "
                                    >

                                        <th
                                            className="
                                                px-6
                                                py-3
                                                text-left
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wider
                                                text-slate-500
                                            "
                                        >
                                            User
                                        </th>

                                        <th
                                            className="
                                                px-6
                                                py-3
                                                text-left
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wider
                                                text-slate-500
                                            "
                                        >
                                            Role
                                        </th>

                                        <th
                                            className="
                                                px-6
                                                py-3
                                                text-left
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wider
                                                text-slate-500
                                            "
                                        >
                                            Status
                                        </th>

                                        <th
                                            className="
                                                px-6
                                                py-3
                                                text-right
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wider
                                                text-slate-500
                                            "
                                        >
                                            Actions
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {users.map(
                                        (schoolUser) => {

                                            const isBanned =
                                                Boolean(
                                                    schoolUser.banned,
                                                )

                                            return (

                                                <tr
                                                    key={
                                                        schoolUser.id
                                                    }
                                                    className="
                                                        border-b
                                                        border-slate-100
                                                        last:border-0
                                                    "
                                                >

                                                    {/* User */}

                                                    <td
                                                        className="
                                                            px-6
                                                            py-4
                                                        "
                                                    >

                                                        <div
                                                            className="
                                                                font-medium
                                                                text-slate-900
                                                            "
                                                        >
                                                            {
                                                                schoolUser.name
                                                            }
                                                        </div>

                                                        <div
                                                            className="
                                                                mt-1
                                                                text-sm
                                                                text-slate-500
                                                            "
                                                        >
                                                            {
                                                                schoolUser.email
                                                            }
                                                        </div>

                                                    </td>


                                                    {/* Role */}

                                                    <td
                                                        className="
                                                            px-6
                                                            py-4
                                                        "
                                                    >

                                                        <span
                                                            className="
                                                                rounded-full
                                                                bg-slate-100
                                                                px-3
                                                                py-1
                                                                text-xs
                                                                font-medium
                                                                text-slate-700
                                                            "
                                                        >
                                                            {
                                                                schoolUser.schoolRole
                                                            }
                                                        </span>

                                                    </td>


                                                    {/* Status */}

                                                    <td
                                                        className="
                                                            px-6
                                                            py-4
                                                        "
                                                    >

                                                        {isBanned ? (

                                                            <span
                                                                className="
                                                                    rounded-full
                                                                    bg-red-100
                                                                    px-3
                                                                    py-1
                                                                    text-xs
                                                                    font-medium
                                                                    text-red-700
                                                                "
                                                            >
                                                                Disabled
                                                            </span>

                                                        ) : (

                                                            <span
                                                                className="
                                                                    rounded-full
                                                                    bg-green-100
                                                                    px-3
                                                                    py-1
                                                                    text-xs
                                                                    font-medium
                                                                    text-green-700
                                                                "
                                                            >
                                                                Active
                                                            </span>

                                                        )}

                                                    </td>


                                                    {/* Actions */}

                                                    <td
                                                        className="
                                                            px-6
                                                            py-4
                                                            text-right
                                                        "
                                                    >

                                                        <Link
                                                            href={
                                                                `/settings/users/${schoolUser.id}`
                                                            }
                                                            className="
                                                                text-sm
                                                                font-medium
                                                                text-slate-600
                                                                hover:text-slate-900
                                                            "
                                                        >
                                                            Manage
                                                        </Link>

                                                    </td>

                                                </tr>

                                            )

                                        },
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

        </main>
    )
}

