import { requirePermission } from "@/auth/session"
import TimetableSettingsClient from "@/components/timetable/TimetableSettingsClient"

export default async function TimetableSettingsPage() {
    await requirePermission("settings.update")
    return <TimetableSettingsClient />
}
