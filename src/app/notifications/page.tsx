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
