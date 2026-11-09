import { redirect } from "next/navigation"
import { requirePermission } from "@/auth/session"
import { getCurrentSession } from "@/auth/session"
import { assertTimetableEnabled } from "@/lib/timetable/access"
import TimetableClient from "@/components/timetable/TimetableClient"

export default async function TimetablePage() {
    await requirePermission("timetable.read")
    const session = await getCurrentSession()
    if (!session) redirect("/login")
    try { await assertTimetableEnabled(session.user.id) } catch { redirect("/dashboard") }
    return <TimetableClient role={session.user.schoolRole} />
}
