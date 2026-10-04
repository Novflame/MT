import { eq, and } from "drizzle-orm"
import type { getSchoolDB } from "@/db"

import {
    exams,
    grades,
    coreSubjects,
    studentEnrollments,
    schoolClases,
} from "@/db/schema"

export const PROMOTION_PASS_PERCENTAGE = 50

export type PromotionSystemResult =
    | "promoted"
    | "retained"
    | "incomplete"

export type PromotionIncompleteReason =
    | "missing_exam"
    | "missing_grade"

export type PromotionIncompleteIssue = {
    subjectId: string

    /**
     * null when the exam itself does not exist.
     */
    examId: string | null

    reason: PromotionIncompleteReason
}

export type PromotionCalculation = {
    studentId: string

    academicYearId: string

    enrollmentId: string

    fromClassId: string

    toClassId: string | null

    percentage: number

    systemResult: PromotionSystemResult

    systemDecision:
        | "promote"
        | "retain"
        | "complete_results"

    coreSubjectFailures: Array<{
        subjectId: string
        score: number
        maxScore: number
        percentage: number
    }>

    /**
     * Subjects that have a final exam,
     * but this student has no grade for it.
     */
    missingFinalSubjects: string[]

    /**
     * Core subjects that do not have a final exam.
     */
    missingFinalExams: string[]

    /**
     * Exact reasons why the result is incomplete.
     */
    incompleteIssues: PromotionIncompleteIssue[]
}

/**
 * Calculate the student's final promotion result.
 *
 * Rules:
 *
 * 1. Every core subject must have a final exam.
 * 2. Every final exam must have a grade for the student.
 * 3. Missing exams and missing grades make the result incomplete.
 * 4. The overall percentage is calculated from completed final exams.
 * 5. Core subjects must individually reach the pass percentage.
 * 6. This function only calculates the system result.
 * 7. It does not perform an administrative override.
 * 8. It does not create the next-year enrollment.
 */
