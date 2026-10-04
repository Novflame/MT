
import { NextResponse } from "next/server"

import { auth } from "@/auth/auth"
import { getSchoolDB } from "@/db"

import {
    students,
    parents,
    parentStudents,
    studentEnrollments,
} from "@/db/schema"
import {
    getActiveAcademicYear,
} from "@/db/academic-year"

import {
    hasPermission,
    type Role,
} from "@/auth/permissions"

import {
    canCreateStudent,
} from "@/auth/authorization"


export async function POST(
    request: Request,
) {
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
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            )
        }

        // =========================
        // User
        // =========================

        const user = {
            id: session.user.id,

            role:
                session.user.schoolRole as Role,
        }

        // =========================
        // Permission
        // =========================

        if (
            !hasPermission(
                user.role,
                "students.create",
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

        // =========================
        // Request body
        // =========================

        const body =
            await request.json()

        const admissionNumber =
            String(
                body.admissionNumber ?? "",
            ).trim()

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

        const dateOfBirth =
            String(
                body.dateOfBirth ?? "",
            ).trim()

        const gender =
            String(
                body.gender ?? "",
            ).trim()

        const nationality =
            String(
                body.nationality ?? "",
            ).trim()

        const nationalId =
            body.nationalId
                ? String(
                    body.nationalId,
                ).trim()
                : null

        const photo =
            body.photo
                ? String(
                    body.photo,
                ).trim()
                : null

        const phone =
            String(
                body.phone ?? "",
            ).trim()

        const email =
            body.email
                ? String(
                    body.email,
                ).trim()
                : null

        const address =
            String(
                body.address ?? "",
            ).trim()

        const city =
            String(
                body.city ?? "",
            ).trim()

        const notes =
            body.notes
                ? String(
                    body.notes,
                ).trim()
                : null

        const parentName =
            String(
                body.parentName ?? "",
            ).trim()

        const parentPhone =
            String(
                body.parentPhone ?? "",
            ).trim()

        const classId =
            String(
                body.classId ?? "",
            ).trim()

        const parentAction =
            body.parentAction === "link"
                ? "link"
                : "create"

        const existingParentId =
            body.existingParentId
                ? String(
                    body.existingParentId,
                ).trim()
                : null

        // =========================
        // Validation
        // =========================

        if (
            !admissionNumber ||
            !firstName ||
            !middleName ||
            !lastName ||
            !dateOfBirth ||
            !gender ||
            !nationality ||
            !phone ||
            !address ||
            !city ||
            !parentName ||
            !classId
        ) {
            return NextResponse.json(
                {
                    error:
                        "Admission number, first name, middle name, last name, date of birth, gender, nationality, phone, address, city, parent name and class are required.",
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

        const academicYear =
            await getActiveAcademicYear()

        // =========================
        // Head of Class scope
        // =========================

        if (
            user.role ===
            "head_of_class"
        ) {
            const allowed =
                await canCreateStudent(
                    user,
                    classId,
                )

            if (!allowed) {
                return NextResponse.json(
                    {
                        error:
                            "You are not allowed to add students.",
                    },
                    {
                        status: 403,
                    },
                )
            }
        }

        // =========================
        // Transaction
        // =========================

        const result =
            db.transaction(
                (tx) => {
                    // =========================
                    // Parent
                    // =========================

                    let parentId: string

                    if (
                        parentAction ===
                        "link"
                    ) {
                        if (
                            !existingParentId
                        ) {
                            throw new Error(
                                "Existing parent is required.",
                            )
                        }

                        const existingParent =
                            tx.query.parents.findFirst({
                                where: (
                                    parent,
                                    { eq },
                                ) =>
                                    eq(
                                        parent.id,
                                        existingParentId,
                                    ),
                            })

                        if (!existingParent) {
                            throw new Error(
                                "Parent not found.",
                            )
                        }

                        parentId =
                            existingParentId
                    } else {
                        parentId =
                            globalThis.crypto.randomUUID()

                        tx
                            .insert(parents)
                            .values({
                                id:
                                    parentId,

                                name:
                                    parentName,

                                phone:
                                    parentPhone,
                            })
                            .run()
                    }

                    // =========================
                    // Student
                    // =========================

                    const studentId =
                        globalThis.crypto.randomUUID()

                    const now =
                        new Date().toISOString()

                    const newStudent =
                        tx
                            .insert(students)
                            .values({
                                id:
                                    studentId,

                                admissionNumber,

                                firstName,

                                middleName,

                                lastName,

                                dateOfBirth,

                                gender,

                                nationality,

                                nationalId,

                                photo,

                                phone,

                                email,

                                address,

                                city,

                                status:
                                    "active",

                                notes,

                                createdAt:
                                    now,

                                updatedAt:
                                    now,
                            })
                            .returning()
                            .all()

                    // =========================
                    // Enrollment
                    // =========================

                    tx
                        .insert(studentEnrollments)
                        .values({
                            id:
                                globalThis.crypto.randomUUID(),

                            studentId,

                            academicYearId:
                                academicYear.id,

                            classId,
                        })
                        .run()

                    // =========================
                    // Parent ↔ Student
                    // =========================

                    tx
                        .insert(parentStudents)
                        .values({
                            id:
                                globalThis.crypto.randomUUID(),

                            parentId,

                            studentId,
                        })
                        .run()

                    return {
                        student:
                            newStudent[0],

                        parentId,
                    }
                },
            )

        // =========================
        // Response
        // =========================

        return NextResponse.json(
            {
                success: true,

                data: result,
            },
            {
                status: 201,
            },
        )
    } catch (error) {
        console.error(error)

        if (
            error instanceof Error
        ) {
            if (
                error.message ===
                "Forbidden"
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

            if (
                error.message ===
                "Existing parent is required."
            ) {
                return NextResponse.json(
                    {
                        error:
                            error.message,
                    },
                    {
                        status: 400,
                    },
                )
            }

            if (
                error.message ===
                "Parent not found."
            ) {
                return NextResponse.json(
                    {
                        error:
                            error.message,
                    },
                    {
                        status: 404,
                    },
                )
            }
        }

        return NextResponse.json(
            {
                error:
                    "Failed to add student",
            },
            {
                status: 500,
            },
        )
    }
}
