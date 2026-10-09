import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"


// =========================================
// GET — Current account
// =========================================

export async function GET(request: Request) {

    try {

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


        const [currentUser] =
            await centralDb
                .select({
                    name: user.name,
                    email: user.email,
                    schoolRole: user.schoolRole,
                })
                .from(user)
                .where(
                    eq(
                        user.id,
                        session.user.id,
                    ),
                )
                .limit(1)


        if (!currentUser) {

            return NextResponse.json(
                {
                    error: "User not found",
                },
                {
                    status: 404,
                },
            )
        }


        return NextResponse.json({
            user: currentUser,
        })

    } catch (error) {

        console.error(
            "GET /api/account failed:",
            error,
        )

        return NextResponse.json(
            {
                error: "Failed to load account",
            },
            {
                status: 500,
            },
        )
    }
}


// =========================================
// PATCH — Update account
// =========================================

export async function PATCH(request: Request) {

    try {

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


        const body = await request.json()


        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : ""


        if (!name) {

            return NextResponse.json(
                {
                    error: "Name is required",
                },
                {
                    status: 400,
                },
            )
        }


        if (name.length > 100) {

            return NextResponse.json(
                {
                    error: "Name is too long",
                },
                {
                    status: 400,
                },
            )
        }


        const [updatedUser] =
            await centralDb
                .update(user)
                .set({
                    name,
                })
                .where(
                    eq(
                        user.id,
                        session.user.id,
                    ),
                )
                .returning({
                    name: user.name,
                    email: user.email,
                    schoolRole: user.schoolRole,
                })


        if (!updatedUser) {

            return NextResponse.json(
                {
                    error: "User not found",
                },
                {
                    status: 404,
                },
            )
        }


        return NextResponse.json({
            success: true,
            user: updatedUser,
        })

    } catch (error) {

        console.error(
            "PATCH /api/account failed:",
            error,
        )

        return NextResponse.json(
            {
                error: "Failed to update account",
            },
            {
                status: 500,
            },
        )
    }
}