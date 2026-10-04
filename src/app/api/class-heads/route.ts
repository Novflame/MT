import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"

import { getSchoolDB } from "@/db"
import {
    classHeads,
    schoolClases,
} from "@/db/schema"

import {
    hasPermission,
    type Role,
} from "@/auth/permissions"

import { getActiveAcademicYear } from "@/db/academic-year"


export async function POST(request: Request) {
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
                "class_heads.create",
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

        const body =
            await request.json()

        const userId =
            typeof body.userId === "string"
                ? body.userId.trim()
                : ""

        const classId =
            typeof body.classId === "string"
                ? body.classId.trim()
                : ""


        if (!userId || !classId) {
            return NextResponse.json(
                {
                    error:
                        "userId and classId are required",
                },
                { status: 400 },
            )
        }


        // =========================
        // Verify selected user
        // =========================

        const selectedUser =
            await centralDb
                .select({
                    id: user.id,
                    name: user.name,
                    role: user.schoolRole,
                    schoolId: user.schoolId,
                })
                .from(user)
                .where(
                    and(
                        eq(user.id, userId),
                        eq(user.schoolId, schoolId),
                    ),
                )
                .limit(1)


        if (selectedUser.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "User not found in this school",
                },
                { status: 404 },
            )
        }


        // =========================
        // Verify role
        // =========================

        if (
            selectedUser[0].role !==
            "head_of_class"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Selected user is not a head of class",
                },
                { status: 400 },
            )
        }


        // =========================
        // School database
        // =========================

        const db =
            await getSchoolDB()

        const academicYear =
            await getActiveAcademicYear()


        // =========================
        // Verify class
        // =========================

        const schoolClass =
            await db
                .select({
                    id: schoolClases.id,
                    name: schoolClases.name,
                })
                .from(schoolClases)
                .where(
                    eq(
                        schoolClases.id,
                        classId,
                    ),
                )
                .limit(1)


        if (schoolClass.length === 0) {
            return NextResponse.json(
                {
                    error: "Class not found",
                },
                { status: 404 },
            )
        }


        // =========================
        // Check existing head
        // =========================

        const existing =
            await db
                .select({
                    userId:
                        classHeads.userId,
                })
                .from(classHeads)
                .where(
                    and(
                        eq(
                            classHeads.classId,
                            classId,
                        ),

                        eq(
                            classHeads.academicYearId,
                            academicYear.id,
                        ),
                    ),
                )
                .limit(1)


        if (existing.length > 0) {
            return NextResponse.json(
                {
                    error:
                        "This class already has a head of class",
                },
                { status: 409 },
            )
        }


        // =========================
        // Create assignment
        // =========================

        const result =
            await db
                .insert(classHeads)
                .values({
                    academicYearId:
                        academicYear.id,

                    userId,

                    classId,
                })
                .returning()


        return NextResponse.json(
            {
                success: true,

                assignment: result[0],
            },
            { status: 201 },
        )

    } catch (error) {

        console.error(
            "CREATE CLASS HEAD ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to assign head of class",
            },
            { status: 500 },
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
                "class_heads.read",
            )
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            )
        }


        // =========================
        // School database
        // =========================

        const db =
            await getSchoolDB()

        const academicYear =
            await getActiveAcademicYear()


        // =========================
        // Get assignments
        // =========================

        const assignments =
            await db
                .select({
                    userId:
                        classHeads.userId,

                    classId:
                        classHeads.classId,

                    className:
                        schoolClases.name,

                    academicYearId:
                        classHeads.academicYearId,
                })
                .from(classHeads)
                .innerJoin(
                    schoolClases,
                    eq(
                        classHeads.classId,
                        schoolClases.id,
                    ),
                )
                .where(
                    eq(
                        classHeads.academicYearId,
                        academicYear.id,
                    ),
                )


        // =========================
        // Get users
        // =========================

        const users =
            await centralDb
                .select({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.schoolRole,
                })
                .from(user)
                .where(
                    eq(
                        user.schoolId,
                        schoolId,
                    ),
                )


        // =========================
        // Combine data
        // =========================

        const result =
            assignments.map(
                (assignment) => {

                    const head =
                        users.find(
                            (item) =>
                                item.id ===
                                assignment.userId,
                        )

                    return {
                        ...assignment,

                        head: head
                            ? {
                                id: head.id,
                                name: head.name,
                                email: head.email,
                                role: head.role,
                            }
                            : null,
                    }
                },
            )


        return NextResponse.json({
            success: true,
            assignments: result,
        })

    } catch (error) {

        console.error(
            "GET CLASS HEADS ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to get class heads",
            },
            { status: 500 },
        )
    }
}