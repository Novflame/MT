import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"

import {
    promotionDecisions,
    studentEnrollments,
    students,
    schoolClases,
    academicYears,
    exams,
    teacherAssignments,
    
} from "@/db/schema"

import { calculatePromotion } from "@/lib/promotion"
import { getStudentFullName } from "@/lib/student-name"
import { requireSession } from "@/auth/session"

type AdminRole =
    | "principal"
    | "deputy"

type FinalDecision =
    | "promote"
    | "retain"
    | "graduate"

type FinalResultIssueReason =
    | "missing_exam"
    | "missing_grade"

type FinalResultIssue = {
    studentId: string
    studentName: string
    enrollmentId: string
    classId: string
    className: string
    subjectId: string
    subjectName: string
    examId: string | null
    reason: FinalResultIssueReason
    message: string
}

function isPromotionAdmin(
    role: string,
): role is AdminRole {
    return (
        role === "principal" ||
        role === "deputy"
    )
}

/*
|--------------------------------------------------------------------------
| Academic year helpers
|--------------------------------------------------------------------------
*/

function getNextAcademicYear(
    name: string,
) {
    const match =
        name
            .trim()
            .match(
                /^(\d{4})\s*\/\s*(\d{4})$/,
            )

    if (!match) {
        throw new Error(
            `Academic year "${name}" must use the YYYY/YYYY format.`,
        )
    }

    const startYear =
        Number(match[1])

    const endYear =
        Number(match[2])

    if (
        endYear !==
        startYear + 1
    ) {
        throw new Error(
            `Academic year "${name}" is invalid. The second year must be exactly one year after the first.`,
        )
    }

    return {
        name:
            `${startYear + 1}/${endYear + 1}`,

        startDate:
            `${startYear + 1}-01-01`,

        endDate:
            `${endYear + 1}-12-31`,
    }
}

/*
|--------------------------------------------------------------------------
| Final results validation
|--------------------------------------------------------------------------
|
| This function ONLY checks whether the final results are complete.
|
| It does NOT:
|
| - calculate promotion
| - create promotion decisions
| - modify the database
| - create a new academic year
|
|--------------------------------------------------------------------------
*/

