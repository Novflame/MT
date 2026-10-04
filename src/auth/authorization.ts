
import { eq, and } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import {
    students,
    classHeads,
    studentEnrollments,
    teacherAssignments,

} from "@/db/schema"

import {
    hasPermission,
    type Permission,
    type Role,
} from "./permissions"



type AuthorizationUser = {
    id: string
    role: Role
}


export function checkPermission(
    user: AuthorizationUser,
    permission: Permission,
) {
    return hasPermission(
        user.role,
        permission,
    )
}


export async function canManageStudent(
    user: AuthorizationUser,
    studentId: string,
) {
    if (
        !hasPermission(
            user.role,
            "students.update",
        )
    ) {
        return false
    }


    // Principal and Deputy
    // can manage students
    // throughout their school.

    if (
        user.role === "principal" ||
        user.role === "deputy"
    ) {
        return true
    }


    const db = await getSchoolDB()


    // Head of Class
    // can manage students
    // belonging to their class.

    if (user.role === "head_of_class") {
        const result = await db
            .select({
                studentId: students.id,
            })
            .from(students)
            .innerJoin(
                studentEnrollments,
                eq(
                    students.id,
                    studentEnrollments.studentId,
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
                        students.id,
                        studentId,
                    ),

                    eq(
                        classHeads.userId,
                        user.id,
                    ),

                    eq(
                        studentEnrollments.academicYearId,
                        classHeads.academicYearId,
                    ),
                ),
            )
            .limit(1)



        return result.length > 0
    }


    return false
}




export async function canCreateStudent(
    user: AuthorizationUser,
    classId: string,
) {
    if (
        !hasPermission(
            user.role,
            "students.create",
        )
    ) {
        return false
    }

    // Principal and Deputy
    // can create students in any class
    // inside their school.

    if (
        user.role === "principal" ||
        user.role === "deputy"
    ) {
        return true
    }


    // Head of Class
    // can create students only
    // in their assigned class.

    if (
        user.role === "head_of_class"
    ) {
        const db = await getSchoolDB()

        const result = await db
            .select({
                userId: classHeads.userId,
            })
            .from(classHeads)
            .where(
                and(
                    eq(
                        classHeads.userId,
                        user.id,
                    ),

                    eq(
                        classHeads.classId,
                        classId,
                    ),
                ),
            )
            .limit(1)

        return result.length > 0
    }


    return false
}

export async function canManageAttendance(
    user: AuthorizationUser,
    studentEnrollmentId: string,
    subjectId: string,
) {
    if (
        !hasPermission(
            user.role,
            "attendance.create",
        )
    ) {
        return false
    }


    // Principal and Deputy
    // can manage attendance
    // throughout their school.

    if (
        user.role === "principal" ||
        user.role === "deputy"
    ) {
        return true
    }


    const db =
        await getSchoolDB()


    // Head of Class
    // can manage attendance only
    // for students in their assigned class.

    if (
        user.role === "head_of_class"
    ) {
        const result =
            await db
                .select({
                    enrollmentId:
                        studentEnrollments.id,
                })
                .from(studentEnrollments)

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
                            studentEnrollments.id,
                            studentEnrollmentId,
                        ),

                        eq(
                            classHeads.userId,
                            user.id,
                        ),

                        eq(
                            studentEnrollments.academicYearId,
                            classHeads.academicYearId,
                        ),
                    ),
                )

                .limit(10)

        

        return result.length > 0
    }


    // Teacher
    // can manage attendance only
    // for students in classes assigned
    // to that teacher.

    if (
        user.role === "teacher"
    ) {
        const result =
            await db
                .select({
                    enrollmentId:
                        studentEnrollments.id,
                })
                .from(studentEnrollments)

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
                    ),
                )

                .where(
                    and(
                        eq(
                            studentEnrollments.id,
                            studentEnrollmentId,
                        ),

                        eq(
                            teacherAssignments.teacherId,
                            user.id,
                        ),
                        eq(
                            teacherAssignments.subjectId,
                            subjectId,
                        ),
                    ),
                )

                .limit(1)

        return result.length > 0
    }


    return false
}