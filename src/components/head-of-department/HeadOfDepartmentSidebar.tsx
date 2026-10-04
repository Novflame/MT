
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
    LayoutDashboard,
    Users,
    BookOpen,
    ClipboardList,
    FileText,
    GraduationCap,
    BarChart3,
    FileBarChart,
    UserCircle,
    Settings,
    LogOut,
    ChevronDown,
    ChevronLeft,
    X,
} from "lucide-react"

import { authClient } from "@/auth/auth-client"

type Props = {
    collapsed: boolean
    mobileOpen: boolean
    onCloseMobile: () => void
    onToggleCollapse: () => void
}

type MenuItem = {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

type MenuGroup = {
    label: string
    items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
    {
        label: "Overview",
        items: [
            {
                label: "Dashboard",
                href: "/head-of-department",
                icon: LayoutDashboard,
            },
        ],
    },
    {
        label: "Department",
        items: [
            {
                label: "Teachers",
                href: "/head-of-department/teachers",
                icon: Users,
            },
            {
                label: "Subjects",
                href: "/head-of-department/subjects",
                icon: BookOpen,
            },
            {
                label: "Assignments",
                href: "/head-of-department/assignments",
                icon: ClipboardList,
            },
        ],
    },
    {
        label: "Academic",
        items: [
            {
                label: "Tests",
                href: "/head-of-department/tests",
                icon: FileText,
            },
            {
                label: "Exams",
                href: "/head-of-department/exams",
                icon: GraduationCap,
            },
            {
                label: "Grades",
                href: "/head-of-department/grades",
                icon: BarChart3,
            },
            {
                label: "Results",
                href: "/head-of-department/results",
                icon: FileBarChart,
            },
            {
                label: "Performance",
                href: "/head-of-department/performance",
                icon: BarChart3,
            },
        ],
    },
    {
        label: "Account",
        items: [
            {
                label: "Profile",
                href: "/head-of-department/profile",
                icon: UserCircle,
            },
            {
                label: "Settings",
                href: "/head-of-department/settings",
                icon: Settings,
            },
        ],
    },
]

export default function HeadOfDepartmentSidebar({
    collapsed,
    mobileOpen,
    onCloseMobile,
    onToggleCollapse,
}: Props) {
    const pathname = usePathname()
    const router = useRouter()
    const [profileOpen, setProfileOpen] = useState(false)

    const { data: session } = authClient.useSession()

    const userName = session?.user?.name ?? "Department Head"
    const userEmail = session?.user?.email ?? ""

    async function handleLogout() {
        await authClient.signOut()
        router.replace("/login")
    }

    function isActive(href: string) {
        if (href === "/head-of-department") {
            return pathname === href
        }

        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <>
            {/* Mobile backdrop */}
            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    onClick={onCloseMobile}
                    className="
                        fixed inset-0 z-40
                        bg-slate-950/40
                        backdrop-blur-[1px]
                        lg:hidden
                    "
                />
            )}

            <aside
                className={`
                    fixed inset-y-0 left-0 z-50
                    flex h-dvh flex-col
                    border-r
                    border-slate-200
                    bg-white
                    text-slate-900
                    shadow-xl
                    transition-[width,transform]
                    duration-200
                    dark:border-slate-800
                    dark:bg-slate-950
                    dark:text-slate-100

                    ${collapsed ? "w-20" : "w-64"}

                    ${
                        mobileOpen
                            ? "translate-x-0"
                            : "-translate-x-full lg:translate-x-0"
                    }
                `}
            >
                {/* Header */}
                <div
                    className={`
                        flex h-16 shrink-0 items-center
                        border-b
                        border-slate-200
                        px-3
                        dark:border-slate-800
                        ${collapsed ? "justify-center" : "justify-between"}
                    `}
                >
                    {!collapsed && (
                        <Link
                            href="/head-of-department"
                            onClick={onCloseMobile}
                            className="min-w-0 flex-1"
                        >
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                                Department Dashboard
                            </p>

                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                Head of Department
                            </p>
                        </Link>
                    )}

                    {/* Desktop collapse */}
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        aria-label={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                        title={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                        className="
                            hidden shrink-0 rounded-lg p-2
                            text-slate-500
                            transition
                            hover:bg-slate-100
                            hover:text-slate-900
                            lg:block
                            dark:text-slate-400
                            dark:hover:bg-slate-800
                            dark:hover:text-slate-100
                        "
                    >
                        <ChevronLeft
                            className={`
                                h-5 w-5 transition-transform duration-200
                                ${collapsed ? "rotate-180" : ""}
                            `}
                        />
                    </button>

                    {/* Mobile close */}
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        aria-label="Close sidebar"
                        className="
                            shrink-0 rounded-lg p-2
                            text-slate-500
                            transition
                            hover:bg-slate-100
                            hover:text-slate-900
                            lg:hidden
                            dark:text-slate-400
                            dark:hover:bg-slate-800
                            dark:hover:text-slate-100
                        "
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav
                    className="
                        min-h-0 flex-1
                        overflow-y-auto overflow-x-hidden
                        px-3 py-4 `scrollbar-thin `               "
                >
                    {menuGroups.map((group) => (
                        <div
                            key={group.label}
                            className="mb-6 last:mb-2"
                        >
                            {!collapsed && (
                                <p
                                    className="
                                        mb-2 px-3
                                        text-[11px] font-semibold
                                        uppercase tracking-wider
                                        text-slate-400
                                        dark:text-slate-500
                                    "
                                >
                                    {group.label}
                                </p>
                            )}

                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon
                                    const active = isActive(item.href)

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onCloseMobile}
                                            title={
                                                collapsed
                                                    ? item.label
                                                    : undefined
                                            }
                                            aria-current={
                                                active
                                                    ? "page"
                                                    : undefined
                                            }
                                            className={`
                                                group flex min-w-0
                                                items-center gap-3
                                                rounded-xl
                                                px-3 py-2.5
                                                text-sm font-medium
                                                transition
                                                focus:outline-none
                                                focus-visible:ring-2
                                                focus-visible:ring-slate-400
                                                dark:focus-visible:ring-slate-600

                                                ${
                                                    collapsed
                                                        ? "justify-center"
                                                        : ""
                                                }

                                                ${
                                                    active
                                                        ? `
                                                            bg-slate-900
                                                            text-white
                                                            shadow-sm
                                                            dark:bg-slate-100
                                                            dark:text-slate-950
                                                        `
                                                        : `
                                                            text-slate-600
                                                            hover:bg-slate-100
                                                            hover:text-slate-900
                                                            dark:text-slate-400
                                                            dark:hover:bg-slate-800
                                                            dark:hover:text-slate-100
                                                        `
                                                }
                                            `}
                                        >
                                            <Icon
                                                className={`
                                                    h-5 w-5 shrink-0

                                                    ${
                                                        active
                                                            ? `
                                                                text-white
                                                                dark:text-slate-950
                                                            `
                                                            : `
                                                                text-slate-400
                                                                group-hover:text-slate-700
                                                                dark:text-slate-500
                                                                dark:group-hover:text-slate-200
                                                            `
                                                    }
                                                `}
                                            />

                                            {!collapsed && (
                                                <span className="min-w-0 truncate">
                                                    {item.label}
                                                </span>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Profile */}
                <div
                    className="
                        shrink-0 border-t
                        border-slate-200
                        p-3
                        dark:border-slate-800
                    "
                >
                    <button
                        type="button"
                        onClick={() =>
                            setProfileOpen((value) => !value)
                        }
                        aria-expanded={profileOpen}
                        className={`
                            flex w-full min-w-0
                            items-center gap-3
                            rounded-xl p-2
                            text-left
                            transition
                            hover:bg-slate-100
                            dark:hover:bg-slate-800

                            ${collapsed ? "justify-center" : ""}
                        `}
                    >
                        <div
                            className="
                                flex h-9 w-9 shrink-0
                                items-center justify-center
                                rounded-full
                                bg-slate-900
                                text-sm font-bold text-white
                                dark:bg-slate-100
                                dark:text-slate-950
                            "
                        >
                            {userName.charAt(0).toUpperCase()}
                        </div>

                        {!collapsed && (
                            <>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {userName}
                                    </p>

                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                        Head of Department
                                    </p>
                                </div>

                                <ChevronDown
                                    className={`
                                        h-4 w-4 shrink-0
                                        text-slate-400
                                        transition-transform
                                        dark:text-slate-500
                                        ${
                                            profileOpen
                                                ? "rotate-180"
                                                : ""
                                        }
                                    `}
                                />
                            </>
                        )}
                    </button>

                    {profileOpen && !collapsed && (
                        <div
                            className="
                                mt-2 rounded-xl
                                border
                                border-slate-200
                                bg-slate-50
                                p-2
                                dark:border-slate-800
                                dark:bg-slate-900
                            "
                        >
                            {userEmail && (
                                <p
                                    className="
                                        truncate px-3 py-2
                                        text-xs
                                        text-slate-500
                                        dark:text-slate-400
                                    "
                                >
                                    {userEmail}
                                </p>
                            )}

                            <Link
                                href="/head-of-department/profile"
                                onClick={onCloseMobile}
                                className="
                                    flex items-center gap-3
                                    rounded-lg px-3 py-2
                                    text-sm text-slate-600
                                    transition
                                    hover:bg-white
                                    hover:text-slate-900
                                    dark:text-slate-400
                                    dark:hover:bg-slate-800
                                    dark:hover:text-slate-100
                                "
                            >
                                <UserCircle className="h-4 w-4 shrink-0" />
                                Profile
                            </Link>

                            <Link
                                href="/head-of-department/settings"
                                onClick={onCloseMobile}
                                className="
                                    flex items-center gap-3
                                    rounded-lg px-3 py-2
                                    text-sm text-slate-600
                                    transition
                                    hover:bg-white
                                    hover:text-slate-900
                                    dark:text-slate-400
                                    dark:hover:bg-slate-800
                                    dark:hover:text-slate-100
                                "
                            >
                                <Settings className="h-4 w-4 shrink-0" />
                                Settings
                            </Link>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="
                                    flex w-full items-center gap-3
                                    rounded-lg px-3 py-2
                                    text-sm text-red-600
                                    transition
                                    hover:bg-white
                                    dark:text-red-400
                                    dark:hover:bg-slate-800
                                "
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}

