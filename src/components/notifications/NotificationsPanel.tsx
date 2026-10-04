"use client"
import { useEffect, useState } from 'react'
type N = { id: string; title: string; message: string; isRead: boolean; createdAt: string }
export default function NotificationsPanel() {
    const [items, setItems] = useState<N[]>([]);
    useEffect(
        () => {
            fetch('/api/notifications')
                .then(r => r.ok ? r.json() : [])
                .then(setItems)
        }, []);
    async function read(id: string) {
        await fetch('/api/notifications',
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
        setItems(x => x.map(n => n.id === id ? { ...n, isRead: true } : n))
    }
    return <section className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <div className="mt-4 space-y-2">
            {items.map(n => <button key={n.id}
                onClick={() => read(n.id)}
                className={`block w-full rounded border p-3 text-left ${n.isRead ? '' : 'bg-blue-50'}`}>
                <div className="font-semibold">{n.title}
                </div>
                <div className="text-sm text-gray-600">
                    {n.message}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                </div>
            </button>)}
            {items.length === 0 && <p className="text-gray-500">No notifications.</p>}
        </div>
    </section>
}
