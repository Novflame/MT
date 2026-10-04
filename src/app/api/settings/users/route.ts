
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import { staffProfiles } from "@/db/schema"

import { requirePermission } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { auth } from "@/auth/auth"


const allowedRoles = [
    "principal",
    "deputy",
    "head_of_class",
    "head_of_department",
    "teacher",
] as const


// =====================================================
// GET
// Load users from current school
// =====================================================

export async function GET() {

    try {

        const session =
            await requirePermission(
                "users.read",
            )


        const currentUser =
            await centralDb
                .select({
                    schoolId: user.schoolId,
                })
                .from(user)
                .where(
                    eq(
                        user.id,
                        session.user.id,
                    ),
                )
                .limit(1)


        const schoolId =
            currentUser[0]?.schoolId


        if (!schoolId) {

            return NextResponse.json(
                {
                    error:
                        "User is not assigned to a school.",
                },
                {
                    status: 403,
                },
            )
        }


        const users =
            await centralDb
                .select({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    schoolRole: user.schoolRole,
                    banned: user.banned,
                })
                .from(user)
                .where(
                    eq(
                        user.schoolId,
                        schoolId,
                    ),
                )


        return NextResponse.json({
            users,
        })

    } catch (error) {

        console.error(
            "GET /api/settings/users failed:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to load users.",
            },
            {
                status: 500,
            },
        )
    }
}


// =====================================================
// POST
// Create staff user
// =====================================================

export async function POST(
    request: Request,
) {

    try {

        const session =
            await requirePermission(
                "users.create",
            )


        // =========================================
        // Current user's school
        // =========================================

        const currentUser =
            await centralDb
                .select({
                    schoolId: user.schoolId,
                })
                .from(user)
                .where(
                    eq(
                        user.id,
                        session.user.id,
                    ),
                )
                .limit(1)


        const schoolId =
            currentUser[0]?.schoolId


        if (!schoolId) {

            return NextResponse.json(
                {
                    error:
                        "User is not assigned to a school.",
                },
                {
                    status: 403,
                },
            )
        }


        // =========================================
        // Request body
        // =========================================

        const body =
            await request.json()


        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : ""


        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : ""


        const password =
            typeof body.password === "string"
                ? body.password
                : ""


        const schoolRole =
            typeof body.schoolRole === "string"
                ? body.schoolRole
                : ""


        // =========================================
        // Validation
        // =========================================

        if (!name) {

            return NextResponse.json(
                {
                    error:
                        "Name is required.",
                },
                {
                    status: 400,
                },
            )
        }


        if (!email) {

            return NextResponse.json(
                {
                    error:
                        "Email is required.",
                },
                {
                    status: 400,
                },
            )
        }


        if (password.length < 8) {

            return NextResponse.json(
                {
                    error:
                        "Password must be at least 8 characters.",
                },
                {
                    status: 400,
                },
            )
        }


        if (
            !allowedRoles.includes(
                schoolRole as typeof allowedRoles[number],
            )
        ) {

            return NextResponse.json(
                {
                    error:
                        "Invalid school role.",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================================
        // Registration secret
        // =========================================

        const registrationSecret =
            process.env.INTERNAL_REGISTRATION_SECRET


        if (!registrationSecret) {

            console.error(
                "INTERNAL_REGISTRATION_SECRET is missing.",
            )

            return NextResponse.json(
                {
                    error:
                        "Server configuration error.",
                },
                {
                    status: 500,
                },
            )
        }


        // =========================================
        // Create Better Auth user
        // =========================================

        const result =
            await auth.api.signUpEmail({

                body: {
                    name,
                    email,
                    password,
                    schoolId,
                    schoolRole,
                },

                headers: new Headers({
                    "x-internal-registration-secret":
                        registrationSecret,
                }),
            })

        const schoolDb =
            await getSchoolDB()

        await schoolDb
            .insert(staffProfiles)
            .values({
                userId: result.user.id,
            })
        return NextResponse.json(
            {
                success: true,
                user: result.user,
            },
            {
                status: 201,
            },
        )

    } catch (error) {

        console.error(
            "POST /api/settings/users failed:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to create staff user.",
            },
            {
                status: 500,
            },
        )
    }
}

