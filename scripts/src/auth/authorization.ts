import { eq, and } from "drizzle-orm"
import { getSchoolDB } from "@/db"
import {
    students,
    classHeads,
    studentEnrollments,
    teacherAssignments,
    studentUsers,
    parents,
    parentStudents,
    departmentHeads,
    academicYears,
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


/** Enforces record-level access to a student within the authenticated school database. */
export async function canViewStudent(
    user: AuthorizationUser,
    studentId: string,
): Promise<boolean> {
    if (!hasPermission(user.role, "students.read")) return false
    if (user.role === "principal" || user.role === "deputy") return true

    const db = await getSchoolDB()

    if (user.role === "student") {
        const link = await db.query.studentUsers.findFirst({
            where: and(eq(studentUsers.userId, user.id), eq(studentUsers.studentId, studentId)),
        })
        return !!link
    }

    if (user.role === "parent") {
        const parent = await db.query.parents.findFirst({ where: eq(parents.userId, user.id) })
        if (!parent) return false
        const link = await db.query.parentStudents.findFirst({
            where: and(eq(parentStudents.parentId, parent.id), eq(parentStudents.studentId, studentId)),
        })
        return !!link
    }

    const enrollments = await db.query.studentEnrollments.findMany({
        where: eq(studentEnrollments.studentId, studentId),
    })
    if (!enrollments.length) return false

    if (user.role === "head_of_class") {
        for (const enrollment of enrollments) {
            const link = await db.query.classHeads.findFirst({
                where: and(
                    eq(classHeads.userId, user.id),
                    eq(classHeads.classId, enrollment.classId),
                    eq(classHeads.academicYearId, enrollment.academicYearId),
                ),
            })
            if (link) return true
        }
        return false
    }

    if (user.role === "teacher") {
        for (const enrollment of enrollments) {
            const assignment = await db.query.teacherAssignments.findFirst({
                where: and(
                    eq(teacherAssignments.teacherId, user.id),
                    eq(teacherAssignments.classId, enrollment.classId),
                    eq(teacherAssignments.academicYearId, enrollment.academicYearId),
                ),
            })
            if (assignment) return true
        }
        return false
    }

    if (user.role === "head_of_department") {
        for (const enrollment of enrollments) {
            const head = await db.query.departmentHeads.findFirst({
                where: and(
                    eq(departmentHeads.userId, user.id),
                    eq(departmentHeads.academicYearId, enrollment.academicYearId),
                ),
            })
            if (!head) continue
            const assignments = await db.query.teacherAssignments.findMany({
                where: and(
                    eq(teacherAssignments.classId, enrollment.classId),
                    eq(teacherAssignments.academicYearId, enrollment.academicYearId),
                ),
                with: { subject: true },
            })
            if (assignments.some((assignment) => assignment.subject.departmentId === head.departmentId)) return true
        }
    }

    return false
}


export async function canManageStudent(
    user: AuthorizationUser,
    studentId: string,
    permission: "students.update" | "students.delete" = "students.update",
) {
    if (
        !hasPermission(
            user.role,
            permission,
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

    if (user.role === "head_of_class") {
        const db = await getSchoolDB()
        const activeYear = await db.query.academicYears.findFirst({
            where: eq(academicYears.isActive, true),
        })
        if (!activeYear) return false
        const result = await db.query.classHeads.findFirst({
            where: and(
                eq(classHeads.userId, user.id),
                eq(classHeads.classId, classId),
                eq(classHeads.academicYearId, activeYear.id),
            ),
        })
        return !!result
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
