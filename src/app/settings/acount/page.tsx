"use client"

import { useEffect, useState } from "react"

type AccountUser = {
    name: string
    email: string
    schoolRole: string
}

export default function AccountSettingsPage() {

    const [user, setUser] = useState<AccountUser | null>(null)

    const [name, setName] = useState("")

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")


    // =========================================
    // Load account
    // =========================================

    useEffect(() => {

        async function loadAccount() {

            try {

                const response = await fetch(
                    "/api/account",
                )

                const result =
                    await response.json()

                if (!response.ok) {

                    setError(
                        result.error ??
                        "Failed to load account",
                    )

                    return
                }

                setUser(result.user)

                setName(
                    result.user.name,
                )

            } catch (error) {

                console.error(error)

                setError(
                    "Failed to load account",
                )

            } finally {

                setLoading(false)

            }
        }

        loadAccount()

    }, [])


    // =========================================
    // Save account
    // =========================================

    async function handleSave(
        event: React.FormEvent<HTMLFormElement>,
    ) {

        event.preventDefault()

        setError("")
        setSuccess("")
        setSaving(true)

        try {

            const response = await fetch(
                "/api/account",
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        name,
                    }),
                },
            )

            const result =
                await response.json()

            if (!response.ok) {

                setError(
                    result.error ??
                    "Failed to update account",
                )

                return
            }

            setUser(result.user)

            setName(
                result.user.name,
            )

            setSuccess(
                "Account information updated successfully.",
            )

        } catch (error) {

            console.error(error)

            setError(
                "Something went wrong. Please try again.",
            )

        } finally {

            setSaving(false)

        }
    }


    // =========================================
    // Loading
    // =========================================

    if (loading) {

        return (
            <main className="min-h-screen bg-slate-50 p-6">

                <div className="mx-auto max-w-4xl">

                    <p className="text-sm text-slate-500">
                        Loading account information...
                    </p>

                </div>

            </main>
        )
    }


    // =========================================
    // Error
    // =========================================

    if (error && !user) {

        return (
            <main className="min-h-screen bg-slate-50 p-6">

                <div className="mx-auto max-w-4xl">

                    <div className="
                        rounded-xl
                        border border-red-200
                        bg-red-50
                        p-6
                        text-sm
                        text-red-600
                    ">
                        {error}
                    </div>

                </div>

            </main>
        )
    }


    if (!user) {
        return null
    }


    // =========================================
    // Render
    // =========================================

    return (
        <main className="min-h-screen bg-slate-50 p-6">

            <div className="mx-auto max-w-4xl">

                {/* Header */}

                <div className="mb-8">

                    <h1 className="
                        text-2xl
                        font-bold
                        text-slate-900
                    ">
                        Account
                    </h1>

                    <p className="
                        mt-1
                        text-sm
                        text-slate-500
                    ">
                        Manage your personal account information.
                    </p>

                </div>


                {/* Account form */}

                <form
                    onSubmit={handleSave}
                    className="
                        rounded-xl
                        border border-slate-200
                        bg-white
                        shadow-sm
                    "
                >

                    <div className="
                        border-b
                        border-slate-200
                        p-6
                    ">

                        <h2 className="
                            text-lg
                            font-semibold
                            text-slate-900
                        ">
                            Personal Information
                        </h2>

                        <p className="
                            mt-1
                            text-sm
                            text-slate-500
                        ">
                            Update the information associated
                            with your account.
                        </p>

                    </div>


                    <div className="space-y-6 p-6">

                        {/* Name */}

                        <div>

                            <label
                                htmlFor="account-name"
                                className="
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                "
                            >
                                Name
                            </label>

                            <input
                                id="account-name"
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
                                htmlFor="account-email"
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
                                id="account-email"
                                type="email"
                                value={user.email}
                                readOnly
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    bg-slate-50
                                    px-3
                                    py-2.5
                                    text-sm
                                    text-slate-500
                                "
                            />

                            <p className="
                                mt-2
                                text-xs
                                text-slate-500
                            ">
                                Email changes should be handled
                                through the account security flow.
                            </p>

                        </div>


                        {/* Role */}

                        <div>

                            <label
                                htmlFor="account-role"
                                className="
                                    block
                                    text-sm
                                    font-medium
                                    text-slate-700
                                "
                            >
                                School Role
                            </label>

                            <input
                                id="account-role"
                                type="text"
                                value={user.schoolRole}
                                readOnly
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    bg-slate-50
                                    px-3
                                    py-2.5
                                    text-sm
                                    text-slate-500
                                "
                            />

                        </div>


                        {/* Error */}

                        {error && (

                            <div className="
                                rounded-lg
                                border border-red-200
                                bg-red-50
                                px-4 py-3
                                text-sm
                                text-red-600
                            ">
                                {error}
                            </div>

                        )}


                        {/* Success */}

                        {success && (

                            <div className="
                                rounded-lg
                                border border-green-200
                                bg-green-50
                                px-4 py-3
                                text-sm
                                text-green-700
                            ">
                                {success}
                            </div>

                        )}

                    </div>


                    {/* Footer */}

                    <div className="
                        flex
                        justify-end
                        border-t
                        border-slate-200
                        p-6
                    ">

                        <button
                            type="submit"
                            disabled={saving}
                            className="
                                rounded-lg
                                bg-slate-900
                                px-5 py-2.5
                                text-sm
                                font-medium
                                text-white
                                hover:bg-slate-800
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            {saving
                                ? "Saving..."
                                : "Save Changes"}
                        </button>

                    </div>

                </form>

            </div>

        </main>
    )
}