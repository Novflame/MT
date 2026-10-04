
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import {
    hasPermission,
    type Role,
} from "@/auth/permissions"

import { getSchoolDB } from "@/db"
import { academicYears } from "@/db/schema"


function getRole(session: {
    user: {
        schoolRole: string
    }
}) {
    return session.user.schoolRole as Role
}


// ============================================================
// GET
// ============================================================

export async function GET(request: Request) {
    try {

        const session =
            await auth.api.getSession({
                headers: request.headers,
            })

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            )
        }

        const role = getRole(session)

        if (
            !hasPermission(
                role,
                "academicYears.read",
            )
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            )
        }

        const db = await getSchoolDB()

        const years =
            await db
                .select()
                .from(academicYears)
                .orderBy(
                    academicYears.startDate,
                )

        console.log(
            "ACADEMIC YEARS:",
            years,
        )

        return NextResponse.json({
            success: true,
            academicYears: years,
        })

    } catch (error) {

        console.error(
            "GET ACADEMIC YEARS ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to get academic years",
            },
            {
                status: 500,
            },
        )
    }
}


// ============================================================
// POST
// Create a new academic year
//
// Rules:
//
// 1. There can only be one active academic year.
// 2. A new year cannot be created while the current
//    academic year is active.
// 3. Promotion is responsible for closing the year.
// 4. Creating a year automatically makes it active.
// ============================================================

export async function POST(request: Request) {
    try {

        const session =
            await auth.api.getSession({
                headers: request.headers,
            })

        if (!session) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            )
        }

        const role = getRole(session)

        if (
            !hasPermission(
                role,
                "academicYears.create",
            )
        ) {
            return NextResponse.json(
                {
                    error: "Forbidden",
                },
                {
                    status: 403,
                },
            )
        }


        // ----------------------------------------------------
        // Read request
        // ----------------------------------------------------

        const body =
            await request.json()

        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : ""


        // ----------------------------------------------------
        // Validate academic year
        //
        // Expected:
        // 2026 / 2027
        // ----------------------------------------------------

        const match =
            name.match(
                /^(\d{4})\s*\/\s*(\d{4})$/,
            )

        if (!match) {
            return NextResponse.json(
                {
                    error:
                        "Academic year must use the format YYYY / YYYY",
                },
                {
                    status: 400,
                },
            )
        }


        const startYear =
            Number(match[1])

        const endYear =
            Number(match[2])


        // ----------------------------------------------------
        // Academic years must be consecutive
        //
        // 2026 / 2027 -> valid
        // 2026 / 2028 -> invalid
        // ----------------------------------------------------

        if (
            endYear !== startYear + 1
        ) {
            return NextResponse.json(
                {
                    error:
                        "Academic year must contain two consecutive years",
                },
                {
                    status: 400,
                },
            )
        }


        const db = await getSchoolDB()


        // ----------------------------------------------------
        // Check for active academic year
        //
        // Promotion must close the current year first.
        // ----------------------------------------------------

        const activeYear =
            await db
                .select()
                .from(academicYears)
                .where(
                    eq(
                        academicYears.isActive,
                        true,
                    ),
                )
                .limit(1)


        if (activeYear.length > 0) {
            return NextResponse.json(
                {
                    error:
                        "The current academic year is still active. Complete Promotion before creating a new academic year.",
                },
                {
                    status: 409,
                },
            )
        }


        // ----------------------------------------------------
        // Generate dates automatically
        // ----------------------------------------------------

        const startDate =
            `${startYear}-01-01`

        const endDate =
            `${endYear}-12-31`


        // ----------------------------------------------------
        // Create academic year
        // ----------------------------------------------------

        const id =
            crypto.randomUUID()


        const year =
            await db
                .insert(academicYears)
                .values({
                    id,
                    name,
                    startDate,
                    endDate,
                    isActive: true,
                })
                .returning()


        return NextResponse.json(
            {
                success: true,
                academicYear: year[0],
            },
            {
                status: 201,
            },
        )

    } catch (error) {

        console.error(
            "CREATE ACADEMIC YEAR ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to create academic year",
            },
            {
                status: 500,
            },
        )
    }
}