export async function calculatePromotion(
    db: Awaited<ReturnType<typeof getSchoolDB>>,
    enrollmentId: string,
): Promise<PromotionCalculation> {

    // =========================================================
    // 1. Student enrollment
    // =========================================================

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

    // =========================================================
    // 2. Final exams for this class and academic year
    // =========================================================

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
                    "final",
                ),
            ),
        })

    // =========================================================
    // 3. Core subjects
    // =========================================================

    const coreRows =
        await db.query.coreSubjects.findMany({
            where: and(
                eq(
                    coreSubjects.academicYearId,
                    enrollment.academicYearId,
                ),
                eq(
                    coreSubjects.classId,
                    enrollment.classId,
                ),
            ),
        })

    const coreSubjectIds =
        coreRows.map(
            (row) => row.subjectId,
        )

    // =========================================================
    // 4. Student grades
    // =========================================================

    const finalGrades =
        await db.query.grades.findMany({
            where: eq(
                grades.studentEnrollmentId,
                enrollmentId,
            ),
        })

    // =========================================================
    // 5. Find missing final exams
    //
    // Example:
    //
    // Core subjects:
    // Arabic
    // Math
    // English
    //
    // Exams:
    // Arabic
    // Math
    //
    // Result:
    // English -> missing_exam
    // =========================================================

    const missingFinalExams: string[] = []

    const incompleteIssues: PromotionIncompleteIssue[] = []

    for (const subjectId of coreSubjectIds) {

        const exam =
            finalExams.find(
                (item) =>
                    item.subjectId === subjectId,
            )

        if (!exam) {

            missingFinalExams.push(
                subjectId,
            )

            incompleteIssues.push({
                subjectId,
                examId: null,
                reason: "missing_exam",
            })
        }
    }

    // =========================================================
    // 6. Find missing grades
    //
    // The exam exists,
    // but this particular student has no grade.
    //
    // Example:
    //
    // Math Final Exam exists.
    // Ahmed has no grade for Math.
    //
    // Result:
    // Math -> missing_grade
    // =========================================================

    const missingFinalSubjects: string[] = []

    for (const exam of finalExams) {

        const gradeExists =
            finalGrades.some(
                (grade) =>
                    grade.examId === exam.id,
            )

        if (!gradeExists) {

            if (
                !missingFinalSubjects.includes(
                    exam.subjectId,
                )
            ) {
                missingFinalSubjects.push(
                    exam.subjectId,
                )
            }

            incompleteIssues.push({
                subjectId:
                    exam.subjectId,

                examId:
                    exam.id,

                reason:
                    "missing_grade",
            })
        }
    }

    // =========================================================
    // 7. Calculate completed final subjects
    // =========================================================

    const subjectResults: Array<{
        subjectId: string
        score: number
        maxScore: number
        percentage: number
        examId: string
    }> = []

    for (const exam of finalExams) {

        const grade =
            finalGrades.find(
                (item) =>
                    item.examId === exam.id,
            )

        /**
         * No grade:
         *
         * This exam will not participate
         * in the current percentage.
         *
         * The student is incomplete until
         * the result is entered.
         */
        if (!grade) {
            continue
        }

        const percentage =
            exam.maxScore > 0
                ? (
                    grade.score /
                    exam.maxScore
                ) * 100
                : 0

        subjectResults.push({
            subjectId:
                exam.subjectId,

            score:
                grade.score,

            maxScore:
                exam.maxScore,

            percentage:
                Number(
                    percentage.toFixed(2),
                ),

            examId:
                exam.id,
        })
    }

    // =========================================================
    // 8. Core subject failures
    // =========================================================

    const coreSubjectFailures =
        subjectResults.filter(
            (result) =>
                coreSubjectIds.includes(
                    result.subjectId,
                )
                &&
                result.percentage <
                    PROMOTION_PASS_PERCENTAGE,
        )

    // =========================================================
    // 9. Overall percentage
    //
    // Only completed final exams participate.
    // =========================================================

    let earned = 0

    let possible = 0

    for (const result of subjectResults) {

        earned += result.score

        possible += result.maxScore
    }

    const percentage =
        possible > 0
            ? Number(
                (
                    (
                        earned /
                        possible
                    ) *
                    100
                ).toFixed(2),
            )
            : 0

    // =========================================================
    // 10. Incomplete
    // =========================================================

    if (
        incompleteIssues.length > 0
    ) {

        return {
            studentId:
                enrollment.studentId,

            academicYearId:
                enrollment.academicYearId,

            enrollmentId,

            fromClassId:
                enrollment.classId,

            toClassId:
                null,

            percentage,

            systemResult:
                "incomplete",

            systemDecision:
                "complete_results",

            coreSubjectFailures,

            missingFinalSubjects,

            missingFinalExams,

            incompleteIssues,
        }
    }

    // =========================================================
    // 11. Retained
    // =========================================================

    if (
        percentage <
            PROMOTION_PASS_PERCENTAGE
        ||
        coreSubjectFailures.length > 0
    ) {

        return {
            studentId:
                enrollment.studentId,

            academicYearId:
                enrollment.academicYearId,

            enrollmentId,

            fromClassId:
                enrollment.classId,

            toClassId:
                null,

            percentage,

            systemResult:
                "retained",

            systemDecision:
                "retain",

            coreSubjectFailures,

            missingFinalSubjects,

            missingFinalExams,

            incompleteIssues,
        }
    }

    // =========================================================
    // 12. Current class
    // =========================================================

    const currentClass =
        await db.query.schoolClases.findFirst({
            where: eq(
                schoolClases.id,
                enrollment.classId,
            ),
        })

    let nextClassId:
        string | null = null

    // =========================================================
    // 13. Find next class
    // =========================================================

    if (currentClass) {

        const nextClasses =
            await db.query.schoolClases.findMany({
                where: eq(
                    schoolClases.gradeLevel,
                    currentClass.gradeLevel + 1,
                ),
            })

        /**
         * Automatically select the next class
         * only when exactly one class exists
         * at the next grade level.
         */

        if (nextClasses.length === 1) {

            nextClassId =
                nextClasses[0].id
        }
    }

    // =========================================================
    // 14. Promoted
    // =========================================================

    return {
        studentId:
            enrollment.studentId,

        academicYearId:
            enrollment.academicYearId,

        enrollmentId,

        fromClassId:
            enrollment.classId,

        toClassId:
            nextClassId,

        percentage,

        systemResult:
            "promoted",

        systemDecision:
            "promote",

        coreSubjectFailures: [],

        missingFinalSubjects: [],

        missingFinalExams: [],

        incompleteIssues: [],
    }
}