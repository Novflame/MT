import { NextResponse } from "next/server"
import { requirePermission } from "@/auth/session"

export async function GET(request: Request) {
    try {
        await requirePermission("reports.read")
        const url = new URL(request.url)
        const response = await fetch(new URL(`/api/results?${url.searchParams.toString()}`, request.url), { headers: request.headers })
        if (!response.ok) return NextResponse.json({ error: "Failed to build report" }, { status: response.status })
        const results = await response.json()
        return NextResponse.json({ generatedAt: new Date().toISOString(), results })
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to get reports" }, { status: 500 }) }
}
