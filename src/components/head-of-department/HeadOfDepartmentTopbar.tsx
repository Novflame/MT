
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
    Clock3,
    CheckCheck,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { authClient } from "@/auth/auth-client"
import type { NotificationItem } from "@/components/notifications/NotificationsPanel"

type Props = {
    onOpenMobile: () => void
}

export default function HeadOfDepartmentTopbar({
    onOpenMobile,
}: Props) {
    const router = useRouter()
    const [profileOpen, setProfileOpen] = useState(false)
    const [notificationsOpen, setNotificationsOpen] = useState(false)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [loadingNotifications, setLoadingNotifications] = useState(false)
    const [notificationsError, setNotificationsError] = useState("")

    const { data: session } = authClient.useSession()

    const userName = session?.user?.name ?? "Department Head"
    const userEmail = session?.user?.email ?? ""

    const initials = userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")

    const unreadCount = notifications.filter((item) => !item.isRead).length

    async function loadNotifications() {
        setLoadingNotifications(true)
        setNotificationsError("")

        try {
            const response = await fetch("/api/notifications")
            if (!response.ok) {
                setNotificationsError("Notifications could not be loaded. Please try again.")
                return
            }

            const payload = await response.json()
            if (!Array.isArray(payload)) {
                setNotificationsError("The notification response was invalid.")
                return
            }

            const items = payload.map((notification) => ({
                      id: String(notification.id),
                      title: String(notification.title ?? "Notification"),
                      message: String(notification.message ?? ""),
                      type: String(notification.type ?? "general") as NotificationItem["type"],
                      isRead: Boolean(notification.isRead),
                      createdAt: String(notification.createdAt ?? new Date().toISOString()),
                  }))

            setNotifications(items)
        } catch {
            setNotificationsError("Notifications could not be loaded. Please try again.")
        } finally {
            setLoadingNotifications(false)
        }
    }

    async function handleOpenNotifications() {
        setNotificationsOpen((value) => !value)
        setProfileOpen(false)

        if (!notificationsOpen) {
            await loadNotifications()
        }
    }

    async function handleMarkAsRead(id: string) {
        setNotificationsError("")

        try {
            const response = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            })

            if (!response.ok) {
                setNotificationsError("The notification could not be marked as read.")
                return
            }

            setNotifications((current) =>
                current.map((item) =>
                    item.id === id ? { ...item, isRead: true } : item,
                ),
            )
        } catch {
            setNotificationsError("The notification could not be marked as read.")
        }
    }

    async function handleLogout() {
        await authClient.signOut()
        router.replace("/login")
    }

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/85">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={onOpenMobile}
                        className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Department Management
                        </p>

                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            Head of Department
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={handleOpenNotifications}
                            aria-expanded={notificationsOpen}
                            aria-controls="hod-notifications-menu"
                            className="relative rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            aria-label="Notifications"
                        >
                            <Bell className="h-5 w-5" />

                            {unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {notificationsOpen && (
                            <div
                                id="hod-notifications-menu"
                                className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-3 dark:border-slate-700">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                        Notifications
                                    </h3>

                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                        {unreadCount} new
                                    </span>
                                </div>

                                <div className="mt-2 max-h-80 space-y-2 overflow-y-auto px-1 py-1">
                                    {notificationsError ? (
                                        <div className="px-2 py-6 text-center text-sm text-red-700 dark:text-red-300" role="alert">
                                            {notificationsError}
                                            <button
                                                type="button"
                                                onClick={loadNotifications}
                                                className="mt-3 block w-full font-medium text-blue-700 hover:underline dark:text-blue-300"
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    ) : loadingNotifications ? (
                                        <div className="px-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                            Loading notifications...
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="px-2 py-8 text-center">
                                            <Bell className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-500" />
                                            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                                                No new notifications
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                                You&apos;re all caught up.
                                            </p>
                                        </div>
                                    ) : (
                                        notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`rounded-xl border p-2.5 ${
                                                    notification.isRead
                                                        ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40"
                                                        : "border-blue-200 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                            {notification.title}
                                                        </p>
                                                        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                                            {notification.message}
                                                        </p>
                                                    </div>

                                                    {!notification.isRead && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMarkAsRead(notification.id)}
                                                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                                        >
                                                            <CheckCheck className="h-3.5 w-3.5" />
                                                            Read
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                                    <Clock3 className="h-3 w-3" />
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setProfileOpen((value) => !value)
                                setNotificationsOpen(false)
                            }}
                            className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Open profile menu"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                                {initials || "H"}
                            </div>

                            <div className="hidden min-w-0 text-left sm:block">
                                <p className="max-w-32 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {userName}
                                </p>

                                <p className="max-w-32 truncate text-xs text-slate-500 dark:text-slate-400">
                                    Head of Department
                                </p>
                            </div>

                            <ChevronDown
                                className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                                    profileOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-700">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {userName}
                                    </p>

                                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                        {userEmail}
                                    </p>

                                    <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                        Head of Department
                                    </div>
                                </div>

                                <div className="py-1">
                                    <Link
                                        href="/head-of-department/profile"
                                        onClick={() => setProfileOpen(false)}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    >
                                        <UserCircle className="h-4 w-4" />
                                        Profile
                                    </Link>

                                    <Link
                                        href="/head-of-department/settings"
                                        onClick={() => setProfileOpen(false)}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Settings
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"
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
