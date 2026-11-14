
"use client"

import Image from "next/image"
import logo from "@/logo/logo.png"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useLanguage } from "@/components/providers/LanguageProvider"

export default function SchoolRegisterForm() {
    const router = useRouter()

    const { t } = useLanguage()

    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [principalName, setPrincipalName] =
        useState("")
    const [principalEmail, setPrincipalEmail] =
        useState("")
    const [password, setPassword] = useState("")

    const [loading, setLoading] =
        useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(
        e: FormEvent<HTMLFormElement>,
    ) {
        e.preventDefault()

        setError("")
        setLoading(true)

        const normalizedSlug = slug
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")

        try {
            const response = await fetch(
                "/api/register-school",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        slug: normalizedSlug,
                        principalName:
                            principalName.trim(),
                        principalEmail:
                            principalEmail
                                .trim()
                                .toLowerCase(),
                        password,
                    }),
                },
            )

            const result =
                await response.json()

            if (!response.ok) {
                setError(
                    result.error ??
                        t.register.registrationFailed,
                )
                return
            }

            router.push("/login")
        } catch {
            setError(
                t.register.somethingWentWrong,
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <main
            className="
                min-h-dvh
                w-full
                bg-slate-50
                px-3 py-4
                text-slate-900
                sm:px-5 sm:py-6
                dark:bg-slate-950
                dark:text-white
            "
        >
            <div
                className="
                    flex
                    min-h-[calc(100dvh-2rem)]
                    w-full
                    items-center
                    justify-center
                    sm:min-h-[calc(100dvh-3rem)]
                "
            >
                <section
                    className="
                        w-full
                        max-w-2xl
                        overflow-hidden
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        shadow-xl
                        shadow-blue-950/5
                        dark:border-slate-800
                        dark:bg-slate-900
                    "
                >
                    {/* Header */}
                    <div
                        className="
                            border-b
                            border-slate-200
        bg-linear-to-br
                            from-blue-600
                            to-blue-700
                            px-4 py-6
                            text-center
                            text-white
                            sm:px-8 sm:py-7
                            dark:border-slate-800
                            dark:from-blue-700
                            dark:to-blue-800
                        "
                    >
                        <div
                            className="
                                mx-auto
                                mb-4
                                flex
                                h-14 w-14
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-xl
                                bg-white
                                p-1.5
                                shadow-lg
                                sm:h-16 sm:w-16
                            "
                        >
                            <Image
                                src={logo}
                                alt={
                                    t.register
                                        .schoolManagementSystem
                                }
                                width={64}
                                height={64}
                                className="
                                    h-full
                                    w-full
                                    object-contain
                                "
                                priority
                            />
                        </div>

                        <p
                            className="
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-[0.2em]
                                text-blue-100
                                sm:text-xs
                            "
                        >
                            {
                                t.register
                                    .schoolManagementSystem
                            }
                        </p>

                        <h1
                            className="
                                mt-2
                                text-2xl
                                font-bold
                                tracking-tight
                                sm:text-3xl
                            "
                        >
                            {
                                t.register
                                    .registerYourSchool
                            }
                        </h1>

                        <p
                            className="
                                mx-auto
                                mt-2
                                max-w-lg
                                text-xs
                                leading-5
                                text-blue-100
                                sm:text-sm
                                sm:leading-6
                            "
                        >
                            {
                                t.register
                                    .createAccountDescription
                            }
                        </p>
                    </div>

                    {/* Form */}
                    <div
                        className="
                            px-4 py-5
                            sm:px-8 sm:py-7
                        "
                    >
                        {error && (
                            <div
                                className="
                                    mb-5
                                    rounded-xl
                                    border
                                    border-red-200
                                    bg-red-50
                                    px-3.5 py-3
                                    dark:border-red-900/60
                                    dark:bg-red-950/30
                                "
                                role="alert"
                            >
                                <p
                                    className="
                                        text-xs
                                        font-semibold
                                        text-red-700
                                        dark:text-red-400
                                    "
                                >
                                    {
                                        t.register
                                            .registrationFailed
                                    }
                                </p>

                                <p
                                    className="
                                        mt-1
                                        wrap-break-words
                                        text-xs
                                        leading-5
                                        text-red-600
                                        dark:text-red-300
                                    "
                                >
                                    {error}
                                </p>
                            </div>
                        )}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="
                                grid
                                grid-cols-1
                                gap-4
                                sm:grid-cols-2
                            "
                        >
                            {/* School Name */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="name"
                                    className="
                                        mb-1.5
                                        block
                                        text-xs
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-300
                                    "
                                >
                                    {
                                        t.register
                                            .schoolName
                                    }
                                </label>

                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) =>
                                        setName(
                                            e.target
                                                .value,
                                        )
                                    }
                                    required
                                    autoComplete="organization"
                                    placeholder={
                                        t.register
                                            .schoolNamePlaceholder
                                    }
                                    className="
                                        min-h-11
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3.5
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        placeholder:text-slate-400
                                        focus:border-blue-500
                                        focus:ring-2
                                        focus:ring-blue-100
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-white
                                        dark:placeholder:text-slate-500
                                        dark:focus:border-blue-500
                                        dark:focus:ring-blue-950
                                    "
                                />
                            </div>

                            {/* School Slug */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="slug"
                                    className="
                                        mb-1.5
                                        block
                                        text-xs
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-300
                                    "
                                >
                                    {
                                        t.register
                                            .schoolSlug
                                    }
                                </label>

                                <input
                                    id="slug"
                                    type="text"
                                    value={slug}
                                    onChange={(e) =>
                                        setSlug(
                                            e.target
                                                .value,
                                        )
                                    }
                                    required
                                    autoComplete="off"
                                    placeholder={
                                        t.register
                                            .schoolSlugPlaceholder
                                    }
                                    className="
                                        min-h-11
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3.5
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        placeholder:text-slate-400
                                        focus:border-blue-500
                                        focus:ring-2
                                        focus:ring-blue-100
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-white
                                        dark:placeholder:text-slate-500
                                        dark:focus:border-blue-500
                                        dark:focus:ring-blue-950
                                    "
                                />
                            </div>

                            {/* Principal Name */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="principalName"
                                    className="
                                        mb-1.5
                                        block
                                        text-xs
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-300
                                    "
                                >
                                    {
                                        t.register
                                            .principalName
                                    }
                                </label>

                                <input
                                    id="principalName"
                                    type="text"
                                    value={
                                        principalName
                                    }
                                    onChange={(e) =>
                                        setPrincipalName(
                                            e.target
                                                .value,
                                        )
                                    }
                                    required
                                    autoComplete="name"
                                    placeholder={
                                        t.register
                                            .principalNamePlaceholder
                                    }
                                    className="
                                        min-h-11
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3.5
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        placeholder:text-slate-400
                                        focus:border-blue-500
                                        focus:ring-2
                                        focus:ring-blue-100
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-white
                                        dark:placeholder:text-slate-500
                                        dark:focus:border-blue-500
                                        dark:focus:ring-blue-950
                                    "
                                />
                            </div>

                            {/* Principal Email */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="principalEmail"
                                    className="
                                        mb-1.5
                                        block
                                        text-xs
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-300
                                    "
                                >
                                    {
                                        t.register
                                            .principalEmail
                                    }
                                </label>

                                <input
                                    id="principalEmail"
                                    type="email"
                                    value={
                                        principalEmail
                                    }
                                    onChange={(e) =>
                                        setPrincipalEmail(
                                            e.target
                                                .value,
                                        )
                                    }
                                    required
                                    autoComplete="email"
                                    placeholder={
                                        t.register
                                            .principalEmailPlaceholder
                                    }
                                    className="
                                        min-h-11
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3.5
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        placeholder:text-slate-400
                                        focus:border-blue-500
                                        focus:ring-2
                                        focus:ring-blue-100
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-white
                                        dark:placeholder:text-slate-500
                                        dark:focus:border-blue-500
                                        dark:focus:ring-blue-950
                                    "
                                />
                            </div>

                            {/* Password */}
                            <div className="min-w-0 sm:col-span-2">
                                <label
                                    htmlFor="password"
                                    className="
                                        mb-1.5
                                        block
                                        text-xs
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-300
                                    "
                                >
                                    {
                                        t.register
                                            .password
                                    }
                                </label>

                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target
                                                .value,
                                        )
                                    }
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    placeholder={
                                        t.register
                                            .passwordPlaceholder
                                    }
                                    className="
                                        min-h-11
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3.5
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        placeholder:text-slate-400
                                        focus:border-blue-500
                                        focus:ring-2
                                        focus:ring-blue-100
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-white
                                        dark:placeholder:text-slate-500
                                        dark:focus:border-blue-500
                                        dark:focus:ring-blue-950
                                    "
                                />

                                <p
                                    className="
                                        mt-1.5
                                        text-[11px]
                                        text-slate-400
                                        dark:text-slate-500
                                    "
                                >
                                    {
                                        t.register
                                            .passwordHint
                                    }
                                </p>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="
                                    min-h-11
                                    w-full
                                    rounded-xl
                                    bg-blue-600
                                    px-4
                                    text-sm
                                    font-bold
                                    text-white
                                    shadow-sm
                                    shadow-blue-600/20
                                    transition
                                    hover:bg-blue-700
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-blue-500
                                    focus:ring-offset-2
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                    sm:col-span-2
                                    dark:bg-blue-600
                                    dark:hover:bg-blue-500
                                    dark:focus:ring-offset-slate-900
                                "
                            >
                                {loading
                                    ? t.register
                                          .creatingSchool
                                    : t.register
                                          .createSchool}
                            </button>
                        </form>

                        {/* Login */}
                        <div
                            className="
                                mt-6
                                border-t
                                border-slate-200
                                pt-5
                                text-center
                                dark:border-slate-800
                            "
                        >
                            <p
                                className="
                                    text-xs
                                    text-slate-500
                                    dark:text-slate-400
                                "
                            >
                                {
                                    t.register
                                        .alreadyHaveAccount
                                }
                            </p>

                            <Link
                                href="/login"
                                className="
                                    mt-1.5
                                    inline-block
                                    text-sm
                                    font-semibold
                                    text-blue-600
                                    transition
                                    hover:text-blue-700
                                    dark:text-blue-400
                                    dark:hover:text-blue-300
                                "
                            >
                                {
                                    t.register
                                        .signIn
                                }
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}

