import { NextResponse } from "next/server"

import { auth } from "@/auth/auth"
import { getSchoolDB } from "@/db"

import {
    attendance,
    teacherAssignments,
    studentEnrollments,
    students,
    schoolClases,
    classHeads,
} from "@/db/schema"

import {
    hasPermission,
    type Role,
} from "@/auth/permissions"

import {
    canManageAttendance,
} from "@/auth/authorization"

import { getStudentFullName } from "@/lib/student-name"

import { and, eq } from "drizzle-orm"


const validStatuses = [
    "present",
    "absent",
    "late",
    "excused",
] as const


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
                "attendance.create",
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

        const {
            studentEnrollmentId,
            subjectId,
            date,
            status,
            note,
        } = body


        if (
            !studentEnrollmentId ||
            !subjectId ||
            !date ||
            !status
        ) {
            return NextResponse.json(
                {
                    error:
                        "studentEnrollmentId, date and status are required",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Validate status
        // =========================

        if (
            !validStatuses.includes(status)
        ) {
            return NextResponse.json(
                {
                    error:
                        "Invalid attendance status",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Authorization
        // =========================

        const allowed =
            await canManageAttendance(
                user,
                studentEnrollmentId,
                subjectId,
            )

        if (!allowed) {
            return NextResponse.json(
                {
                    error:
                        "You are not allowed to manage this student's attendance",
                },
                {
                    status: 403,
                },
            )
        }


        // =========================
        // Database
        // =========================

        const db =
            await getSchoolDB()


        // =========================
        // Create attendance
        // =========================

        const result =
            await db
                .insert(attendance)
                .values({
                    id:
                        globalThis.crypto
                            .randomUUID(),

                    studentEnrollmentId,

                    subjectId,

                    date,

                    status,

                    note:
                        note?.trim() || null,
                })
                .returning()


        return NextResponse.json(
            {
                success: true,
                data: result[0],
            },
            {
                status: 201,
            },
        )

    } catch (error) {

        console.error(error)

        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "SQLITE_CONSTRAINT_UNIQUE"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Attendance already exists for this student on this date",
                },
                {
                    status: 409,
                },
            )
        }

        return NextResponse.json(
            {
                error:
                    "Failed to create attendance",
            },
            {
                status: 500,
            },
        )
    }
}


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
        // Date
        // =========================

        const { searchParams } =
            new URL(request.url)

        const date =
            searchParams.get("date")

        if (!date) {
            return NextResponse.json(
                {
                    error: "date is required",
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


        // =========================
        // Head of Class
        // =========================

        if (
            user.role ===
            "head_of_class"
        ) {

            const result =
                await db
                    .select({
                        attendanceId:
                            attendance.id,

                        studentEnrollmentId:
                            attendance.studentEnrollmentId,

                        date:
                            attendance.date,

                        status:
                            attendance.status,

                        note:
                            attendance.note,

                        studentId:
                            students.id,

                        studentFirstName:
                            students.firstName,

                        studentMiddleName:
                            students.middleName,

                        studentLastName:
                            students.lastName,

                        classId:
                            schoolClases.id,

                        className:
                            schoolClases.name,

                        subjectId:
                            attendance.subjectId,
                    })
                    .from(attendance)

                    .innerJoin(
                        studentEnrollments,
                        eq(
                            attendance.studentEnrollmentId,
                            studentEnrollments.id,
                        ),
                    )

                    .innerJoin(
                        teacherAssignments,
                        and(
                            eq(
                                studentEnrollments.classId,
                                teacherAssignments.classId,
                            ),

                            eq(
                                studentEnrollments.academicYearId,
                                teacherAssignments.academicYearId,
                            ),

                            eq(
                                attendance.subjectId,
                                teacherAssignments.subjectId,
                            ),
                        ),
                    )

                    .innerJoin(
                        students,
                        eq(
                            studentEnrollments.studentId,
                            students.id,
                        ),
                    )

                    .innerJoin(
                        schoolClases,
                        eq(
                            studentEnrollments.classId,
                            schoolClases.id,
                        ),
                    )

                    .innerJoin(
                        classHeads,
                        eq(
                            studentEnrollments.classId,
                            classHeads.classId,
                        ),
                    )

                    .where(
                        and(
                            eq(
                                attendance.date,
                                date,
                            ),

                            eq(
                                classHeads.userId,
                                user.id,
                            ),
                        ),
                    )


            const data =
                result.map(
                    (student) => ({
                        attendanceId:
                            student.attendanceId,

                        studentEnrollmentId:
                            student.studentEnrollmentId,

                        date:
                            student.date,

                        status:
                            student.status,

                        note:
                            student.note,

                        studentId:
                            student.studentId,

                        studentName:
                            getStudentFullName({
                                firstName:
                                    student.studentFirstName,

                                middleName:
                                    student.studentMiddleName,

                                lastName:
                                    student.studentLastName,
                            }),

                        classId:
                            student.classId,

                        className:
                            student.className,

                        subjectId:
                            student.subjectId,
                    }),
                )


            return NextResponse.json({
                success: true,
                data,
            })
        }


        // =========================
        // Teacher
        // =========================

        if (
            user.role === "teacher"
        ) {

            const result =
                await db
                    .select({
                        attendanceId:
                            attendance.id,

                        studentEnrollmentId:
                            attendance.studentEnrollmentId,

                        date:
                            attendance.date,

                        status:
                            attendance.status,

                        note:
                            attendance.note,

                        studentId:
                            students.id,

                        studentFirstName:
                            students.firstName,

                        studentMiddleName:
                            students.middleName,

                        studentLastName:
                            students.lastName,

                        classId:
                            schoolClases.id,

                        className:
                            schoolClases.name,
                    })
                    .from(attendance)

                    .innerJoin(
                        studentEnrollments,
                        eq(
                            attendance.studentEnrollmentId,
                            studentEnrollments.id,
                        ),
                    )

                    .innerJoin(
                        students,
                        eq(
                            studentEnrollments.studentId,
                            students.id,
                        ),
                    )

                    .innerJoin(
                        schoolClases,
                        eq(
                            studentEnrollments.classId,
                            schoolClases.id,
                        ),
                    )

                    .innerJoin(
                        teacherAssignments,
                        and(
                            eq(
                                studentEnrollments.classId,
                                teacherAssignments.classId,
                            ),

                            eq(
                                studentEnrollments.academicYearId,
                                teacherAssignments.academicYearId,
                            ),

                            eq(
                                attendance.subjectId,
                                teacherAssignments.subjectId,
                            ),
                        ),
                    )

                    .where(
                        and(
                            eq(
                                attendance.date,
                                date,
                            ),

                            eq(
                                teacherAssignments.teacherId,
                                user.id,
                            ),
                        ),
                    )


            const data =
                result.map(
                    (student) => ({
                        attendanceId:
                            student.attendanceId,

                        studentEnrollmentId:
                            student.studentEnrollmentId,

                        date:
                            student.date,

                        status:
                            student.status,

                        note:
                            student.note,

                        studentId:
                            student.studentId,

                        studentName:
                            getStudentFullName({
                                firstName:
                                    student.studentFirstName,

                                middleName:
                                    student.studentMiddleName,

                                lastName:
                                    student.studentLastName,
                            }),

                        classId:
                            student.classId,

                        className:
                            student.className,
                    }),
                )


            return NextResponse.json({
                success: true,
                data,
            })
        }


        // =========================
        // Principal / Deputy
        // =========================

        const result =
            await db
                .select({
                    attendanceId:
                        attendance.id,

                    studentEnrollmentId:
                        attendance.studentEnrollmentId,

                    date:
                        attendance.date,

                    status:
                        attendance.status,

                    note:
                        attendance.note,

                    studentId:
                        students.id,

                    studentFirstName:
                        students.firstName,

                    studentMiddleName:
                        students.middleName,

                    studentLastName:
                        students.lastName,

                    classId:
                        schoolClases.id,

                    className:
                        schoolClases.name,
                })
                .from(attendance)

                .innerJoin(
                    studentEnrollments,
                    eq(
                        attendance.studentEnrollmentId,
                        studentEnrollments.id,
                    ),
                )

                .innerJoin(
                    students,
                    eq(
                        studentEnrollments.studentId,
                        students.id,
                    ),
                )

                .innerJoin(
                    schoolClases,
                    eq(
                        studentEnrollments.classId,
                        schoolClases.id,
                    ),
                )

                .where(
                    eq(
                        attendance.date,
                        date,
                    ),
                )


        const data =
            result.map(
                (student) => ({
                    attendanceId:
                        student.attendanceId,

                    studentEnrollmentId:
                        student.studentEnrollmentId,

                    date:
                        student.date,

                    status:
                        student.status,

                    note:
                        student.note,

                    studentId:
                        student.studentId,

                    studentName:
                        getStudentFullName({
                            firstName:
                                student.studentFirstName,

                            middleName:
                                student.studentMiddleName,

                            lastName:
                                student.studentLastName,
                        }),

                    classId:
                        student.classId,

                    className:
                        student.className,
                }),
            )


        return NextResponse.json({
            success: true,
            data,
        })

    } catch (error) {

        console.error(error)

        return NextResponse.json(
            {
                error:
                    "Failed to fetch attendance",
            },
            {
                status: 500,
            },
        )
    }
}


export async function PATCH(
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
                "attendance.update",
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

        const {
            attendanceId,
            status,
            note,
        } = body


        if (
            !attendanceId ||
            !status
        ) {
            return NextResponse.json(
                {
                    error:
                        "attendanceId and status are required",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Validate status
        // =========================

        if (
            !validStatuses.includes(status)
        ) {
            return NextResponse.json(
                {
                    error:
                        "Invalid attendance status",
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


        // =========================
        // Find attendance
        // =========================

        const existing =
            await db
                .select({
                    id:
                        attendance.id,

                    studentEnrollmentId:
                        attendance.studentEnrollmentId,

                    subjectId:
                        attendance.subjectId,
                })
                .from(attendance)

                .where(
                    eq(
                        attendance.id,
                        attendanceId,
                    ),
                )

                .limit(1)


        if (
            existing.length === 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "Attendance record not found",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================
        // Authorization
        // =========================

        const allowed =
            await canManageAttendance(
                user,
                existing[0]
                    .studentEnrollmentId,
                existing[0]
                    .subjectId,
            )

        if (!allowed) {
            return NextResponse.json(
                {
                    error:
                        "You are not allowed to manage this student's attendance",
                },
                {
                    status: 403,
                },
            )
        }


        // =========================
        // Update
        // =========================

        const result =
            await db
                .update(attendance)
                .set({
                    status,

                    note:
                        note?.trim() || null,
                })

                .where(
                    eq(
                        attendance.id,
                        attendanceId,
                    ),
                )

                .returning()


        return NextResponse.json({
            success: true,
            data: result[0],
        })

    } catch (error) {

        console.error(error)

        return NextResponse.json(
            {
                error:
                    "Failed to update attendance",
            },
            {
                status: 500,
            },
        )
    }
}