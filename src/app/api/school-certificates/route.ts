
import { NextResponse } from "next/server"
import { and, desc, eq, inArray } from "drizzle-orm"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import {
    academicYears,
    promotionDecisions,
    schoolCertificates,
    studentEnrollments,
} from "@/db/schema"
import { getStudentFullName } from "@/lib/student-name"

export const runtime = "nodejs"

type CertificateType =
    | "MID_TERM"
    | "SCHOOL_COMPLETION"
    | "APPRECIATION_ACHIEVEMENT"

const CERTIFICATE_TYPES: CertificateType[] = [
    "MID_TERM",
    "SCHOOL_COMPLETION",
    "APPRECIATION_ACHIEVEMENT",
]

function isCertificateType(value: unknown): value is CertificateType {
    return (
        typeof value === "string" &&
        CERTIFICATE_TYPES.includes(value as CertificateType)
    )
}

function isAdmin(role: string) {
    return role === "principal" || role === "deputy"
}

function errorResponse(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status })
}

async function authorize() {
    const session = await requireSession()

    if (!isAdmin(session.user.schoolRole)) {
        throw new Error("FORBIDDEN")
    }

    return session
}

function handleError(error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
        return errorResponse(
            "Only the principal or deputy can manage school certificates.",
            403,
        )
    }

    console.error("School certificates API error:", error)

    return errorResponse("Failed to process school certificates.", 500)
}

/**
 * GET /api/school-certificates
 *
 * Preview:
 *   ?mode=preview&academicYearId=YEAR_ID&certificateType=SCHOOL_COMPLETION
 *
 * History:
 *   ?mode=history&academicYearId=YEAR_ID&certificateType=SCHOOL_COMPLETION
 *
 * Optional:
 *   &classId=CLASS_ID
 */
