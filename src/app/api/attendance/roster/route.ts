import { NextResponse } from "next/server"

import { and, eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { getSchoolDB } from "@/db"
import { getStudentFullName } from "@/lib/student-name"
import {
    attendance,
    studentEnrollments,
    students,
    teacherAssignments,
} from "@/db/schema"

import {
    hasPermission,
    type Role,
} from "@/auth/permissions"

import { getActiveAcademicYear } from "@/db/academic-year"


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
                "attendance.read",
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
        // Query parameters
        // =========================

        const { searchParams } =
            new URL(request.url)

        const classId =
            searchParams.get("classId")

        const subjectId =
            searchParams.get("subjectId")

        const date =
            searchParams.get("date")


        if (
            !classId ||
            !subjectId ||
            !date
        ) {
            return NextResponse.json(
                {
                    error:
                        "classId, subjectId and date are required",
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
        // Teacher scope
        // =========================

        const isTeacher =
            user.role === "teacher"

        const isHeadOfClass =
            user.role === "head_of_class"


        /*
         * Teacher:
         *
         * Must have an assignment for:
         *
         * current academic year
         * + class
         * + subject
         * + current user
         */

        if (isTeacher) {

            const assignment =
                await db
                    .select({
                        teacherId:
                            teacherAssignments.teacherId,
                    })
                    .from(
                        teacherAssignments,
                    )
                    .where(
                        and(
                            eq(
                                teacherAssignments.teacherId,
                                user.id,
                            ),

                            eq(
                                teacherAssignments.classId,
                                classId,
                            ),

                            eq(
                                teacherAssignments.subjectId,
                                subjectId,
                            ),

                            eq(
                                teacherAssignments.academicYearId,
                                academicYear.id,
                            ),
                        ),
                    )
                    .limit(1)


            if (
                assignment.length === 0
            ) {
                return NextResponse.json(
                    {
                        error:
                            "You are not assigned to teach this subject in this class",
                    },
                    {
                        status: 403,
                    },
                )
            }
        }


        /*
         * Head of class:
         *
         * Their scope will be validated
         * by canManageAttendance().
         *
         * We do not require them to have
         * a teacher assignment here.
         *
         * This allows a head of class to
         * manage their assigned class.
         */


        // =========================
        // Get students
        // =========================

        const roster =
            await db
                .select({
                    studentEnrollmentId:
                        studentEnrollments.id,

                    studentId:
                        students.id,

                    studentFirstName: students.firstName,
                    studentMiddleName: students.middleName,
                    studentLastName: students.lastName,
                })
                .from(
                    studentEnrollments,
                )
                .innerJoin(
                    students,
                    eq(
                        studentEnrollments.studentId,
                        students.id,
                    ),
                )
                .where(
                    and(
                        eq(
                            studentEnrollments.classId,
                            classId,
                        ),

                        eq(
                            studentEnrollments.academicYearId,
                            academicYear.id,
                        ),
                    ),
                )


        // =========================
        // Get attendance
        // =========================

        const attendanceRecords =
            await db
                .select({
                    id:
                        attendance.id,

                    studentEnrollmentId:
                        attendance.studentEnrollmentId,

                    status:
                        attendance.status,

                    note:
                        attendance.note,
                })
                .from(attendance)
                .where(
                    and(
                        eq(
                            attendance.date,
                            date,
                        ),

                        eq(
                            attendance.subjectId,
                            subjectId,
                        ),
                    ),
                )


        // =========================
        // Combine
        // =========================

        const result =
            roster.map(
                (student) => {

                    const record =
                        attendanceRecords.find(
                            item =>
                                item.studentEnrollmentId ===
                                student.studentEnrollmentId,
                        )


                    return {
                        studentEnrollmentId:
                            student.studentEnrollmentId,

                        studentId:
                            student.studentId,

                        firstName:
                            student.studentFirstName,

                        middleName:
                            student.studentMiddleName,

                        lastName:
                            student.studentLastName,

                        studentName:
                            getStudentFullName({
                                firstName: student.studentFirstName,
                                middleName: student.studentMiddleName,
                                lastName: student.studentLastName,
                            }),

                        attendance:
                            record
                                ? {
                                    id:
                                        record.id,

                                    status:
                                        record.status,

                                    note:
                                        record.note,
                                }
                                : null,
                    }
                },
            )


        return NextResponse.json({
            success: true,

            data: result,
        })

    } catch (error) {

        console.error(
            "GET ATTENDANCE ROSTER ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to get attendance roster",
            },
            {
                status: 500,
            },
        )
    }
}
