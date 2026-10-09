import { and, eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import { centralDb } from "@/db/central"
import { getStudentFullName } from "@/lib/student-name"

import {
    schools,
    user,
} from "@/db/centeral-schema"

import {
    students,
    schoolClases,
    academicYears,
    studentEnrollments,
    classHeads,
} from "@/db/schema"

import { calculateResult } from "@/academic/results/calculate-result"


export async function getCertificate(
    enrollmentId: string,
    session: {
        user: {
            id: string
            name: string
            schoolId: number | string
        }
    },
) {

    if (!enrollmentId) {
        throw new Error("Enrollment ID is required")
    }


    // ============================================================
    // DATABASE
    // ============================================================

    const db = await getSchoolDB()


    // ============================================================
    // ENROLLMENT
    // ============================================================

    const enrollment =
        await db.query.studentEnrollments.findFirst({
            where: eq(
                studentEnrollments.id,
                enrollmentId,
            ),
        })


    if (!enrollment) {
        throw new Error(
            "Student enrollment not found",
        )
    }


    // ============================================================
    // STUDENT
    // ============================================================

    const student =
        await db.query.students.findFirst({
            where: eq(
                students.id,
                enrollment.studentId,
            ),
        })


    if (!student) {
        throw new Error(
            "Student not found",
        )
    }


    // ============================================================
    // CLASS
    // ============================================================

    const schoolClass =
        await db.query.schoolClases.findFirst({
            where: eq(
                schoolClases.id,
                enrollment.classId,
            ),
        })


    if (!schoolClass) {
        throw new Error(
            "Class not found",
        )
    }


    // ============================================================
    // ACADEMIC YEAR
    // ============================================================

    const academicYear =
        await db.query.academicYears.findFirst({
            where: eq(
                academicYears.id,
                enrollment.academicYearId,
            ),
        })


    if (!academicYear) {
        throw new Error(
            "Academic year not found",
        )
    }


    // ============================================================
    // RESULT
    // ============================================================

    const result =
        await calculateResult(
            db,
            enrollmentId,
        )


    // ============================================================
    // SCHOOL
    // ============================================================

    const schoolId =
        Number(session.user.schoolId)


    if (!schoolId) {
        throw new Error(
            "School ID not found in session",
        )
    }


    const school =
        await centralDb.query.schools.findFirst({
            where: eq(
                schools.id,
                schoolId,
            ),
        })


    if (!school) {
        throw new Error(
            "School not found",
        )
    }


    // ============================================================
    // PRINCIPAL
    // ============================================================

    const principal =
        await centralDb.query.user.findFirst({
            where: and(
                eq(
                    user.id,
                    session.user.id,
                ),
                eq(
                    user.name,
                    session.user.name,
                ),
            ),
        })


    // ============================================================
    // HEAD OF CLASS
    // ============================================================

    const classHead =
        await db.query.classHeads.findFirst({
            where: and(
                eq(
                    classHeads.academicYearId,
                    enrollment.academicYearId,
                ),
                eq(
                    classHeads.classId,
                    enrollment.classId,
                ),
            ),
        })


    let headOfClass:
        {
            id: string
            name: string
        } | null = null


    if (classHead) {

        const teacher =
            await centralDb.query.user.findFirst({
                where: eq(
                    user.id,
                    classHead.userId,
                ),
            })


        if (teacher) {

            headOfClass = {
                id: teacher.id,
                name: teacher.name,
            }

        }

    }


    // ============================================================
    // SUBJECTS
    // ============================================================

    const allSubjects =
        await db.query.subjects.findMany()


    const certificateSubjects =
        result.subjects.map(
            (subject) => {

                const subjectRecord =
                    allSubjects.find(
                        (item) =>
                            item.id ===
                            subject.subjectId,
                    )


                return {

                    subjectId:
                        subject.subjectId,

                    subjectName:
                        subjectRecord?.name ??
                        "Unknown",

                    examId:
                        subject.examId,

                    score:
                        subject.score,

                    maxScore:
                        subject.maxScore,

                    percentage:
                        subject.percentage,

                }

            },
        )


    // ============================================================
    // CERTIFICATE
    // ============================================================

    return {

       school: {
    id:
        school.id,

    name:
        school.name,

    logo:
        school.logo ?? null,
},


        certificate: {

            issueDate:
                new Date().toISOString(),

            academicYear: {

                id:
                    academicYear.id,

                name:
                    academicYear.name,

                startDate:
                    academicYear.startDate,

                endDate:
                    academicYear.endDate,

            },

        },


        student: {

    id:
        student.id,

    name:
        getStudentFullName({
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
        }),

},


        class: {

            id:
                schoolClass.id,

            name:
                schoolClass.name,

            gradeLevel:
                schoolClass.gradeLevel,

        },


        result: {

            status:
                result.status,

            totalScore:
                result.totalScore,

            totalMaxScore:
                result.totalMaxScore,

            percentage:
                result.percentage,

            subjects:
                certificateSubjects,

            missingGrades:
                result.missingGrades,

            issues:
                result.issues,

        },


        notes:
            null,


        signatures: {

            headOfClass: {

                id:
                    headOfClass?.id ??
                    null,

                name:
                    headOfClass?.name ??
                    null,

            },

            principal: {

                id:
                    principal?.id ??
                    null,

                name:
                    principal?.name ??
                    null,

            },

        },

    }
}