async function checkFinalResults(
    db: Awaited<ReturnType<typeof getSchoolDB>>,
    academicYearId: string,
): Promise<{
    complete: boolean
    issues: FinalResultIssue[]
}> {
    // ============================================================
    // Active academic-year enrollments
    // ============================================================

    const enrollments =
        await db.query.studentEnrollments.findMany(
            {
                where: eq(
                    studentEnrollments.academicYearId,
                    academicYearId,
                ),

                with: {
                    student: true,
                    class: true,
                },
            },
        )

    // ============================================================
    // Subjects actually assigned to classes
    //
    // IMPORTANT:
    // We do NOT use coreSubjects here.
    //
    // coreSubjects is used by the promotion calculation to
    // determine core-subject failures.
    //
    // teacherAssignments tells us which subjects are actually
    // taught/assigned to each class in this academic year.
    // ============================================================

    const assignments =
        await db.query.teacherAssignments.findMany(
            {
                where: eq(
                    teacherAssignments.academicYearId,
                    academicYearId,
                ),

                with: {
                    subject: true,
                },
            },
        )

    // ============================================================
    // Final exams for this academic year
    // ============================================================

    const finalExams =
        await db.query.exams.findMany(
            {
                where: and(
                    eq(
                        exams.academicYearId,
                        academicYearId,
                    ),
                    eq(
                        exams.type,
                        "final",
                    ),
                ),

                with: {
                    subject: true,
                    class: true,
                },
            },
        )

    // ============================================================
    // All grades
    // ============================================================

    const allGrades =
        await db.query.grades.findMany()

    const issues: FinalResultIssue[] = []

    // ============================================================
    // HARD BLOCK:
    //
    // There is not a single FINAL exam in this academic year.
    //
    // Promotion must NEVER be considered complete in this case.
    // ============================================================

    if (finalExams.length === 0) {
        for (const enrollment of enrollments) {
            const studentName =
                getStudentFullName(
                    enrollment.student,
                )

            const className =
                enrollment.class.name

            issues.push({
                studentId:
                    enrollment.studentId,

                studentName,

                enrollmentId:
                    enrollment.id,

                classId:
                    enrollment.classId,

                className,

                // No specific subject exists because no final
                // exam exists anywhere in the academic year.
                subjectId:
                    "",

                subjectName:
                    "All subjects",

                examId:
                    null,

                reason:
                    "missing_exam",

                message:
                    `Student = ${studentName}, Class = ${className}, Subject = All subjects: final exam was not created.`,
            })
        }

        return {
            complete: false,
            issues,
        }
    }

    // ============================================================
    // Build unique required subjects per class.
    //
    // A class may have multiple teachers assigned to the same
    // subject, so we must deduplicate by classId + subjectId.
    // ============================================================

    const requiredSubjectsByClass =
        new Map<
            string,
            Map<
                string,
                {
                    subjectId: string
                    subjectName: string
                }
            >
        >()

    for (const assignment of assignments) {
        if (!assignment.classId) {
            continue
        }

        if (!assignment.subjectId) {
            continue
        }

        let classSubjects =
            requiredSubjectsByClass.get(
                assignment.classId,
            )

        if (!classSubjects) {
            classSubjects =
                new Map()

            requiredSubjectsByClass.set(
                assignment.classId,
                classSubjects,
            )
        }

        if (
            !classSubjects.has(
                assignment.subjectId,
            )
        ) {
            classSubjects.set(
                assignment.subjectId,
                {
                    subjectId:
                        assignment.subjectId,

                    subjectName:
                        assignment.subject?.name ??
                        "Unknown subject",
                },
            )
        }
    }

    // ============================================================
    // Validate every enrolled student
    // ============================================================

    for (const enrollment of enrollments) {
        const studentName =
            getStudentFullName(
                enrollment.student,
            )

        const className =
            enrollment.class.name

        // --------------------------------------------------------
        // Subjects assigned to this student's class
        // --------------------------------------------------------

        const requiredSubjects =
            Array.from(
                requiredSubjectsByClass
                    .get(enrollment.classId)
                    ?.values() ?? [],
            )

        // --------------------------------------------------------
        // Final exams belonging to this student's class
        // --------------------------------------------------------

        const studentClassFinalExams =
            finalExams.filter(
                (exam) =>
                    exam.classId ===
                    enrollment.classId,
            )

        // --------------------------------------------------------
        // If this class has no teacher-assigned subjects and
        // also has no final exams, block it.
        //
        // This protects us from considering an empty class
        // complete simply because there is no subject metadata.
        // --------------------------------------------------------

        if (
            requiredSubjects.length === 0 &&
            studentClassFinalExams.length === 0
        ) {
            issues.push({
                studentId:
                    enrollment.studentId,

                studentName,

                enrollmentId:
                    enrollment.id,

                classId:
                    enrollment.classId,

                className,

                subjectId:
                    "",

                subjectName:
                    "All subjects",

                examId:
                    null,

                reason:
                    "missing_exam",

                message:
                    `Student = ${studentName}, Class = ${className}, Subject = All subjects: final exam was not created.`,
            })

            continue
        }

        // ========================================================
        // Every assigned subject must have a FINAL exam
        // ========================================================

        for (
            const requiredSubject
            of requiredSubjects
        ) {
            const exam =
                studentClassFinalExams.find(
                    (item) =>
                        item.subjectId ===
                        requiredSubject.subjectId,
                )

            if (exam) {
                continue
            }

            issues.push({
                studentId:
                    enrollment.studentId,

                studentName,

                enrollmentId:
                    enrollment.id,

                classId:
                    enrollment.classId,

                className,

                subjectId:
                    requiredSubject.subjectId,

                subjectName:
                    requiredSubject.subjectName,

                examId:
                    null,

                reason:
                    "missing_exam",

                message:
                    `Student = ${studentName}, Class = ${className}, Subject = ${requiredSubject.subjectName}: final exam was not created.`,
            })
        }

        // ========================================================
        // Every existing FINAL exam for this class must have a
        // result/grade for this student.
        // ========================================================

        for (
            const exam
            of studentClassFinalExams
        ) {
            const gradeExists =
                allGrades.some(
                    (grade) =>
                        grade.studentEnrollmentId ===
                            enrollment.id &&
                        grade.examId ===
                            exam.id,
                )

            if (gradeExists) {
                continue
            }

            const subjectName =
                exam.subject?.name ??
                "Unknown subject"

            issues.push({
                studentId:
                    enrollment.studentId,

                studentName,

                enrollmentId:
                    enrollment.id,

                classId:
                    enrollment.classId,

                className,

                subjectId:
                    exam.subjectId,

                subjectName,

                examId:
                    exam.id,

                reason:
                    "missing_grade",

                message:
                    `Student = ${studentName}, Class = ${className}, Subject = ${subjectName}: final result was not submitted.`,
            })
        }
    }

    // ============================================================
    // Final result
    // ============================================================

    return {
        complete:
            issues.length === 0,

        issues,
    }
}


