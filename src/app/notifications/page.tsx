import { eq } from "drizzle-orm"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { notifications } from "@/db/schema"
import NotificationsPanel, { type NotificationItem } from "@/components/notifications/NotificationsPanel"

export default async function NotificationsPage() {
    const session = await requireSession()
    const db = await getSchoolDB()

    const allNotifications = await db.query.notifications.findMany({
        where: eq(notifications.recipientUserId, session.user.id),
        orderBy: (notification, { desc }) => desc(notification.createdAt),
    })

    return (
        <main className="min-h-dvh bg-slate-100 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950">
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Inbox
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                            Notifications
                        </h1>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {allNotifications.filter((notification) => !notification.isRead).length} unread
                    </p>
                </div>

                <NotificationsPanel
                    initialItems={allNotifications.map((notification) => ({
                        id: notification.id,
                        title: notification.title,
                        message: notification.message,
                        type: (notification.type as NotificationItem["type"]) ?? "general",
                        isRead: notification.isRead,
                        createdAt: notification.createdAt,
                    }))}
                />
            </div>
        </main>
    )
}
