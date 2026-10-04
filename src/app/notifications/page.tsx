import { requireSession } from '@/auth/session';import NotificationsPanel from '@/components/notifications/NotificationsPanel'
export default async function NotificationsPage(){await requireSession();return <main className="min-h-screen bg-gray-100 p-8"><div className="mx-auto max-w-4xl"><NotificationsPanel/></div></main>}
