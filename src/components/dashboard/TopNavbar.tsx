"use client"

import Link from "next/link"
import {
    Bell,
    Menu,
    Search,
    ChevronDown,
} from "lucide-react"

import { authClient } from "@/auth/auth-client"

type TopNavbarProps = {
    onOpenMobile: () => void
}

function getInitials(name?: string | null) {
    if (!name) return "U"

    const parts = name.trim().split(/\s+/).filter(Boolean)

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase()
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatRole(role?: string | null) {
    if (!role) return "Staff"

    return role
        .split("_")
        .map(
            (part) =>
                part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join(" ")
}

export default function TopNavbar({
    onOpenMobile,
}: TopNavbarProps) {
    const { data: session } = authClient.useSession()

    const name = session?.user?.name ?? "User"
    const role = formatRole(session?.user?.schoolRole)

    return (
        <header
            className="
                sticky top-0 z-30
                flex h-16 items-center justify-between
                border-b border-slate-200
                bg-white/95 px-4
                backdrop-blur
                dark:border-slate-800
                dark:bg-slate-900/95
                sm:px-6
            "
        >
            <div className="flex min-w-0 items-center gap-3">
                <button
                    type="button"
                    onClick={onOpenMobile}
                    className="
                        rounded-lg p-2
                        text-slate-500
                        hover:bg-slate-100
                        hover:text-slate-900
                        dark:text-slate-400
                        dark:hover:bg-slate-800
                        dark:hover:text-white
                        lg:hidden
                    "
                    aria-label="Open navigation"
                >
                    <Menu size={21} />
                </button>

                <div className="relative hidden sm:block">
                    <Search
                        size={18}
                        className="
                            absolute left-3 top-1/2
                            -translate-y-1/2
                            text-slate-400
                        "
                    />

                    <input
                        type="search"
                        placeholder="Search..."
                        className="
                            h-9 w-56 rounded-lg
                            border border-slate-200
                            bg-slate-50
                            pl-10 pr-3
                            text-sm text-slate-900
                            outline-none
                            transition
                            placeholder:text-slate-400
                            focus:border-slate-400
                            focus:bg-white
                            dark:border-slate-700
                            dark:bg-slate-800
                            dark:text-slate-100
                            dark:placeholder:text-slate-500
                            dark:focus:border-slate-600
                            dark:focus:bg-slate-800
                            lg:w-72
                        "
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <Link
                    href="/notifications"
                    className="
                        relative rounded-lg p-2
                        text-slate-500
                        hover:bg-slate-100
                        hover:text-slate-900
                        dark:text-slate-400
                        dark:hover:bg-slate-800
                        dark:hover:text-white
                    "
                    aria-label="Notifications"
                >
                    <Bell size={19} />
                </Link>

                <Link
                    href="/dashboard/profile"
                    className="
                        flex min-w-0 items-center gap-2
                        rounded-lg p-1.5
                        hover:bg-slate-100
                        dark:hover:bg-slate-800
                    "
                    aria-label="Open profile"
                >
                    <div
                        className="
                            flex h-9 w-9 shrink-0
                            items-center justify-center
                            rounded-full
                            bg-slate-900
                            text-sm font-semibold
                            text-white
                            dark:bg-slate-100
                            dark:text-slate-900
                        "
                    >
                        {getInitials(session?.user?.name)}
                    </div>

                    <div className="hidden min-w-0 text-left sm:block">
                        <div className="max-w-40 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {name}
                        </div>

                        <div className="max-w-40 truncate text-xs text-slate-500 dark:text-slate-400">
                            {role}
                        </div>
                    </div>

                    <ChevronDown
                        size={16}
                        className="
                            hidden shrink-0
                            text-slate-400
                            sm:block
                        "
                    />
                </Link>
            </div>
        </header>
    )
}