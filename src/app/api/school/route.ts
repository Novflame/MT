import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { schools, user } from "@/db/centeral-schema"


export async function GET(request: Request) {

    try {

        // Get the currently authenticated user
        const session = await auth.api.getSession({
            headers: request.headers,
        })

        if (!session?.user) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            )
        }


        // Get the user from our central database
        const currentUser = await centralDb
            .select({
                schoolId: user.schoolId,
            })
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1)


        if (!currentUser[0]) {
            return NextResponse.json(
                {
                    error: "User not found",
                },
                {
                    status: 404,
                },
            )
        }


        // Get the school belonging to this user
        const school = await centralDb
            .select({
                id: schools.id,
                name: schools.name,
                slug: schools.slug,
                logo: schools.logo,
                address: schools.address,
            })
            .from(schools)
            .where(
                eq(
                    schools.id,
                    currentUser[0].schoolId,
                ),
            )
            .limit(1)


        if (!school[0]) {
            return NextResponse.json(
                {
                    error: "School not found",
                },
                {
                    status: 404,
                },
            )
        }


        return NextResponse.json({
            school: school[0],
        })

    } catch (error) {

        console.error(
            "GET /api/school failed:",
            error,
        )

        return NextResponse.json(
            {
                error: "Failed to load school",
            },
            {
                status: 500,
            },
        )
    }
}

export async function PATCH(request: Request) {

    try {

        // Get authenticated user
        const session = await auth.api.getSession({
            headers: request.headers,
        })

        if (!session?.user) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            )
        }


        // Find the user's school
        const currentUser = await centralDb
            .select({
                schoolId: user.schoolId,
            })
            .from(user)
            .where(
                eq(user.id, session.user.id),
            )
            .limit(1)


        if (!currentUser[0]) {
            return NextResponse.json(
                {
                    error: "User not found",
                },
                {
                    status: 404,
                },
            )
        }


        const body = await request.json()

        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : ""

        const address =
            typeof body.address === "string"
                ? body.address.trim()
                : ""


        if (!name) {
            return NextResponse.json(
                {
                    error: "School name is required",
                },
                {
                    status: 400,
                },
            )
        }


        // Update only the authenticated user's school
        const [updatedSchool] = await centralDb
            .update(schools)
            .set({
                name,
                address: address || null,
            })
            .where(
                eq(
                    schools.id,
                    currentUser[0].schoolId,
                ),
            )
            .returning({
                id: schools.id,
                name: schools.name,
                slug: schools.slug,
                logo: schools.logo,
                address: schools.address,
            })


        if (!updatedSchool) {
            return NextResponse.json(
                {
                    error: "School not found",
                },
                {
                    status: 404,
                },
            )
        }


        return NextResponse.json({
            success: true,
            school: updatedSchool,
        })

    } catch (error) {

        console.error(
            "PATCH /api/school failed:",
            error,
        )

        return NextResponse.json(
            {
                error: "Failed to update school",
            },
            {
                status: 500,
            },
        )
    }
}