/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| GET /api/promotion?academicYearId=...
|
| GET first checks final results.
|
| If final results are incomplete:
|
|   - no promotion calculation
|   - no promotion decision calculation
|
| If final results are complete:
|
|   - promotion calculations are returned
|   - existing administrative decisions are returned
|
|--------------------------------------------------------------------------
*/

export async function GET(
    request: Request,
) {
    try {
        const session =
            await requireSession()

        if (
            !isPromotionAdmin(
                session.user.schoolRole,
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "Forbidden",
                },
                {
                    status: 403,
                },
            )
        }

        const db =
            await getSchoolDB()

        const url =
            new URL(request.url)

        const academicYearId =
            url.searchParams.get(
                "academicYearId",
            )

        if (!academicYearId) {
            return NextResponse.json(
                {
                    error:
                        "academicYearId is required",
                },
                {
                    status: 400,
                },
            )
        }

        const academicYear =
            await db.query.academicYears.findFirst(
                {
                    where: eq(
                        academicYears.id,
                        academicYearId,
                    ),
                },
            )

        if (!academicYear) {
            return NextResponse.json(
                {
                    error:
                        "Academic year not found",
                },
                {
                    status: 404,
                },
            )
        }

        /*
        |--------------------------------------------------------------------------
        | FINAL RESULTS CHECK
        |--------------------------------------------------------------------------
        */

        const finalResults =
            await checkFinalResults(
                db,
                academicYearId,
            )

        /*
        |--------------------------------------------------------------------------
        | STOP BEFORE PROMOTION
        |--------------------------------------------------------------------------
        */

        if (
            !finalResults.complete
        ) {
            return NextResponse.json(
                {
                    success: false,

                    status:
                        "final_results_incomplete",

                    academicYearId,

                    issues:
                        finalResults.issues,

                    issueCount:
                        finalResults.issues.length,

                    message:
                        "Final results are incomplete. Promotion review cannot begin.",
                },
                {
                    status: 409,
                },
            )
        }

        /*
        |--------------------------------------------------------------------------
        | Final results are complete.
        |
        | Promotion calculation is now allowed.
        |--------------------------------------------------------------------------
        */

        const enrollments =
            await db.query.studentEnrollments.findMany(
                {
                    where: eq(
                        studentEnrollments.academicYearId,
                        academicYearId,
                    ),

                    with: {
                        student: true,
                        class: true,
                        academicYear: true,
                    },
                },
            )

        const results = []

        for (
            const enrollment
            of enrollments
        ) {
            const calculation =
                await calculatePromotion(
                    db,
                    enrollment.id,
                )

            const decision =
                await db.query.promotionDecisions.findFirst(
                    {
                        where: (
                            promotionDecision,
                            { and, eq },
                        ) =>
                            and(
                                eq(
                                    promotionDecision.studentId,
                                    enrollment.studentId,
                                ),

                                eq(
                                    promotionDecision.academicYearId,
                                    academicYearId,
                                ),
                            ),
                    },
                )

            results.push({
                student:
                    enrollment.student,

                academicYear:
                    enrollment.academicYear,

                currentClass:
                    enrollment.class,

                calculation,

                decision:
                    decision ?? null,
            })
        }

        return NextResponse.json({
            success: true,

            status:
                "final_results_complete",

            academicYearId,

            results,
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to check final results",
            },
            {
                status: 500,
            },
        )
    }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| action:
