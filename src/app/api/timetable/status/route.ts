import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { centralDb } from "@/db/central"
import { schoolFeatureFlags } from "@/db/centeral-schema"
import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"

export async function GET(request: Request) {
    try {
        const session = await requireApiPermission(request, "timetable.read")
        try {
            const [flags] = await centralDb.select({ enabled: schoolFeatureFlags.timetableEnabled })
                .from(schoolFeatureFlags).where(eq(schoolFeatureFlags.schoolId, session.user.schoolId)).limit(1)
            return NextResponse.json({ enabled: Boolean(flags?.enabled) })
        } catch {
            return NextResponse.json({ enabled: false, migrationPending: true })
        }
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: error instanceof ApiAuthorizationError ? error.status : 500 })
    }
}
