import { and, eq } from "drizzle-orm"
import { getSchoolDB } from "@/db"
import { departmentHeads, teacherAssignments, subjects } from "@/db/schema"
import { hasPermission, type Permission, type Role } from "./permissions"

type User = { id: string; role: Role }

export async function canManageAcademicResource(
    user: User,
    permission: Permission,
    input: { academicYearId: string; classId: string; subjectId: string },
) {
    if (!hasPermission(user.role, permission)) return false
    if (user.role === "principal" || user.role === "deputy") return true

    const db = await getSchoolDB()

    if (user.role === "teacher") {
        const row = await db.query.teacherAssignments.findFirst({
            where: and(
                eq(teacherAssignments.teacherId, user.id),
                eq(teacherAssignments.academicYearId, input.academicYearId),
                eq(teacherAssignments.classId, input.classId),
                eq(teacherAssignments.subjectId, input.subjectId),
            ),
        })
        return !!row
    }

    if (user.role === "head_of_department") {
        const row = await db.query.departmentHeads.findFirst({
            where: and(
                eq(departmentHeads.userId, user.id),
                eq(departmentHeads.academicYearId, input.academicYearId),
            ),
            with: { department: true },
        })
        if (!row) return false
        const subject = await db.query.subjects.findFirst({
            where: eq(subjects.id, input.subjectId),
        })
        return !!subject && subject.departmentId === row.departmentId
    }

    return false
}
