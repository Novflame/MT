import { and, eq } from "drizzle-orm"

import type { getSchoolDB } from "@/db"

import {
    exams,
    grades,
    studentEnrollments,
} from "@/db/schema"


// ============================================================
// Types
// ============================================================

export type ResultStatus =
    | "complete"
    | "incomplete"


export type ResultIncompleteReason =
    | "missing_grade"


export type ResultIssue = {
    subjectId: string
    examId: string
    reason: ResultIncompleteReason
}


export type SubjectResult = {
    subjectId: string
    examId: string

    score: number
    maxScore: number

    percentage: number
}


export type StudentResult = {
    studentId: string
    enrollmentId: string

    academicYearId: string
    classId: string

    status: ResultStatus

    totalScore: number
    totalMaxScore: number

    percentage: number

    subjects: SubjectResult[]

    missingGrades: string[]

    issues: ResultIssue[]
}


// ============================================================
// Calculate Final Result
// ============================================================

/**
 * Calculates the academic result for one student enrollment.
 *
 * Result Engine responsibilities:
 *
 * - Uses FINAL exams only.
 * - Includes every final exam for the student's class/year.
 * - Uses exam.maxScore.
 * - Calculates each subject result.
 * - Calculates the overall result.
 * - Detects missing grades.
 *
 * This engine does NOT:
 *
 * - use coreSubjects
 * - decide promotion
 * - decide retention
 * - create next-year enrollment
 * - check payment
 * - generate PDFs
 * - close the academic year
 */
export async function calculateResult(
    db: Awaited<ReturnType<typeof getSchoolDB>>,
    enrollmentId: string,
): Promise<StudentResult> {

    // ========================================================
    // 1. Get enrollment
    // ========================================================

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


    // ========================================================
    // 2. Get final exams
    // ========================================================

    const finalExams =
        await db.query.exams.findMany({
            where: and(
                eq(
                    exams.academicYearId,
                    enrollment.academicYearId,
                ),

                eq(
                    exams.classId,
                    enrollment.classId,
                ),

                eq(
                    exams.type,
                    "FINAL",
                ),
            ),
        })


    // ========================================================
    // 3. Get student's grades
    // ========================================================

    const finalGrades =
        await db.query.grades.findMany({
            where: eq(
                grades.studentEnrollmentId,
                enrollmentId,
            ),
        })


    // ========================================================
    // 4. Result containers
    // ========================================================

    const subjects: SubjectResult[] = []

    const missingGrades: string[] = []

    const issues: ResultIssue[] = []


    // ========================================================
    // 5. Process every final exam
    // ========================================================

    for (const exam of finalExams) {

        const grade =
            finalGrades.find(
                (item) =>
                    item.examId === exam.id,
            )


        // ----------------------------------------------------
        // Final exam exists but student's grade is missing
        // ----------------------------------------------------

        if (!grade) {

            missingGrades.push(
                exam.subjectId,
            )

            issues.push({
                subjectId:
                    exam.subjectId,

                examId:
                    exam.id,

                reason:
                    "missing_grade",
            })

            continue
        }


        // ----------------------------------------------------
        // Calculate subject percentage
        // ----------------------------------------------------

        const percentage =
            exam.maxScore > 0
                ? Number(
                    (
                        (
                            grade.score /
                            exam.maxScore
                        ) * 100
                    ).toFixed(2),
                )
                : 0


        // ----------------------------------------------------
        // Add subject result
        // ----------------------------------------------------

        subjects.push({
            subjectId:
                exam.subjectId,

            examId:
                exam.id,

            score:
                grade.score,

            maxScore:
                exam.maxScore,

            percentage,
        })
    }


    // ========================================================
    // 6. Calculate total
    // ========================================================

    let totalScore = 0

    let totalMaxScore = 0


    for (const subject of subjects) {

        totalScore +=
            subject.score

        totalMaxScore +=
            subject.maxScore
    }


    // ========================================================
    // 7. Calculate overall percentage
    // ========================================================

    const percentage =
        totalMaxScore > 0
            ? Number(
                (
                    (
                        totalScore /
                        totalMaxScore
                    ) * 100
                ).toFixed(2),
            )
            : 0


    // ========================================================
    // 8. Determine result status
    // ========================================================

    const status: ResultStatus =
        issues.length > 0
            ? "incomplete"
            : "complete"


    // ========================================================
    // 9. Return result
    // ========================================================

    return {

        studentId:
            enrollment.studentId,

        enrollmentId,

        academicYearId:
            enrollment.academicYearId,

        classId:
            enrollment.classId,

        status,

        totalScore,

        totalMaxScore,

        percentage,

        subjects,

        missingGrades,

        issues,
    }
}