|
| review
|   Check final results first, then persist system
|   promotion calculations.
|
| close
|   Check final results, validate final decisions,
|   then perform the complete rollover.
|
|--------------------------------------------------------------------------
*/

export async function POST(
    request: Request,
) {
    try {
        const session =
            await requireSession()

        if (
            !isPromotionAdmin(
                session.user.schoolRole,
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "Forbidden",
                },
                {
                    status: 403,
                },
            )
        }

        const body =
            await request.json()

        const academicYearId =
            String(
                body.academicYearId ??
                    "",
            ).trim()

        const action =
            String(
                body.action ??
                    "review",
            ).trim()

        if (!academicYearId) {
            return NextResponse.json(
                {
                    error:
                        "academicYearId is required",
                },
                {
                    status: 400,
                },
            )
        }

        if (
            action !== "review" &&
            action !== "close"
        ) {
            return NextResponse.json(
                {
                    error:
                        "action must be review or close",
                },
                {
                    status: 400,
                },
            )
        }

        const db =
            await getSchoolDB()

        /*
        |--------------------------------------------------------------------------
        | Requested academic year
        |--------------------------------------------------------------------------
        */

        const academicYear =
            await db.query.academicYears.findFirst(
                {
                    where: eq(
                        academicYears.id,
                        academicYearId,
                    ),
                },
            )

        if (!academicYear) {
            return NextResponse.json(
                {
                    error:
                        "Academic year not found",
                },
                {
                    status: 404,
                },
            )
        }

        /*
        |--------------------------------------------------------------------------
        | Only the active academic year can be reviewed/closed.
        |--------------------------------------------------------------------------
        */

        if (!academicYear.isActive) {
            return NextResponse.json(
                {
                    error:
                        "This academic year is already closed.",
                },
                {
                    status: 409,
                },
            )
        }

        /*
        |--------------------------------------------------------------------------
        | FINAL RESULTS CHECK
        |--------------------------------------------------------------------------
        |
        | This happens before BOTH review and close.
        |--------------------------------------------------------------------------
        */

        const finalResults =
            await checkFinalResults(
                db,
                academicYearId,
            )

        if (
            !finalResults.complete
        ) {
            return NextResponse.json(
                {
                    success: false,

                    status:
                        "final_results_incomplete",

                    academicYearId,

                    issues:
                        finalResults.issues,

                    issueCount:
                        finalResults.issues.length,

                    message:
                        "Final results are incomplete. The requested promotion operation cannot continue.",
                },
                {
                    status: 409,
                },
            )
        }

        /*
        |--------------------------------------------------------------------------
        | REVIEW PROMOTION
        |--------------------------------------------------------------------------
        */

        if (action === "review") {
            const enrollments =
                await db.query.studentEnrollments.findMany(
                    {
                        where: eq(
                            studentEnrollments.academicYearId,
                            academicYearId,
                        ),
                    },
                )

            let processed = 0

            for (
                const enrollment
                of enrollments
            ) {
                const calculation =
                    await calculatePromotion(
                        db,
                        enrollment.id,
                    )

                const existing =
                    await db.query.promotionDecisions.findFirst(
                        {
                            where: (
                                decision,
                                { and, eq },
                            ) =>
                                and(
                                    eq(
                                        decision.studentId,
                                        enrollment.studentId,
                                    ),

                                    eq(
                                        decision.academicYearId,
                                        academicYearId,
                                    ),
                                ),
                        },
                    )

                /*
                |--------------------------------------------------------------------------
                | Never overwrite an administrative decision.
                |--------------------------------------------------------------------------
                */

                if (
                    existing &&
                    existing.decidedByUserId
                ) {
                    continue
                }

                if (existing) {
                    await db
                        .update(
                            promotionDecisions,
                        )
                        .set({
                            fromClassId:
                                calculation.fromClassId,

                            toClassId:
                                calculation.toClassId,

                            systemResult:
                                calculation.systemResult,

                            systemDecision:
                                calculation.systemDecision,

                            finalDecision:
                                calculation.systemDecision,

                            decidedByUserId:
                                null,

                            reason:
                                null,
                        })
                        .where(
                            eq(
                                promotionDecisions.id,
                                existing.id,
                            ),
                        )
                } else {
                    await db
                        .insert(
                            promotionDecisions,
                        )
                        .values({
                            id:
                                crypto.randomUUID(),

                            studentId:
                                enrollment.studentId,

                            academicYearId,

                            fromClassId:
                                calculation.fromClassId,

                            toClassId:
                                calculation.toClassId,

                            systemResult:
                                calculation.systemResult,

                            systemDecision:
                                calculation.systemDecision,

                            finalDecision:
                                calculation.systemDecision,

                            decidedByUserId:
                                null,

                            reason:
                                null,
                        })
                }

                processed++
            }

            return NextResponse.json({
                success: true,

                action:
                    "review",

                status:
                    "promotion_ready",

                processed,

                message:
                    "Final results are complete. Promotion decisions are ready for review.",
            })
        }

        /*
        |--------------------------------------------------------------------------
        | CLOSE / ROLLOVER
        |--------------------------------------------------------------------------
        */

        const enrollments =
            await db.query.studentEnrollments.findMany(
                {
                    where: eq(
                        studentEnrollments.academicYearId,
                        academicYearId,
                    ),

                    with: {
                        student: true,
                        class: true,
                    },
                },
            )

        const rolloverRows: Array<{
            enrollmentId: string
            studentId: string
            currentClassId: string
            finalDecision: FinalDecision
            toClassId: string | null
        }> = []

        for (
            const enrollment
            of enrollments
        ) {
            const decision =
                await db.query.promotionDecisions.findFirst(
                    {
                        where: (
                            promotionDecision,
                            { and, eq },
                        ) =>
                            and(
                                eq(
                                    promotionDecision.studentId,
                                    enrollment.studentId,
                                ),

                                eq(
                                    promotionDecision.academicYearId,
                                    academicYearId,
                                ),
                            ),
                    },
                )

            /*
            |--------------------------------------------------------------------------
            | Every student must have a promotion decision.
            |--------------------------------------------------------------------------
            */

            if (!decision) {
                return NextResponse.json(
                    {
                        error:
                            `Cannot close the academic year. Student ${getStudentFullName(enrollment.student)} in class ${enrollment.class.name} does not have a promotion decision.`,
                    },
                    {
                        status: 409,
                    },
                )
            }

            /*
            |--------------------------------------------------------------------------
            | The system calculation must not still be incomplete.
            |--------------------------------------------------------------------------
            */

            if (
                decision.systemResult ===
                "incomplete"
            ) {
                return NextResponse.json(
                    {
                        error:
                            `Cannot close the academic year. Final results are incomplete for student ${getStudentFullName(enrollment.student)} in class ${enrollment.class.name}.`,
                    },
                    {
                        status: 409,
                    },
                )
            }

            /*
            |--------------------------------------------------------------------------
            | Every student must have a final administrative decision.
            |--------------------------------------------------------------------------
            */

            if (
                !decision.finalDecision
            ) {
                return NextResponse.json(
                    {
                        error:
                            `Cannot close the academic year. Student ${getStudentFullName(enrollment.student)} in class ${enrollment.class.name} does not have a final promotion decision.`,
                    },
                    {
                        status: 409,
                    },
                )
            }

            /*
            |--------------------------------------------------------------------------
            | Validate final decision.
            |--------------------------------------------------------------------------
            */

            if (
                decision.finalDecision !==
                    "promote" &&
                decision.finalDecision !==
                    "retain" &&
                decision.finalDecision !==
                    "graduate"
            ) {
                return NextResponse.json(
                    {
                        error:
                            `Cannot close the academic year. Student ${getStudentFullName(enrollment.student)} has an invalid final promotion decision.`,
                    },
                    {
                        status: 409,
                    },
                )
            }

            const finalDecision =
                decision.finalDecision as FinalDecision

            /*
            |--------------------------------------------------------------------------
            | Promote requires a destination class.
            |--------------------------------------------------------------------------
            */

            if (
                finalDecision ===
                    "promote" &&
                !decision.toClassId
            ) {
                return NextResponse.json(
                    {
                        error:
                            `Cannot close the academic year. Student ${getStudentFullName(enrollment.student)} is marked for promotion but has no destination class.`,
                    },
                    {
                        status: 409,
                    },
                )
            }

            /*
            |--------------------------------------------------------------------------
            | Validate destination class.
            |--------------------------------------------------------------------------
            */

            if (
                finalDecision ===
                    "promote" &&
                decision.toClassId
            ) {
                const destinationClass =
                    await db.query.schoolClases.findFirst(
                        {
                            where: eq(
                                schoolClases.id,
                                decision.toClassId,
                            ),
                        },
                    )

                if (
                    !destinationClass
                ) {
                    return NextResponse.json(
                        {
                            error:
                                `Cannot close the academic year. Student ${getStudentFullName(enrollment.student)} has an invalid destination class.`,
                        },
                        {
                            status: 409,
                        },
                    )
                }

                const currentClass =
                    await db.query.schoolClases.findFirst(
                        {
                            where: eq(
                                schoolClases.id,
                                enrollment.classId,
                            ),
                        },
                    )

                if (!currentClass) {
                    return NextResponse.json(
                        {
                            error:
                                `Cannot close the academic year. The current class for student ${getStudentFullName(enrollment.student)} could not be found.`,
                        },
                        {
                            status: 409,
                        },
                    )
                }

                if (
                    destinationClass.gradeLevel !==
                    currentClass.gradeLevel +
                        1
                ) {
                    return NextResponse.json(
                        {
                            error:
                                `Cannot close the academic year. Destination class for student ${getStudentFullName(enrollment.student)} must be the next grade level.`,
                        },
                        {
                            status: 409,
                        },
                    )
                }
            }

            const rolloverToClassId =
                finalDecision ===
                    "promote"
                    ? decision.toClassId
                    : finalDecision ===
                        "retain"
                        ? enrollment.classId
                        : null

            rolloverRows.push({
                enrollmentId:
                    enrollment.id,

                studentId:
                    enrollment.studentId,

                currentClassId:
                    enrollment.classId,

                finalDecision,

                toClassId:
                    rolloverToClassId,
            })
        }

        /*
        |--------------------------------------------------------------------------
        | Determine next academic year.
        |--------------------------------------------------------------------------
        */

        let nextAcademicYear

        try {
            nextAcademicYear =
                getNextAcademicYear(
                    academicYear.name,
                )
        } catch (error) {
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unable to determine the next academic year.",
                },
                {
                    status: 409,
                },
            )
        }

        /*
        |--------------------------------------------------------------------------
        | Make sure the next academic year does not already exist.
        |--------------------------------------------------------------------------
        */

        const existingNextYear =
            await db.query.academicYears.findFirst(
                {
                    where: eq(
                        academicYears.name,
                        nextAcademicYear.name,
                    ),
                },
            )

        if (
            existingNextYear
        ) {
            return NextResponse.json(
                {
                    error:
                        `Academic year ${nextAcademicYear.name} already exists. The current year cannot be rolled over automatically into an existing academic year.`,
                },
                {
                    status: 409,
                },
            )
        }

        /*
        |--------------------------------------------------------------------------
        | COMPLETE ROLLOVER TRANSACTION
        |--------------------------------------------------------------------------
        */

        const result =
            db.transaction((tx) => {
                const currentYear =
                    tx
                        .select()
                        .from(academicYears)
                        .where(
                            eq(
                                academicYears.id,
                                academicYearId,
                            ),
                        )
                        .get()

                if (!currentYear) {
                    throw new Error(
                        "Academic year not found.",
                    )
                }

                if (
                    !currentYear.isActive
                ) {
                    throw new Error(
                        "This academic year is already closed.",
                    )
                }

                const nextYearAlreadyExists =
                    tx
                        .select({
                            id:
                                academicYears.id,
                        })
                        .from(
                            academicYears,
                        )
                        .where(
                            eq(
                                academicYears.name,
                                nextAcademicYear.name,
                            ),
                        )
                        .get()

                if (
                    nextYearAlreadyExists
                ) {
                    throw new Error(
                        `Academic year ${nextAcademicYear.name} already exists.`,
                    )
                }

                const newAcademicYearId =
                    crypto.randomUUID()

                const [
                    createdAcademicYear,
                ] = tx
                    .insert(
                        academicYears,
                    )
                    .values({
                        id:
                            newAcademicYearId,

                        name:
                            nextAcademicYear.name,

                        startDate:
                            nextAcademicYear.startDate,

                        endDate:
                            nextAcademicYear.endDate,

                        isActive:
                            true,
                    })
                    .returning()
                    .all()

                if (
                    !createdAcademicYear
                ) {
                    throw new Error(
                        "Failed to create the next academic year.",
                    )
                }

                let promoted = 0
                let retained = 0
                let graduated = 0

                for (
                    const row
                    of rolloverRows
                ) {
                    if (
                        row.finalDecision ===
                        "graduate"
                    ) {
                        graduated++
                        continue
                    }

                    if (
                        !row.toClassId
                    ) {
                        throw new Error(
                            "A rollover enrollment has no destination class.",
                        )
                    }

                    const existingEnrollment =
                        tx
                            .select({
                                id:
                                    studentEnrollments.id,
                            })
                            .from(
                                studentEnrollments,
                            )
                            .where(
                                and(
                                    eq(
                                        studentEnrollments.studentId,
                                        row.studentId,
                                    ),

                                    eq(
                                        studentEnrollments.academicYearId,
                                        newAcademicYearId,
                                    ),
                                ),
                            )
                            .get()

                    if (
                        existingEnrollment
                    ) {
                        throw new Error(
                            `Student ${row.studentId} already has an enrollment in the new academic year.`,
                        )
                    }

                    tx
                        .insert(
                            studentEnrollments,
                        )
                        .values({
                            id:
                                crypto.randomUUID(),

                            studentId:
                                row.studentId,

                            academicYearId:
                                newAcademicYearId,

                            classId:
                                row.toClassId,
                        })
                        .run()

                    if (
                        row.finalDecision ===
                        "promote"
                    ) {
                        promoted++
                    } else {
                        retained++
                    }
                }

                const [
                    closedAcademicYear,
                ] = tx
                    .update(
                        academicYears,
                    )
                    .set({
                        isActive:
                            false,
                    })
                    .where(
                        eq(
                            academicYears.id,
                            academicYearId,
                        ),
                    )
                    .returning()
                    .all()

                if (
                    !closedAcademicYear
                ) {
                    throw new Error(
                        "Failed to close the previous academic year.",
                    )
                }

                return {
                    oldAcademicYear:
                        closedAcademicYear,

                    newAcademicYear:
                        createdAcademicYear,

                    promoted,
                    retained,
                    graduated,

                    totalStudents:
                        rolloverRows.length,
                }
            })

        return NextResponse.json({
            success: true,

            action:
                "close",

            academicYear:
                result.oldAcademicYear,

            nextAcademicYear:
                result.newAcademicYear,

            rollover: {
                totalStudents:
                    result.totalStudents,

                promoted:
                    result.promoted,

                retained:
                    result.retained,

                graduated:
                    result.graduated,
            },

            message:
                `Academic year ${academicYear.name} closed successfully and ${result.newAcademicYear.name} is now active.`,
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to process promotion",
            },
            {
                status: 500,
            },
        )
    }
}

