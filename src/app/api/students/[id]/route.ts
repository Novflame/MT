
import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"

import { getSchoolDB } from "@/db"

import {
    students,
    studentEnrollments,
    parentStudents,
} from "@/db/schema"

import {
    getActiveAcademicYear,
} from "@/db/academic-year"

import { requirePermission } from "@/auth/session"


type Params = {
    params: Promise<{
        id: string
    }>
}


// =====================================================
// PATCH
// =====================================================

// =====================================================
// PATCH
// =====================================================

export async function PATCH(
    request: Request,
    { params }: Params,
) {
    try {
        await requirePermission(
            "students.update",
        )

        const { id } = await params

        const body =
            await request.json()

        // =================================================
        // Student fields
        // =================================================

        const firstName =
            String(
                body.firstName ?? "",
            ).trim()

        const middleName =
            String(
                body.middleName ?? "",
            ).trim()

        const lastName =
            String(
                body.lastName ?? "",
            ).trim()

        const classId =
            String(
                body.classId ?? "",
            ).trim()

        // =================================================
        // Validation
        // =================================================

        if (
            !firstName ||
            !middleName ||
            !lastName ||
            !classId
        ) {
            return NextResponse.json(
                {
                    error:
                        "First name, middle name, last name and class are required",
                },
                {
                    status: 400,
                },
            )
        }

        const db =
            await getSchoolDB()

        const academicYear =
            await getActiveAcademicYear()

        // =================================================
        // Student
        // =================================================

        const student =
            await db.query.students.findFirst({
                where:
                    eq(
                        students.id,
                        id,
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

        // =================================================
        // Update student name fields
        // =================================================

        const updatedStudent =
            await db
                .update(students)
                .set({
                    firstName,
                    middleName,
                    lastName,
                    updatedAt:
                        new Date().toISOString(),
                })
                .where(
                    eq(
                        students.id,
                        id,
                    ),
                )
                .returning()

        // =================================================
        // Current academic enrollment
        // =================================================

        const enrollment =
            await db.query.studentEnrollments.findFirst({
                where: and(
                    eq(
                        studentEnrollments.studentId,
                        id,
                    ),
                    eq(
                        studentEnrollments.academicYearId,
                        academicYear.id,
                    ),
                ),
            })

        if (!enrollment) {
            await db
                .insert(studentEnrollments)
                .values({
                    id:
                        globalThis.crypto.randomUUID(),

                    studentId:
                        id,

                    academicYearId:
                        academicYear.id,

                    classId,
                })
                .run()
        } else {
            await db
                .update(studentEnrollments)
                .set({
                    classId,
                })
                .where(
                    eq(
                        studentEnrollments.id,
                        enrollment.id,
                    ),
                )
                .run()
        }

        return NextResponse.json({
            success: true,

            data:
                updatedStudent[0],
        })
    } catch (error) {
        console.error(error)

        if (
            error instanceof Error &&
            error.message === "Forbidden"
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

        return NextResponse.json(
            {
                error:
                    "Failed to update student",
            },
            {
                status: 500,
            },
        )
    }
}


// =====================================================
// DELETE
// =====================================================

export async function DELETE(
    request: Request,
    { params }: Params,
) {

    try {

        await requirePermission(
            "students.delete",
        )


        const { id } = await params


        const db =
            await getSchoolDB()


        // =================================================
        // Check student
        // =================================================

        const student =
            await db.query.students.findFirst({
                where:
                    eq(
                        students.id,
                        id,
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


        // =================================================
        // Delete parent/student links
        // =================================================

        await db
            .delete(parentStudents)
            .where(
                eq(
                    parentStudents.studentId,
                    id,
                ),
            )


        // =================================================
        // Delete enrollments
        // =================================================

        // const enrollments =
        //     await db.query.studentEnrollments.findMany({
        //         where:
        //             eq(
        //                 studentEnrollments.studentId,
        //                 id,
        //             ),
        //     })


        // =================================================
        // Delete attendance + grades
        // =================================================

        // for (
        //     const enrollment
        //     of enrollments
        // ) {

        //     // Attendance

        //     // Grades

        //     // These must be removed before
        //     // deleting the enrollment because
        //     // they reference it.
        // }


        // =================================================
        // Delete enrollments
        // =================================================

        await db
            .delete(studentEnrollments)
            .where(
                eq(
                    studentEnrollments.studentId,
                    id,
                ),
            )


        // =================================================
        // Delete student
        // =================================================

        const deletedStudent =
            await db
                .delete(students)
                .where(
                    eq(
                        students.id,
                        id,
                    ),
                )
                .returning()


        return NextResponse.json({
            success: true,

            data:
                deletedStudent[0],
        })


    } catch (error) {

        console.error(error)


        if (
            error instanceof Error &&
            error.message === "Forbidden"
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


        return NextResponse.json(
            {
                error:
                    "Failed to delete student",
            },
            {
                status: 500,
            },
        )
    }
}

