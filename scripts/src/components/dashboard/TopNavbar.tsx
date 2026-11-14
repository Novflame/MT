"use client"
import Link from "next/link"
import {
    Bell,
    ChevronDown,
    Globe2,
    Menu,
    Moon,
    Search,
    Settings2,
    Sun,
    User,
    X,
} from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"
import { useLanguage } from "@/components/providers/LanguageProvider"
import { authClient } from "@/auth/auth-client"

type TopNavbarProps = {
    mobileOpen: boolean
    onOpenMobile: () => void
}

type Language = "en" | "ar" | "fr"

const languageLabels: Record<
    Language,
    string
> = {
    en: "English",
    ar: "العربية",
    fr: "Français",
}

function getThemeSnapshot(): "light" | "dark" {
    if (typeof window === "undefined") return "light"
    const saved = window.localStorage.getItem("school-theme")
    if (saved === "dark" || saved === "light") return saved
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function subscribeTheme(callback: () => void) {
    if (typeof window === "undefined") return () => {}
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    window.addEventListener("storage", callback)
    window.addEventListener("school-theme-change", callback)
    media.addEventListener("change", callback)
    return () => {
        window.removeEventListener("storage", callback)
        window.removeEventListener("school-theme-change", callback)
        media.removeEventListener("change", callback)
    }
}

function storeTheme(nextTheme: "light" | "dark") {
    window.localStorage.setItem("school-theme", nextTheme)
    window.dispatchEvent(new Event("school-theme-change"))
}

function getInitials(
    name?: string | null,
) {
    if (!name) return "U"

    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (parts.length === 1) {
        return parts[0]
            .slice(0, 2)
            .toUpperCase()
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatRole(
    role?: string | null,
) {
    if (!role) return "Staff"

    return role
        .split("_")
        .map(
            (part) =>
                part.charAt(0).toUpperCase() +
                part.slice(1),
        )
        .join(" ")
}

function getControlButtonStyles() {
    return `
        flex min-h-10 min-w-10
        items-center justify-center
        rounded-lg
        text-slate-500
        transition-colors
        hover:bg-slate-100
        hover:text-slate-900
        dark:text-slate-400
        dark:hover:bg-slate-800
        dark:hover:text-white
    `
}

function getSlideItemStyles() {
    return `
        flex w-full items-center gap-3
        rounded-xl px-3 py-3
        text-left
        transition-colors
        hover:bg-slate-100
        dark:hover:bg-slate-800
    `
}

export default function TopNavbar({
    mobileOpen,
    onOpenMobile,
}: TopNavbarProps) {
    const { data: session } =
        authClient.useSession()

    const {
        locale,
        setLocale,
    } = useLanguage()

    const [settingsOpen, setSettingsOpen] =
        useState(false)

    const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light")

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark")
    }, [theme])

    const currentRole = session?.user?.schoolRole as string | undefined
    const profileHref = currentRole === "head_of_department" ? "/head-of-department/profile"
        : currentRole === "head_of_class" ? "/head-of-class/profile"
        : currentRole === "teacher" ? "/teacher/profile"
        : currentRole === "parent" ? "/parent/profile"
        : currentRole === "student" ? "/student/profile"
        : "/dashboard/profile"

    const name =
        session?.user?.name ?? "User"

    const role = formatRole(
        session?.user?.schoolRole,
    )

    function handleThemeToggle() {
        storeTheme(theme === "light" ? "dark" : "light")
    }

    return (
        <>
            <header
                className="
                    fixed inset-x-0 top-0 z-40
                    flex h-16 items-center
                    justify-between
                    border-b border-slate-200
                    bg-white/95 px-3
                    backdrop-blur
                    dark:border-slate-800
                    dark:bg-slate-900/95
                    sm:px-6
                "
            >
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onOpenMobile}
                        className="
                            flex min-h-11 min-w-11
                            items-center justify-center
                            rounded-lg
                            p-2.5
                            text-slate-500
                            hover:bg-slate-100
                            hover:text-slate-900
                            dark:text-slate-400
                            dark:hover:bg-slate-800
                            dark:hover:text-white
                            lg:hidden
                        "
                        aria-label="Open navigation"
                        aria-expanded={mobileOpen}
                        aria-controls="primary-navigation"
                    >
                        <Menu size={21} />
                    </button>

                    <div className="relative hidden sm:block">
                        <Search
                            size={18}
                            className="
                                absolute start-3 top-1/2
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
                                ps-10 pe-3
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

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    {/* Notifications stay in the TopNavbar */}
                    <Link
                        href="/notifications"
                        className={getControlButtonStyles()}
                        aria-label="Notifications"
                    >
                        <Bell size={19} />
                    </Link>

                    {/* Opens the small right-top settings slide */}
                    <button
                        type="button"
                        onClick={() =>
                            setSettingsOpen(
                                (current) =>
                                    !current,
                            )
                        }
                        className={getControlButtonStyles()}
                        aria-label="Open settings panel"
                        aria-expanded={settingsOpen}
                        aria-controls="dashboard-settings-panel"
                    >
                        {settingsOpen ? (
                            <X size={19} />
                        ) : (
                            <Settings2 size={19} />
                        )}
                    </button>
                </div>
            </header>

            {settingsOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close settings panel"
                        onClick={() =>
                            setSettingsOpen(false)
                        }
                        className="
                            fixed inset-0 z-40
                            bg-black/20
                            backdrop-blur-[1px]
                        "
                    />

                    <aside
                        id="dashboard-settings-panel"
                        className="
                            fixed end-0 top-16 z-50
                            w-[min(21rem,calc(100vw-1rem))]
                            overflow-hidden
                            rounded-bl-2xl
                            border border-slate-200
                            bg-white
                            shadow-xl
                            dark:border-slate-700
                            dark:bg-slate-900
                        "
                        aria-label="Dashboard settings"
                    >
                        <div
                            className="
                                border-b border-slate-200
                                px-4 py-3
                                dark:border-slate-800
                            "
                        >
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Quick Settings
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Customize your dashboard
                            </p>
                        </div>

                        <div className="space-y-1 p-2">
                            {/* Theme */}
                            <button
                                type="button"
                                onClick={
                                    handleThemeToggle
                                }
                                className={getSlideItemStyles()}
                            >
                                <span
                                    className="
                                        flex h-10 w-10
                                        shrink-0
                                        items-center justify-center
                                        rounded-lg
                                        bg-slate-100
                                        text-slate-700
                                        dark:bg-slate-800
                                        dark:text-slate-200
                                    "
                                >
                                    {theme ===
                                    "light" ? (
                                        <Sun
                                            size={18}
                                        />
                                    ) : (
                                        <Moon
                                            size={18}
                                        />
                                    )}
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-slate-900 dark:text-white">
                                        Theme
                                    </span>

                                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                                        {theme ===
                                        "light"
                                            ? "Light mode"
                                            : "Dark mode"}
                                    </span>
                                </span>

                                <span
                                    className="
                                        rounded-full
                                        bg-slate-100
                                        px-2 py-1
                                        text-[11px]
                                        font-semibold
                                        text-slate-600
                                        dark:bg-slate-800
                                        dark:text-slate-300
                                    "
                                >
                                    {theme ===
                                    "light"
                                        ? "Day"
                                        : "Night"}
                                </span>
                            </button>

                            {/* Language */}
                            <div className="rounded-xl">
                                <div
                                    className="
                                        flex w-full
                                        items-center gap-3
                                        px-3 py-3
                                    "
                                >
                                    <span
                                        className="
                                            flex h-10 w-10
                                            shrink-0
                                            items-center justify-center
                                            rounded-lg
                                            bg-slate-100
                                            text-slate-700
                                            dark:bg-slate-800
                                            dark:text-slate-200
                                        "
                                    >
                                        <Globe2
                                            size={18}
                                        />
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            Language
                                        </p>

                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {
                                                languageLabels[
                                                    locale
                                                ]
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-1 px-3 pb-3">
                                    {(
                                        [
                                            "en",
                                            "ar",
                                            "fr",
                                        ] as Language[]
                                    ).map(
                                        (
                                            item,
                                        ) => (
                                            <button
                                                key={
                                                    item
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setLocale(
                                                        item,
                                                    )
                                                }
                                                className={`
                                                    rounded-lg
                                                    px-2 py-2
                                                    text-xs
                                                    font-semibold
                                                    transition-colors
                                                    ${
                                                        locale ===
                                                        item
                                                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                                    }
                                                `}
                                            >
                                                {item ===
                                                "en"
                                                    ? "EN"
                                                    : item ===
                                                        "ar"
                                                      ? "العربية"
                                                      : "FR"}
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>

                            {/* User */}
                            <Link
                                href={profileHref}
                                onClick={() =>
                                    setSettingsOpen(
                                        false,
                                    )
                                }
                                className={getSlideItemStyles()}
                            >
                                <div
                                    className="
                                        flex h-10 w-10
                                        shrink-0
                                        items-center justify-center
                                        rounded-full
                                        bg-slate-900
                                        text-sm font-semibold
                                        text-white
                                        dark:bg-slate-100
                                        dark:text-slate-900
                                    "
                                >
                                    {getInitials(
                                        session?.user
                                            ?.name,
                                    )}
                                </div>

                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                                        {name}
                                    </span>

                                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                        {role}
                                    </span>
                                </span>

                                <User
                                    size={17}
                                    className="shrink-0 text-slate-400"
                                />

                                <ChevronDown
                                    size={16}
                                    className="
                                        shrink-0
                                        -rotate-90
                                        text-slate-400
                                    "
                                />
                            </Link>
                        </div>
                    </aside>
                </>
            )}
        </>
    )
}
