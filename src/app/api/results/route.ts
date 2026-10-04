import { NextResponse } from "next/server"
import { and, eq, isNotNull } from "drizzle-orm"

import { getSchoolDB } from "@/db"

import {
    exams,
    grades,
    coreSubjects,
    studentEnrollments,
    subjects,
    studentUsers,
    parents,
    parentStudents,
} from "@/db/schema"

import { requirePermission } from "@/auth/session"


// ============================================================
// Letter grade
// ============================================================

function letterGrade(
    percentage: number,
) {
    if (percentage >= 90) return "A+"
    if (percentage >= 80) return "A"
    if (percentage >= 70) return "B"
    if (percentage >= 60) return "C"
    if (percentage >= 50) return "D"

    return "F"
}


// ============================================================
// GET
// ============================================================

export async function GET(
    request: Request,
) {
    try {

        // --------------------------------------------------------
        // Authentication / authorization
        // --------------------------------------------------------

        const session =
            await requirePermission(
                "results.read",
            )


        const db =
            await getSchoolDB()


        // --------------------------------------------------------
        // Query parameters
        // --------------------------------------------------------

        const url =
            new URL(request.url)

        const studentId =
            url.searchParams.get(
                "studentId",
            )

        const classId =
            url.searchParams.get(
                "classId",
            )

        const academicYearId =
            url.searchParams.get(
                "academicYearId",
            )


        // ========================================================
        // Determine allowed students
        // ========================================================

        let allowedStudentIds:
            string[] | null = null


        // --------------------------------------------------------
        // Student
        // --------------------------------------------------------

        if (
            session.user.schoolRole ===
            "student"
        ) {

            const link =
                await db.query.studentUsers.findFirst({
                    where: eq(
                        studentUsers.userId,
                        session.user.id,
                    ),
                })


            allowedStudentIds =
                link
                    ? [link.studentId]
                    : []
        }


        // --------------------------------------------------------
        // Parent
        // --------------------------------------------------------

        else if (
            session.user.schoolRole ===
            "parent"
        ) {

            const parent =
                await db.query.parents.findFirst({
                    where: eq(
                        parents.userId,
                        session.user.id,
                    ),
                })


            if (!parent) {

                allowedStudentIds = []

            } else {

                const links =
                    await db.query.parentStudents.findMany({
                        where: eq(
                            parentStudents.parentId,
                            parent.id,
                        ),
                    })


                allowedStudentIds =
                    links.map(
                        (link) =>
                            link.studentId,
                    )
            }
        }


        // ========================================================
        // Load required data
        // ========================================================

        const [
            enrollments,
            allSubjects,
            allCoreSubjects,
            allFinalExams,
            allFinalGrades,
        ] = await Promise.all([

            // ----------------------------------------------------
            // Enrollments
            // ----------------------------------------------------

            db.query.studentEnrollments.findMany({
                with: {
                    student: true,
                    class: true,
                },
            }),


            // ----------------------------------------------------
            // Subjects
            // ----------------------------------------------------

            db.query.subjects.findMany(),


            // ----------------------------------------------------
            // Core subjects
            // ----------------------------------------------------

            db.query.coreSubjects.findMany(),


            // ----------------------------------------------------
            // Final exams ONLY
            // ----------------------------------------------------

            db.query.exams.findMany({
                where: eq(
                    exams.type,
                    "final",
                ),
            }),


            // ----------------------------------------------------
            // Grades belonging to exams
            // ----------------------------------------------------

            db.query.grades.findMany({
                where: isNotNull(
                    grades.examId,
                ),
            }),
        ])


        // ========================================================
        // Filter enrollments
        // ========================================================

        const filteredEnrollments =
            enrollments.filter(
                (enrollment) => {

                    if (
                        studentId &&
                        enrollment.studentId !==
                            studentId
                    ) {
                        return false
                    }


                    if (
                        classId &&
                        enrollment.classId !==
                            classId
                    ) {
                        return false
                    }


                    if (
                        academicYearId &&
                        enrollment.academicYearId !==
                            academicYearId
                    ) {
                        return false
                    }


                    if (
                        allowedStudentIds &&
                        !allowedStudentIds.includes(
                            enrollment.studentId,
                        )
                    ) {
                        return false
                    }


                    return true
                },
            )


        // ========================================================
        // Build results
        // ========================================================

        const results =
            filteredEnrollments.map(
                (enrollment) => {

                    // =================================================
                    // Core subjects for this student/year/class
                    // =================================================

                    const requiredCoreSubjects =
                        allCoreSubjects.filter(
                            (coreSubject) =>
                                coreSubject.academicYearId ===
                                    enrollment.academicYearId
                                &&
                                coreSubject.classId ===
                                    enrollment.classId,
                        )


                    // =================================================
                    // Final exams for this year/class
                    // =================================================

                    const finalExams =
                        allFinalExams.filter(
                            (exam) =>
                                exam.academicYearId ===
                                    enrollment.academicYearId
                                &&
                                exam.classId ===
                                    enrollment.classId,
                        )


                    // =================================================
                    // Grades for this enrollment
                    // =================================================

                    const studentGrades =
                        allFinalGrades.filter(
                            (grade) =>
                                grade.studentEnrollmentId ===
                                enrollment.id,
                        )


                    // =================================================
                    // Result containers
                    // =================================================

                    const subjectsResult:
                        Array<{
                            subjectId: string
                            subjectName: string

                            examId: string
                            examName: string

                            score: number | null
                            maxScore: number

                            percentage: number | null
                            grade: string | null

                            status:
                                | "completed"
                                | "missing_grade"
                        }> = []


                    const missingFinalExams:
                        Array<{
                            subjectId: string
                            subjectName: string
                        }> = []


                    const missingFinalGrades:
                        Array<{
                            subjectId: string
                            subjectName: string

                            examId: string
                            examName: string
                        }> = []


                    // =================================================
                    // Process every required core subject
                    // =================================================

                    for (
                        const coreSubject
                        of requiredCoreSubjects
                    ) {

                        // ------------------------------------------------
                        // Subject
                        // ------------------------------------------------

                        const subject =
                            allSubjects.find(
                                (item) =>
                                    item.id ===
                                    coreSubject.subjectId,
                            )


                        const subjectName =
                            subject?.name ??
                            "Unknown"


                        // ------------------------------------------------
                        // Find final exam
                        // ------------------------------------------------

                        const exam =
                            finalExams.find(
                                (item) =>
                                    item.subjectId ===
                                    coreSubject.subjectId,
                            )


                        // ------------------------------------------------
                        // Final exam does not exist
                        // ------------------------------------------------

                        if (!exam) {

                            missingFinalExams.push({

                                subjectId:
                                    coreSubject.subjectId,

                                subjectName,
                            })


                            continue
                        }


                        // ------------------------------------------------
                        // Find student's grade
                        // ------------------------------------------------

                        const grade =
                            studentGrades.find(
                                (item) =>
                                    item.examId ===
                                    exam.id,
                            )


                        // ------------------------------------------------
                        // Grade does not exist
                        // ------------------------------------------------

                        if (!grade) {

                            missingFinalGrades.push({

                                subjectId:
                                    coreSubject.subjectId,

                                subjectName,

                                examId:
                                    exam.id,

                                examName:
                                    exam.name,
                            })


                            subjectsResult.push({

                                subjectId:
                                    coreSubject.subjectId,

                                subjectName,

                                examId:
                                    exam.id,

                                examName:
                                    exam.name,

                                score:
                                    null,

                                maxScore:
                                    exam.maxScore,

                                percentage:
                                    null,

                                grade:
                                    null,

                                status:
                                    "missing_grade",
                            })


                            continue
                        }


                        // ------------------------------------------------
                        // Completed subject
                        // ------------------------------------------------

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


                        subjectsResult.push({

                            subjectId:
                                coreSubject.subjectId,

                            subjectName,

                            examId:
                                exam.id,

                            examName:
                                exam.name,

                            score:
                                grade.score,

                            maxScore:
                                exam.maxScore,

                            percentage,

                            grade:
                                letterGrade(
                                    percentage,
                                ),

                            status:
                                "completed",
                        })
                    }


                    // =================================================
                    // Calculate total
                    // =================================================

                    let earned = 0
                    let possible = 0


                    for (
                        const subject
                        of subjectsResult
                    ) {

                        if (
                            subject.score ===
                            null
                        ) {
                            continue
                        }


                        earned +=
                            subject.score


                        possible +=
                            subject.maxScore
                    }


                    const percentage =
                        possible > 0
                            ? Number(
                                (
                                    (
                                        earned /
                                        possible
                                    ) * 100
                                ).toFixed(2),
                            )
                            : 0


                    // =================================================
                    // Result status
                    // =================================================

                    const isComplete =
                        missingFinalExams.length === 0
                        &&
                        missingFinalGrades.length === 0


                    // =================================================
                    // Return student result
                    // =================================================

                    return {

                        student:
                            enrollment.student,

                        class:
                            enrollment.class,

                        academicYearId:
                            enrollment.academicYearId,

                        enrollmentId:
                            enrollment.id,

                        status:
                            isComplete
                                ? "complete"
                                : "incomplete",

                        earned,

                        possible,

                        percentage,

                        grade:
                            isComplete
                                ? letterGrade(
                                    percentage,
                                )
                                : null,

                        totalRequiredSubjects:
                            requiredCoreSubjects.length,

                        completedSubjects:
                            subjectsResult.filter(
                                (subject) =>
                                    subject.status ===
                                    "completed",
                            ).length,

                        missingFinalExams,

                        missingFinalGrades,

                        subjects:
                            subjectsResult,
                    }
                },
            )


        return NextResponse.json(
            results,
        )

    } catch (error) {

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get results",
            },
            {
                status: 500,
            },
        )
    }
}