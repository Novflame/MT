
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import { parents } from "@/db/schema"
import { requirePermission } from "@/auth/session"


export async function POST(
    request: Request,
) {

    try {

        await requirePermission(
            "students.create",
        )


        // =========================
        // Request body
        // =========================

        const body =
            await request.json()


        const parentName =
            String(
                body.parentName ?? "",
            ).trim()


        if (!parentName) {

            return NextResponse.json(
                {
                    error:
                        "Parent name is required",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Database
        // =========================

        const db =
            await getSchoolDB()


        // =========================
        // Find matching parents
        // =========================

        const parentMatches =
            await db
                .select({
                    id: parents.id,
                    name: parents.name,
                    phone: parents.phone,
                })
                .from(parents)
                .where(
                    eq(
                        parents.name,
                        parentName,
                    ),
                )


        // =========================
        // Response
        // =========================

        return NextResponse.json({
            exists:
                parentMatches.length > 0,

            parents:
                parentMatches,
        })


    } catch (error) {

        console.error(error)


        return NextResponse.json(
            {
                error:
                    "Failed to check parent",
            },
            {
                status: 500,
            },
        )
    }
}