export async function GET(request: Request) {
    try {
        await authorize()

        const { searchParams } = new URL(request.url)

        const academicYearId = searchParams.get("academicYearId")
        const classId = searchParams.get("classId")
        const certificateType = searchParams.get("certificateType")
        const mode = searchParams.get("mode") ?? "preview"

        if (!academicYearId) {
            return errorResponse("Academic year is required.")
        }

        if (!isCertificateType(certificateType)) {
            return errorResponse("Invalid certificate type.")
        }

        if (mode !== "preview" && mode !== "history") {
            return errorResponse("Invalid mode.")
        }

        const db = await getSchoolDB()

        const year = await db.query.academicYears.findFirst({
            where: eq(academicYears.id, academicYearId),
        })

        if (!year) {
            return errorResponse("Academic year not found.", 404)
        }

        const enrollments = await db.query.studentEnrollments.findMany({
            where: classId
                ? and(
                    eq(studentEnrollments.academicYearId, academicYearId),
                    eq(studentEnrollments.classId, classId),
                )
                : eq(studentEnrollments.academicYearId, academicYearId),
            with: {
                student: true,
                class: true,
            },
        })
        const certificateRows = await db.query.schoolCertificates.findMany({
            where: and(
                eq(schoolCertificates.academicYearId, academicYearId),
                eq(schoolCertificates.certificateType, certificateType),
            ),
            orderBy: [desc(schoolCertificates.issuedAt)],
        })

        const certificateByEnrollment = new Map(
            certificateRows.map((certificate) => [
                certificate.enrollmentId,
                certificate,
            ]),
        )

        if (mode === "history") {
            const enrollmentById = new Map(
                enrollments.map((enrollment) => [
                    enrollment.id,
                    enrollment,
                ]),
            )

            const history = certificateRows
                .filter((certificate) =>
                    enrollmentById.has(certificate.enrollmentId),
                )
                .map((certificate) => {
                    const enrollment = enrollmentById.get(
                        certificate.enrollmentId,
                    )!

                    return {
                        ...certificate,
                        student: {
                            id: enrollment.student.id,
                            admissionNumber:
                                enrollment.student.admissionNumber,
                            fullName: getStudentFullName(enrollment.student),
                        },
                        class: enrollment.class,
                    }
                })

            return NextResponse.json({
                academicYear: year,
                certificateType,
                history,
            })
        }

        let eligibleEnrollmentIds = new Set<string>()

        if (certificateType === "SCHOOL_COMPLETION") {
            const classes = await db.query.schoolClases.findMany({
                columns: {
                    id: true,
                    gradeLevel: true,
                },
            })

            if (classes.length === 0) {
                return NextResponse.json({
                    academicYear: year,
                    certificateType,
                    students: [],
                })
            }

            const highestGradeLevel = Math.max(
                ...classes.map((schoolClass) => schoolClass.gradeLevel),
            )

            const highestGradeClassIds = classes
                .filter(
                    (schoolClass) =>
                        schoolClass.gradeLevel === highestGradeLevel,
                )
                .map((schoolClass) => schoolClass.id)

            const highestGradeEnrollments = enrollments.filter(
                (enrollment) =>
                    highestGradeClassIds.includes(enrollment.classId),
            )

            const decisions =
                highestGradeEnrollments.length > 0
                    ? await db.query.promotionDecisions.findMany({
                        where: and(
                            eq(
                                promotionDecisions.academicYearId,
                                academicYearId,
                            ),
                            eq(
                                promotionDecisions.finalDecision,
                                "graduate",
                            ),
                            inArray(
                                promotionDecisions.studentId,
                                highestGradeEnrollments.map(
                                    (enrollment) => enrollment.studentId,
                                ),
                            ),
                        ),
                    })
                    : []

            const finalizedGraduateIds = new Set(
                decisions
                    .filter((decision) => decision.decidedByUserId !== null)
                    .map((decision) => decision.studentId),
            )

            eligibleEnrollmentIds = new Set(
                highestGradeEnrollments
                    .filter((enrollment) =>
                        finalizedGraduateIds.has(enrollment.studentId),
                    )
                    .map((enrollment) => enrollment.id),
            )
        } else {
            // Appreciation certificates have independent criteria.
            // Return students for explicit administrator selection.
            eligibleEnrollmentIds = new Set(
                enrollments.map((enrollment) => enrollment.id),
            )
        }

        const result = enrollments
            .filter((enrollment) =>
                eligibleEnrollmentIds.has(enrollment.id),
            )
            .map((enrollment) => {
                const existingCertificate = certificateByEnrollment.get(
                    enrollment.id,
                )

                return {
                    enrollmentId: enrollment.id,
                    studentId: enrollment.student.id,
                    admissionNumber: enrollment.student.admissionNumber,
                    fullName: getStudentFullName(enrollment.student),
                    class: enrollment.class,
                    alreadyIssued: Boolean(existingCertificate),
                    certificateId: existingCertificate?.id ?? null,
                    issuedAt: existingCertificate?.issuedAt ?? null,
                }
            })

        return NextResponse.json({
            academicYear: year,
            certificateType,
            students: result,
            eligibleCount: result.filter(
                (student) => !student.alreadyIssued,
            ).length,
        })
    } catch (error) {
        return handleError(error)
    }
}


