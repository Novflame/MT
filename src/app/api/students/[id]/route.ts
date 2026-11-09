import { NextResponse } from "next/server"
import { getSchoolDB } from "@/db"
import {
    students,
    studentEnrollments,
    parentStudents,
    promotionDecisions,
    resultCertificates,
    schoolCertificates,
    studentUsers,
} from "@/db/schema"
import {
    getActiveAcademicYear,
} from "@/db/academic-year"
import { eq, and, inArray } from "drizzle-orm"
import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"
import { canCreateStudent, canManageStudent } from "@/auth/authorization"
import { type Role } from "@/auth/permissions"

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
        const session = await requireApiPermission(request, "students.update")
        const { id } = await params
        const role = session.user.schoolRole as Role
        if (!(await canManageStudent({ id: session.user.id, role }, id, "students.update"))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

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

        if (!(await canCreateStudent({ id: session.user.id, role }, classId))) {
            return NextResponse.json({ error: "Forbidden: target class is outside your assignment" }, { status: 403 })
        }

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

        // Update the student's identity and active-year enrollment atomically.
        const updatedStudent = await db.transaction(async (tx) => {
            const [updated] = await tx.update(students).set({
                firstName,
                middleName,
                lastName,
                updatedAt: new Date().toISOString(),
            }).where(eq(students.id, id)).returning()

            const enrollment = await tx.query.studentEnrollments.findFirst({
                where: and(
                    eq(studentEnrollments.studentId, id),
                    eq(studentEnrollments.academicYearId, academicYear.id),
                ),
            })

            if (!enrollment) {
                await tx.insert(studentEnrollments).values({
                    id: globalThis.crypto.randomUUID(),
                    studentId: id,
                    academicYearId: academicYear.id,
                    classId,
                })
            } else {
                await tx.update(studentEnrollments).set({ classId }).where(
                    eq(studentEnrollments.id, enrollment.id),
                )
            }

            return updated
        })

        return NextResponse.json({
            success: true,

            data:
                updatedStudent,
        })
    } catch (error) {
        console.error(error)

        if (error instanceof ApiAuthorizationError) {
            return NextResponse.json({ error: error.message }, { status: error.status })
        }
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
        const session = await requireApiPermission(request, "students.delete")
        const { id } = await params
        const role = session.user.schoolRole as Role

        if (!(await canManageStudent({ id: session.user.id, role }, id, "students.delete"))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const db = await getSchoolDB()
        const student = await db.query.students.findFirst({ where: eq(students.id, id) })
        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }

        const [enrollments, decisions] = await Promise.all([
            db.query.studentEnrollments.findMany({ where: eq(studentEnrollments.studentId, id) }),
            db.query.promotionDecisions.findMany({ where: eq(promotionDecisions.studentId, id) }),
        ])
        const enrollmentIds = enrollments.map((enrollment) => enrollment.id)
        const [resultCerts, schoolCerts] = enrollmentIds.length ? await Promise.all([
            db.query.resultCertificates.findMany({ where: inArray(resultCertificates.enrollmentId, enrollmentIds) }),
            db.query.schoolCertificates.findMany({ where: inArray(schoolCertificates.enrollmentId, enrollmentIds) }),
        ]) : [[], []]

        const hasOfficialRecords = enrollments.length > 0 || decisions.length > 0 ||
            resultCerts.length > 0 || schoolCerts.length > 0

        if (hasOfficialRecords) {
            const [archived] = await db.update(students).set({
                status: "archived",
                updatedAt: new Date().toISOString(),
            }).where(eq(students.id, id)).returning()

            return NextResponse.json({
                success: true,
                archived: true,
                message: "Student archived to preserve academic records.",
                data: archived,
            })
        }

        // A student without academic records can be permanently removed atomically.
        const deletedStudent = await db.transaction(async (tx) => {
            await tx.delete(parentStudents).where(eq(parentStudents.studentId, id))
            await tx.delete(studentUsers).where(eq(studentUsers.studentId, id))
            const [deleted] = await tx.delete(students).where(eq(students.id, id)).returning()
            return deleted
        })

        return NextResponse.json({ success: true, archived: false, data: deletedStudent })
    } catch (error) {
        console.error("DELETE /api/students/[id] failed:", error)
        if (error instanceof ApiAuthorizationError) {
            return NextResponse.json({ error: error.message }, { status: error.status })
        }
        if (error instanceof Error && error.message === "Forbidden") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
    }
}
