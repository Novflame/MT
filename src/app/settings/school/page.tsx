"use client"

import { useEffect, useState } from "react"

type School = {
    id: number
    name: string
    slug: string
    logo: string | null
    address: string | null
}

export default function SchoolSettingsPage() {

    const [school, setSchool] = useState<School | null>(null)

    const [loading, setLoading] = useState(true)

    const [error, setError] = useState("")


    useEffect(() => {

        async function loadSchool() {

            try {

                const response = await fetch(
                    "/api/school",
                )

                const result = await response.json()

                if (!response.ok) {
                    setError(
                        result.error ??
                        "Failed to load school",
                    )
                    return
                }

                setSchool(result.school)

            } catch (error) {

                console.error(error)

                setError(
                    "Failed to load school",
                )

            } finally {

                setLoading(false)

            }
        }

        loadSchool()

    }, [])


    if (loading) {

        return (
            <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">

                <div className="mx-auto w-full max-w-4xl">

                    <p className="text-sm text-slate-500">
                        Loading school information...
                    </p>

                </div>

            </main>
        )
    }


    if (error || !school) {

        return (
            <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">

                <div className="mx-auto w-full max-w-4xl">

                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-6">

                        <p className="text-sm text-red-600">
                            {error || "School not found"}
                        </p>

                    </div>

                </div>

            </main>
        )
    }


    return (
        <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">

            <div className="mx-auto w-full max-w-4xl">

                {/* Header */}

                <div className="mb-8">

                    <h1 className="text-2xl font-bold text-slate-900">
                        School Profile
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage your school identity and information.
                    </p>

                </div>


                {/* School Identity */}

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-200 p-4 sm:p-6">

                        <h2 className="text-lg font-semibold text-slate-900">
                            School Identity
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            This information will appear throughout
                            the school management system.
                        </p>

                    </div>


                    <div className="space-y-6 p-4 sm:p-6">

                        {/* Logo */}

                        <div>

                            <label className="block text-sm font-medium text-slate-700">
                                School Logo
                            </label>

                            <div className="mt-3 flex flex-wrap items-center gap-4">

                                <div
                                    className="
                                        flex h-20 w-20
                                        items-center justify-center
                                        overflow-hidden
                                        rounded-xl
                                        border border-slate-200
                                        bg-slate-50
                                    "
                                >

                                    {school.logo ? (

                                        <img
                                            src={school.logo}
                                            alt={`${school.name} logo`}
                                            className="h-full w-full object-contain"
                                        />

                                    ) : (

                                        <span className="text-sm font-semibold text-slate-400">
                                            Logo
                                        </span>

                                    )}

                                </div>


                                <div>

                                    <button
                                        type="button"
                                        className="
                                            w-full sm:w-auto
                                            rounded-lg
                                            border border-slate-300
                                            bg-white
                                            px-4 py-2
                                            text-sm font-medium
                                            text-slate-700
                                            hover:bg-slate-50
                                        "
                                    >
                                        Upload Logo
                                    </button>

                                    <p className="mt-2 text-xs text-slate-500">
                                        PNG, JPG or WebP. Maximum 2 MB.
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* School Name */}

                        <div>

                            <label
                                htmlFor="school-name"
                                className="block text-sm font-medium text-slate-700"
                            >
                                School Name
                            </label>

                            <input
                                id="school-name"
                                type="text"
                                defaultValue={school.name}
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border border-slate-300
                                    bg-white
                                    px-3 py-2.5
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-slate-500
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
                            />

                        </div>


                        {/* Address */}

                        <div>

                            <label
                                htmlFor="school-address"
                                className="block text-sm font-medium text-slate-700"
                            >
                                School Address
                            </label>

                            <input
                                id="school-address"
                                type="text"
                                defaultValue={school.address ?? ""}
                                placeholder="School address"
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border border-slate-300
                                    bg-white
                                    px-3 py-2.5
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-slate-500
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
                            />

                        </div>


                        {/* Slug */}

                        <div>

                            <label
                                htmlFor="school-slug"
                                className="block text-sm font-medium text-slate-700"
                            >
                                School Slug
                            </label>

                            <input
                                id="school-slug"
                                type="text"
                                value={school.slug}
                                readOnly
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border border-slate-300
                                    bg-slate-50
                                    px-3 py-2.5
                                    text-sm
                                    text-slate-500
                                    outline-none
                                "
                            />

                            <p className="mt-2 text-xs text-slate-500">
                                The slug identifies your school in the system.
                            </p>

                        </div>

                    </div>


                    {/* Footer */}

                    <div className="flex justify-end border-t border-slate-200 p-4 sm:p-6">

                        <button
                            type="button"
                            className="
                                rounded-lg
                                bg-slate-900
                                px-5 py-2.5
                                text-sm font-medium
                                text-white
                                hover:bg-slate-800
                            "
                        >
                            Save Changes
                        </button>

                    </div>

                </section>

            </div>

        </main>
    )
}