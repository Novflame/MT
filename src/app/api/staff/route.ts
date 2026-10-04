import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"

import {
    hasPermission,
    type Role,
} from "@/auth/permissions"


export async function POST(request: Request) {
    try {
        // =========================
        // Authentication
        // =========================

        const session = await auth.api.getSession({
            headers: request.headers,
        })

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            )
        }


        // =========================
        // Current user
        // =========================

        const currentRole =
            session.user.schoolRole as Role

        const schoolId =
            session.user.schoolId


        // =========================
        // Permission
        // =========================

        if (
            !hasPermission(
                currentRole,
                "users.create",
            )
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            )
        }


        // =========================
        // Request body
        // =========================

        const body = await request.json()

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
            typeof body.role === "string"
                ? body.role
                : ""


        // =========================
        // Required fields
        // =========================

        if (
            !name ||
            !email ||
            !password ||
            !schoolRole
        ) {
            return NextResponse.json(
                {
                    error: "All fields are required",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Allowed staff roles
        // =========================

        const allowedRoles: Role[] = [
            "deputy",
            "head_of_class",
            "head_of_department",
            "teacher",
        ]

        if (
            !allowedRoles.includes(
                schoolRole as Role,
            )
        ) {
            return NextResponse.json(
                {
                    error: "Invalid staff role",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Password validation
        // =========================

        if (password.length < 8) {
            return NextResponse.json(
                {
                    error:
                        "Password must be at least 8 characters",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Check email
        // =========================

        const existingUser =
            await centralDb
                .select({
                    id: user.id,
                })
                .from(user)
                .where(
                    eq(user.email, email),
                )
                .limit(1)


        if (existingUser.length > 0) {
            return NextResponse.json(
                {
                    error: "Email already exists",
                },
                {
                    status: 409,
                },
            )
        }


       // =========================
// Create Better Auth user
// =========================

const result = await auth.api.signUpEmail({
    body: {
        name,
        email,
        password,
        schoolId,
        schoolRole,
    },
    headers: {
        "x-internal-registration-secret":
            process.env.INTERNAL_REGISTRATION_SECRET!,
    },
})

if (!result?.user) {
    return NextResponse.json(
        {
            error: "Failed to create user",
        },
        {
            status: 500,
        },
    )
}
        // =========================
        // Success
        // =========================

        return NextResponse.json(
            {
                success: true,

                staff: {
                    id: result.user.id,
                    name,
                    email,
                    role: schoolRole,
                    schoolId,
                },
            },
            {
                status: 201,
            },
        )

    } catch (error) {
        console.error(
            "CREATE STAFF ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error: "Failed to create staff",
            },
            {
                status: 500,
            },
        )
    }
}


export async function GET(request: Request) {
    try {
        // =========================
        // Authentication
        // =========================

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


        // =========================
        // Current user
        // =========================

        const currentRole =
            session.user.schoolRole as Role

        const schoolId =
            session.user.schoolId


        // =========================
        // Permission
        // =========================

        if (
            !hasPermission(
                currentRole,
                "users.read",
            )
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            )
        }


        // =========================
        // Get staff
        // =========================

        const staff =
            await centralDb
                .select({
                    id: user.id,
                    name: user.name,
                    email: user.email,

                    // Return school role
                    // as "role" to the frontend
                    role: user.schoolRole,

                    schoolId: user.schoolId,
                })
                .from(user)
                .where(
                    eq(user.schoolId, schoolId),
                )


        return NextResponse.json({
            success: true,
            staff,
        })

    } catch (error) {
        console.error(
            "GET STAFF ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error: "Failed to get staff",
            },
            {
                status: 500,
            },
        )
    }
}