export async function POST(request: Request) {
    try {
        const session = await authorize()
        const body = await request.json()

        const academicYearId = body.academicYearId
        const certificateType = body.certificateType
        const enrollmentIds = body.enrollmentIds
        const notes =
            typeof body.notes === "string" ? body.notes.trim() : null

        if (
            typeof academicYearId !== "string" ||
            !academicYearId.trim()
        ) {
            return errorResponse("Academic year is required.")
        }

        if (!isCertificateType(certificateType)) {
            return errorResponse("Invalid certificate type.")
        }

        if (
            !Array.isArray(enrollmentIds) ||
            enrollmentIds.length === 0 ||
            enrollmentIds.some(
                (id) => typeof id !== "string" || !id.trim(),
            )
        ) {
            return errorResponse(
                "Select at least one student to issue certificates.",
            )
        }

        const uniqueEnrollmentIds = [...new Set(enrollmentIds)]

        if (
            certificateType === "APPRECIATION_ACHIEVEMENT" &&
            !notes
        ) {
            return errorResponse(
                "Enter the appreciation or achievement criteria in the notes.",
            )
        }

        const db = await getSchoolDB()

        const year = await db.query.academicYears.findFirst({
            where: eq(academicYears.id, academicYearId),
        })

        if (!year) {
            return errorResponse("Academic year not found.", 404)
        }

        const selectedEnrollments =
            await db.query.studentEnrollments.findMany({
                where: and(
                    eq(
                        studentEnrollments.academicYearId,
                        academicYearId,
                    ),
                    inArray(
                        studentEnrollments.id,
                        uniqueEnrollmentIds,
                    ),
                ),
                with: {
                    student: true,
                    class: true,
                },
            })

        // Do not silently accept enrollment IDs from another year
        // or nonexistent enrollment IDs.
        if (selectedEnrollments.length !== uniqueEnrollmentIds.length) {
            return errorResponse(
                "One or more selected students do not belong to this academic year.",
            )
        }

        if (certificateType === "SCHOOL_COMPLETION") {
            const classes = await db.query.schoolClases.findMany({
                columns: {
                    id: true,
                    gradeLevel: true,
                },
            })

            if (classes.length === 0) {
                return errorResponse("No school classes were found.")
            }

            const highestGradeLevel = Math.max(
                ...classes.map((schoolClass) => schoolClass.gradeLevel),
            )

            const highestGradeClassIds = new Set(
                classes
                    .filter(
                        (schoolClass) =>
                            schoolClass.gradeLevel === highestGradeLevel,
                    )
                    .map((schoolClass) => schoolClass.id),
            )

            const eligibleEnrollments = selectedEnrollments.filter(
                (enrollment) => highestGradeClassIds.has(enrollment.classId),
            )

            if (eligibleEnrollments.length !== selectedEnrollments.length) {
                return errorResponse(
                    "School completion certificates can only be issued to students in the highest grade.",
                )
            }

            const decisions =
                await db.query.promotionDecisions.findMany({
                    where: and(
                        eq(
                            promotionDecisions.academicYearId,
                            academicYearId,
                        ),
                        eq(
                            promotionDecisions.finalDecision,
                            "graduate",
                        ),
                        inArray(
                            promotionDecisions.studentId,
                            selectedEnrollments.map(
                                (enrollment) => enrollment.studentId,
                            ),
                        ),
                    ),
                })

            const finalizedGraduateIds = new Set(
                decisions
                    .filter((decision) => decision.decidedByUserId !== null)
                    .map((decision) => decision.studentId),
            )

            const ineligible = selectedEnrollments.filter(
                (enrollment) =>
                    !finalizedGraduateIds.has(enrollment.studentId),
            )

            if (ineligible.length > 0) {
                return errorResponse(
                    "Every selected student must have a finalized administrative graduate decision.",
                )
            }
        }
        const existingCertificates =
            await db.query.schoolCertificates.findMany({
                where: and(
                    eq(
                        schoolCertificates.academicYearId,
                        academicYearId,
                    ),
                    eq(
                        schoolCertificates.certificateType,
                        certificateType,
                    ),
                    inArray(
                        schoolCertificates.enrollmentId,
                        uniqueEnrollmentIds,
                    ),
                ),
            })



        const existingEnrollmentIds = new Set(
            existingCertificates.map(
                (certificate) => certificate.enrollmentId,
            ),
        )

        const toIssue = selectedEnrollments.filter(
            (enrollment) =>
                !existingEnrollmentIds.has(enrollment.id),
        )

        if (toIssue.length === 0) {
            return NextResponse.json({
                message: "All selected students already have this certificate.",
                issuedCount: 0,
                skippedCount: uniqueEnrollmentIds.length,
                issued: [],
            })
        }

        const now = new Date().toISOString()

  
const issued = await db
    .insert(schoolCertificates)
    .values(
        toIssue.map((enrollment) => ({
            id: crypto.randomUUID(),
            enrollmentId: enrollment.id,
            academicYearId,
            certificateType,
            issuedByUserId: session.user.id,
            notes,
            issuedAt: now,
            createdAt: now,
            updatedAt: now,
        })),
    )
    .onConflictDoNothing()
    .returning()


        return NextResponse.json({
            message: "School certificates processed.",
            issuedCount: issued.length,
            skippedCount:
                uniqueEnrollmentIds.length - issued.length,
            issued,
        })
    } catch (error) {
        return handleError(error)
    }
}