/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
|
| Administrative final decision.
|
| The Principal/Deputy can override the system decision.
|
|--------------------------------------------------------------------------
*/

export async function PATCH(
    request: Request,
) {
    try {
        const session =
            await requireSession()

        if (
            !isPromotionAdmin(
                session.user.schoolRole,
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "Forbidden",
                },
                {
                    status: 403,
                },
            )
        }

        const body =
            await request.json()

        const studentId =
            String(
                body.studentId ??
                    "",
            ).trim()

        const academicYearId =
            String(
                body.academicYearId ??
                    "",
            ).trim()

        const finalDecision =
            String(
                body.finalDecision ??
                    "",
            ).trim()

        const reason =
            String(
                body.reason ??
                    "",
            ).trim()

        const toClassId =
            body.toClassId
                ? String(
                    body.toClassId,
                ).trim()
                : null

        if (
            !studentId ||
            !academicYearId ||
            !finalDecision
        ) {
            return NextResponse.json(
                {
                    error:
                        "studentId, academicYearId and finalDecision are required",
                },
                {
                    status: 400,
                },
            )
        }

        if (
            finalDecision !==
                "promote" &&
            finalDecision !==
                "retain" &&
            finalDecision !==
                "graduate"
        ) {
            return NextResponse.json(
                {
                    error:
                        "finalDecision must be promote, retain, or graduate",
                },
                {
                    status: 400,
                },
            )
        }

        if (!reason) {
            return NextResponse.json(
                {
                    error:
                        "A reason is required",
                },
                {
                    status: 400,
                },
            )
        }

        const db =
            await getSchoolDB()

        /*
        |--------------------------------------------------------------------------
        | Final results MUST be complete before an administrative
        | promotion decision can be finalized.
        |--------------------------------------------------------------------------
        */

        const finalResults =
            await checkFinalResults(
                db,
                academicYearId,
            )

        if (
            !finalResults.complete
        ) {
            return NextResponse.json(
                {
                    success: false,

                    status:
                        "final_results_incomplete",

                    academicYearId,

                    issues:
                        finalResults.issues,

                    issueCount:
                        finalResults.issues.length,

                    message:
                        "Final results are incomplete. Promotion decisions cannot be finalized.",
                },
                {
                    status: 409,
                },
            )
        }

        const student =
            await db.query.students.findFirst(
                {
                    where: eq(
                        students.id,
                        studentId,
                    ),
                },
            )

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

        const enrollment =
            await db.query.studentEnrollments.findFirst(
                {
                    where: (
                        enrollment,
                        { and, eq },
                    ) =>
                        and(
                            eq(
                                enrollment.studentId,
                                studentId,
                            ),

                            eq(
                                enrollment.academicYearId,
                                academicYearId,
                            ),
                        ),
                },
            )

        if (!enrollment) {
            return NextResponse.json(
                {
                    error:
                        "Student enrollment not found",
                },
                {
                    status: 404,
                },
            )
        }

        const existing =
            await db.query.promotionDecisions.findFirst(
                {
                    where: (
                        decision,
                        { and, eq },
                    ) =>
                        and(
                            eq(
                                decision.studentId,
                                studentId,
                            ),

                            eq(
                                decision.academicYearId,
                                academicYearId,
                            ),
                        ),
                },
            )

        if (!existing) {
            return NextResponse.json(
                {
                    error:
                        "Promotion review does not exist yet. Review the promotion results first.",
                },
                {
                    status: 409,
                },
            )
        }

        let finalToClassId =
            existing.toClassId

        /*
        |--------------------------------------------------------------------------
        | Promote
        |--------------------------------------------------------------------------
        */

        if (
            finalDecision ===
            "promote"
        ) {
            if (!toClassId) {
                return NextResponse.json(
                    {
                        error:
                            "toClassId is required when promoting",
                    },
                    {
                        status: 400,
                    },
                )
            }

            const destinationClass =
                await db.query.schoolClases.findFirst(
                    {
                        where: eq(
                            schoolClases.id,
                            toClassId,
                        ),
                    },
                )

            if (
                !destinationClass
            ) {
                return NextResponse.json(
                    {
                        error:
                            "Destination class not found",
                    },
                    {
                        status: 404,
                    },
                )
            }

            const currentClass =
                await db.query.schoolClases.findFirst(
                    {
                        where: eq(
                            schoolClases.id,
                            enrollment.classId,
                        ),
                    },
                )

            if (!currentClass) {
                return NextResponse.json(
                    {
                        error:
                            "Current class not found",
                    },
                    {
                        status: 404,
                    },
                )
            }

            if (
                destinationClass.gradeLevel !==
                currentClass.gradeLevel +
                    1
            ) {
                return NextResponse.json(
                    {
                        error:
                            "Destination class must belong to the next grade level",
                    },
                    {
                        status: 400,
                    },
                )
            }

            finalToClassId =
                destinationClass.id
        } else {
            finalToClassId =
                null
        }

        const [
            updated,
        ] = await db
            .update(
                promotionDecisions,
            )
            .set({
                finalDecision,

                toClassId:
                    finalToClassId,

                decidedByUserId:
                    session.user.id,

                reason,
            })
            .where(
                eq(
                    promotionDecisions.id,
                    existing.id,
                ),
            )
            .returning()

        return NextResponse.json({
            success: true,

            decision:
                updated,
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to update promotion decision",
            },
            {
                status: 500,
            },
        )
    }
}

