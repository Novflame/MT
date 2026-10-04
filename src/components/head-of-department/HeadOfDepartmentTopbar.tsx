
"use client"

import Link from "next/link"
import { useState } from "react"
import {
    Menu,
    Bell,
    ChevronDown,
    UserCircle,
    Settings,
    LogOut,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { authClient } from "@/auth/auth-client"

type Props = {
    onOpenMobile: () => void
}

export default function HeadOfDepartmentTopbar({
    onOpenMobile,
}: Props) {
    const router = useRouter()
    const [profileOpen, setProfileOpen] = useState(false)
    const [notificationsOpen, setNotificationsOpen] =
        useState(false)

    const { data: session } = authClient.useSession()

    const userName =
        session?.user?.name ?? "Department Head"

    const userEmail =
        session?.user?.email ?? ""

    const initials = userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")

    async function handleLogout() {
        await authClient.signOut()
        router.replace("/login")
    }

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-blue-400 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Left */}
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={onOpenMobile}
                        className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                            Department Management
                        </p>

         <p className="truncate text-xs text-slate-500 ">
                            Head of Department
                        </p>
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setNotificationsOpen(
                                    value => !value
                                )
                                setProfileOpen(false)
                            }}
                            className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Notifications"
                        >
                            <Bell className="h-5 w-5" />

                            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                        </button>

                        {notificationsOpen && (
                            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                                <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-3">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Notifications
                                    </h3>

                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                                        0 new
                                    </span>
                                </div>

                                <div className="px-2 py-8 text-center">
                                    <Bell className="mx-auto h-6 w-6 text-slate-300" />

                                    <p className="mt-2 text-sm font-medium text-slate-600">
                                        No new notifications
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        You&apos;re all caught up.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setProfileOpen(
                                    value => !value
                                )
                                setNotificationsOpen(false)
                            }}
                            className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-slate-100"
                            aria-label="Open profile menu"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                                {initials || "H"}
                            </div>

                            <div className="hidden min-w-0 text-left sm:block">
                                <p className="max-w-32 truncate text-sm font-semibold text-slate-900">
                                    {userName}
                                </p>

                                <p className="max-w-32 truncate text-xs text-slate-500">
                                    Head of Department
                                </p>
                            </div>

                            <ChevronDown
                                className={`
                                    hidden h-4 w-4 text-slate-400
                                    transition-transform sm:block
                                    ${
                                        profileOpen
                                            ? "rotate-180"
                                            : ""
                                    }
                                `}
                            />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                <div className="border-b border-slate-100 px-3 py-3">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {userName}
                                    </p>

                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                        {userEmail}
                                    </p>

                                    <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                        Head of Department
                                    </div>
                                </div>

                                <div className="py-1">
                                    <Link
                                        href="/head-of-department/profile"
                                        onClick={() =>
                                            setProfileOpen(false)
                                        }
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                    >
                                        <UserCircle className="h-4 w-4" />
                                        Profile
                                    </Link>

                                    <Link
                                        href="/head-of-department/settings"
                                        onClick={() =>
                                            setProfileOpen(false)
                                        }
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Settings
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={
                                            handleLogout
                                        }
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

