import { NextResponse } from "next/server"

import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"


export async function GET() {

    await requirePermission(
        "results.read",
    )

    const db =
        await getSchoolDB()

    const enrollments =
        await db.query.studentEnrollments.findMany({
            with: {
                student: true,
                class: true,
            },
        })

    return NextResponse.json(
        enrollments,
    )
}