"use client"

import { useState } from "react"
import { Bell, CheckCheck, Clock3, Info, TriangleAlert, CheckCircle2, AlertCircle } from "lucide-react"

export type NotificationType = "general" | "info" | "success" | "warning" | "error"

export type NotificationItem = {
    id: string
    title: string
    message: string
    type?: NotificationType
    isRead: boolean
    createdAt: string
}

type Props = {
    initialItems?: NotificationItem[]
}

const typeClasses: Record<NotificationType, string> = {
    general: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200",
    info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
    warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
    error: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
}

const typeIcons: Record<NotificationType, typeof Info> = {
    general: Info,
    info: Info,
    success: CheckCircle2,
    warning: TriangleAlert,
    error: AlertCircle,
}

export default function NotificationsPanel({ initialItems = [] }: Props) {
    const [items, setItems] = useState<NotificationItem[]>(initialItems)

    const unreadCount = items.filter((item) => !item.isRead).length

    async function markAsRead(id: string) {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            })
        } finally {
            setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)))
        }
    }

    async function markAllAsRead() {
        const unreadIds = items.filter((item) => !item.isRead).map((item) => item.id)

        if (unreadIds.length === 0) {
            return
        }

        await Promise.all(
            unreadIds.map((id) =>
                fetch("/api/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                }),
            ),
        )

        setItems((current) => current.map((item) => ({ ...item, isRead: true })))
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                        <Bell className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            Notifications
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {unreadCount} unread
                        </p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={markAllAsRead}
                        className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <CheckCheck className="h-4 w-4" />
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-950/50">
                        <Bell className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
                        <p className="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">
                            No notifications yet
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            You are all caught up for now.
                        </p>
                    </div>
                ) : (
                    items.map((notification) => {
                        const ItemIcon = typeIcons[(notification.type ?? "general") as NotificationType]
                        const typeClass = typeClasses[(notification.type ?? "general") as NotificationType]

                        return (
                            <article
                                key={notification.id}
                                className={`rounded-2xl border p-4 transition ${
                                    notification.isRead
                                        ? "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300"
                                        : "border-blue-200 bg-blue-50/70 text-slate-800 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-slate-100"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${typeClass}`}>
                                        <ItemIcon className="h-4 w-4" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                                        {notification.title}
                                                    </h3>
                                                    {!notification.isRead && (
                                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                                                            New
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                                    {notification.message}
                                                </p>
                                            </div>

                                            {!notification.isRead && (
                                                <button
                                                    type="button"
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock3 className="h-3.5 w-3.5" />
                                                {new Date(notification.createdAt).toLocaleString()}
                                            </span>
                                            <span className={`rounded-full border px-2 py-0.5 font-medium ${typeClass}`}>
                                                {notification.type ?? "general"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )
                    })
                )}
            </div>
        </section>
    )
}
