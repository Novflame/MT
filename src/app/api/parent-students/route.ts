
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"

import { getSchoolDB } from "@/db"

import {
    parentStudents,
    parents,
    students,
} from "@/db/schema"

import {
    requirePermission,
    requireSession,
} from "@/auth/session"


// =========================================
// GET
// Get children of the currently logged-in parent
// =========================================

export async function GET() {

    try {

        const session =
            await requireSession()

        const db =
            await getSchoolDB()


        // -----------------------------------------
        // Find parent profile using Better Auth user
        // -----------------------------------------

        const parent =
            await db.query.parents.findFirst({
                where: eq(
                    parents.userId,
                    session.user.id,
                ),
            })


        if (!parent) {

            return NextResponse.json(
                {
                    error:
                        "Parent profile not found",
                },
                {
                    status: 404,
                },
            )
        }


        // -----------------------------------------
        // Get linked students
        // -----------------------------------------

        const rows =
            await db.query.parentStudents.findMany({
                where: eq(
                    parentStudents.parentId,
                    parent.id,
                ),

                with: {
                    student: true,
                },
            })


        return NextResponse.json(
            rows,
        )

    } catch (error) {

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get children",
            },
            {
                status: 500,
            },
        )
    }
}


// =========================================
// POST
// Link an existing parent account to a student
// =========================================

export async function POST(
    request: Request,
) {

    try {

        const session =
            await requirePermission(
                "users.update",
            )

        const db =
            await getSchoolDB()


        const body =
            await request.json()


        const parentUserId =
            String(
                body.parentUserId ?? "",
            ).trim()


        const studentId =
            String(
                body.studentId ?? "",
            ).trim()


        if (
            !parentUserId ||
            !studentId
        ) {

            return NextResponse.json(
                {
                    error:
                        "Parent and student are required",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================================
        // Verify Parent user in central database
        // =========================================

        const [parentUser] =
            await centralDb
                .select({
                    id: user.id,
                    role: user.schoolRole,
                    schoolId: user.schoolId,
                })
                .from(user)
                .where(
                    and(
                        eq(
                            user.id,
                            parentUserId,
                        ),

                        eq(
                            user.schoolId,
                            session.user.schoolId,
                        ),
                    ),
                )
                .limit(1)


        if (
            !parentUser ||
            parentUser.role !== "parent"
        ) {

            return NextResponse.json(
                {
                    error:
                        "Parent account not found in this school",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================================
        // Find Parent profile in school database
        // =========================================

        const parent =
            await db.query.parents.findFirst({
                where: eq(
                    parents.userId,
                    parentUser.id,
                ),
            })


        if (!parent) {

            return NextResponse.json(
                {
                    error:
                        "Parent profile not found",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================================
        // Verify Student
        // =========================================

        const student =
            await db.query.students.findFirst({
                where: eq(
                    students.id,
                    studentId,
                ),
            })


        if (!student) {

            return NextResponse.json(
                {
                    error:
                        "Student not found",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================================
        // Link Parent ↔ Student
        // =========================================

        const [row] =
            await db
                .insert(parentStudents)
                .values({
                    id:
                        crypto.randomUUID(),

                    parentId:
                        parent.id,

                    studentId,
                })
                .returning()


        return NextResponse.json(
            row,
            {
                status: 201,
            },
        )

    } catch (error) {

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to link parent",
            },
            {
                status: 500,
            },
        )
    }
}

