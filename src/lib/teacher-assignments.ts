import { and, eq } from "drizzle-orm"

import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"

import {
    teacherAssignments,
    subjects,
    schoolClases,
} from "@/db/schema"

import type { Role } from "@/auth/permissions"
import { getActiveAcademicYear } from "@/db/academic-year"

type GetTeacherAssignmentsOptions = {
    userId: string
    schoolId: number
    schoolRole: Role
    academicYearId?: string
}

export async function getTeacherAssignments({
    userId,
    schoolId,
    schoolRole,
    academicYearId,
}: GetTeacherAssignmentsOptions) {
    const db = await getSchoolDB()

    const academicYear = academicYearId
        ? await db.query.academicYears.findFirst({
            where: (years, { eq }) =>
                eq(years.id, academicYearId),
        })
        : await getActiveAcademicYear()

    if (!academicYear) {
        return null
    }

    const isTeacher =
        schoolRole === "teacher" ||
        schoolRole === "head_of_class"

    const assignmentCondition = isTeacher
        ? and(
            eq(
                teacherAssignments.academicYearId,
                academicYear.id,
            ),
            eq(
                teacherAssignments.teacherId,
                userId,
            ),
        )
        : eq(
            teacherAssignments.academicYearId,
            academicYear.id,
        )

    const assignments = await db
        .select({
            teacherId: teacherAssignments.teacherId,
            subjectId: teacherAssignments.subjectId,
            subjectName: subjects.name,
            classId: teacherAssignments.classId,
            className: schoolClases.name,
            gradeLevel: schoolClases.gradeLevel,
        })
        .from(teacherAssignments)
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
        .where(assignmentCondition)

    const teachers = await centralDb
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
        })
        .from(user)
        .where(
            eq(user.schoolId, schoolId),
        )

    return {
        academicYear,
        assignments: assignments.map(assignment => {
            const teacher = teachers.find(
                item => item.id === assignment.teacherId,
            )

            return {
                ...assignment,
                teacher: teacher
                    ? {
                        id: teacher.id,
                        name: teacher.name,
                        email: teacher.email,
                    }
                    : null,
            }
        }),
    }
}