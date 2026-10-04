
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"

import { getSchoolDB } from "@/db"

import {
    teacherAssignments,
    subjects,
    schoolClases,
} from "@/db/schema"

import {
    hasPermission,
    type Role,
} from "@/auth/permissions"

import { getActiveAcademicYear } from "@/db/academic-year"


// =====================================================
// POST
// Create teacher assignment
// =====================================================

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
                "assignments.create",
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

        const teacherId =
            typeof body.teacherId === "string"
                ? body.teacherId.trim()
                : ""

        const subjectId =
            typeof body.subjectId === "string"
                ? body.subjectId.trim()
                : ""

        const classId =
            typeof body.classId === "string"
                ? body.classId.trim()
                : ""


        if (
            !teacherId ||
            !subjectId ||
            !classId
        ) {
            return NextResponse.json(
                {
                    error:
                        "teacherId, subjectId and classId are required",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Verify teacher
        // =========================

        const teacher =
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
                            teacherId,
                        ),

                        eq(
                            user.schoolId,
                            schoolId,
                        ),
                    ),
                )
                .limit(1)


        if (teacher.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "Teacher not found in this school",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================
        // Roles allowed to teach
        // =========================

        const teachableRoles: Role[] = [
            "principal",
            "deputy",
            "head_of_class",
            "head_of_department",
            "teacher",
        ]


        if (
            !teachableRoles.includes(
                teacher[0].role as Role,
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "Selected user cannot teach",
                },
                {
                    status: 400,
                },
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
        // Verify subject
        // =========================

        const subject =
            await db
                .select({
                    id: subjects.id,
                })
                .from(subjects)
                .where(
                    eq(
                        subjects.id,
                        subjectId,
                    ),
                )
                .limit(1)


        if (subject.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "Subject not found",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================
        // Verify class
        // =========================

        const schoolClass =
            await db
                .select({
                    id: schoolClases.id,
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
                    error:
                        "Class not found",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================
        // Create assignment
        // =========================

        const assignment =
            await db
                .insert(
                    teacherAssignments,
                )
                .values({
                    academicYearId:
                        academicYear.id,

                    teacherId,

                    subjectId,

                    classId,
                })
                .returning()


        return NextResponse.json(
            {
                success: true,

                assignment:
                    assignment[0],
            },
            {
                status: 201,
            },
        )

    } catch (error) {

        console.error(
            "CREATE TEACHER ASSIGNMENT ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to create teacher assignment",
            },
            {
                status: 500,
            },
        )
    }
}


// =====================================================
// GET
// Get teacher assignments
// =====================================================

export async function GET(
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
        // Current user
        // =========================

        const currentRole =
            session.user.schoolRole as Role

        const schoolId =
            session.user.schoolId


        // =========================
        // Permission
        // =========================


        // =========================
        // School database
        // =========================

        const db =
            await getSchoolDB()

        const academicYear =
            await getActiveAcademicYear()


        // =========================
        // Determine data scope
        // =========================

        const isTeacher =
            currentRole === "teacher" ||
            currentRole === "head_of_class"


        // =========================
        // Assignment condition
        // =========================

        const assignmentCondition =
            isTeacher

                ? and(
                    eq(
                        teacherAssignments.academicYearId,
                        academicYear.id,
                    ),

                    eq(
                        teacherAssignments.teacherId,
                        session.user.id,
                    ),
                )

                : eq(
                    teacherAssignments.academicYearId,
                    academicYear.id,
                )


        // =========================
        // Get assignments
        // =========================

        const assignments =
            await db
                .select({
                    teacherId:
                        teacherAssignments.teacherId,

                    subjectId:
                        teacherAssignments.subjectId,

                    subjectName:
                        subjects.name,

                    classId:
                        teacherAssignments.classId,

                    className:
                        schoolClases.name,

                    gradeLevel:
                        schoolClases.gradeLevel,
                })
                .from(
                    teacherAssignments,
                )
                .innerJoin(
                    subjects,
                    eq(
                        teacherAssignments.subjectId,
                        subjects.id,
                    ),
                )
                .innerJoin(
                    schoolClases,
                    eq(
                        teacherAssignments.classId,
                        schoolClases.id,
                    ),
                )
                .where(
                    assignmentCondition,
                )


        // =========================
        // Get teachers
        // =========================

        const teachers =
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
                assignment => {

                    const teacher =
                        teachers.find(
                            item =>
                                item.id ===
                                assignment.teacherId,
                        )


                    return {
                        ...assignment,

                        teacher:
                            teacher
                                ? {
                                    id:
                                        teacher.id,

                                    name:
                                        teacher.name,

                                    email:
                                        teacher.email,
                                }
                                : null,
                    }
                },
            )


        // =========================
        // Response
        // =========================

        return NextResponse.json({
            success: true,

            assignments: result,
        })

    } catch (error) {

        console.error(
            "GET TEACHER ASSIGNMENTS ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to get teacher assignments",
            },
            {
                status: 500,
            },
        )
    }
}

