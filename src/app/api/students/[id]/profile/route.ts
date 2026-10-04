// src/app/api/students/[id]/profile/route.ts

import { NextResponse } from "next/server"
// import { and, desc, eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { getSchoolDB } from "@/db"

// import {
//     students,
//     parents,
//     parentStudents,
//     studentEnrollments,
//     attendance,
//     promotionDecisions,
//     resultCertificates,
// } from "@/db/schema"

import {
    hasPermission,
    type Role,
} from "@/auth/permissions"


type RouteContext = {
    params: Promise<{
        id: string
    }>
}


export async function GET(
    request: Request,
    context: RouteContext,
) {

    try {

        // =========================
        // Authentication
        // =========================

        const session =
            await auth.api.getSession({
                headers: request.headers,
            })


        if (!session) {

            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            )
        }


        // =========================
        // Permission
        // =========================

        const role =
            session.user.schoolRole as Role


        if (
            !hasPermission(
                role,
                "students.read",
            )
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


        // =========================
        // Student ID
        // =========================

        const { id } =
            await context.params


        if (!id) {

            return NextResponse.json(
                {
                    error: "Student ID is required.",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================
        // Database
        // =========================

        const db =
            await getSchoolDB()


        // =========================
        // Student
        // =========================

        const student =
            await db.query.students.findFirst({

                where: (
                    student,
                    { eq },
                ) =>
                    eq(
                        student.id,
                        id,
                    ),

                with: {

                    parentStudents: {
                        with: {
                            parent: true,
                        },
                    },

                    enrollments: {

                        with: {

                            academicYear: true,

                            class: true,

                            attendance: {
                                with: {
                                    studentEnrollment: true,
                                },
                            },

                            grades: {
                                with: {
                                    test: {
                                        with: {
                                            subject: true,
                                        },
                                    },

                                    exam: {
                                        with: {
                                            subject: true,
                                        },
                                    },
                                },
                            },
                        },

                        orderBy: (
                            enrollment,
                            { desc },
                        ) =>
                            desc(
                                enrollment.academicYearId,
                            ),
                    },

                },
            })


        if (!student) {

            return NextResponse.json(
                {
                    error: "Student not found.",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================
        // Current enrollment
        // =========================

        const currentEnrollment =
            student.enrollments[0] ?? null


        // =========================
        // Parents
        // =========================

        const parentsData =
            student.parentStudents.map(
                (relation) => ({
                    id: relation.parent.id,

                    name:
                        relation.parent.name,

                    phone:
                        relation.parent.phone,

                    relationship:
                        null,

                    isPrimary:
                        false,
                }),
            )


        // =========================
        // Attendance
        // =========================

        const attendanceRecords =
            student.enrollments.flatMap(
                (enrollment) =>
                    enrollment.attendance.map(
                        (record) => ({
                            id: record.id,

                            date:
                                record.date,

                            status:
                                record.status,

                            note:
                                record.note,

                            subjectName:
                                "Subject",
                        }),
                    ),
            )


        const totalAttendance =
            attendanceRecords.length


        const present =
            attendanceRecords.filter(
                (record) =>
                    record.status === "present",
            ).length


        const absent =
            attendanceRecords.filter(
                (record) =>
                    record.status === "absent",
            ).length


        const late =
            attendanceRecords.filter(
                (record) =>
                    record.status === "late",
            ).length


        const excused =
            attendanceRecords.filter(
                (record) =>
                    record.status === "excused",
            ).length


        const attendanceRate =
            totalAttendance === 0
                ? 0
                : Number(
                    (
                        (present /
                            totalAttendance) *
                        100
                    ).toFixed(1),
                )


        // =========================
        // Academic
        // =========================

        const gradeRecords =
            student.enrollments.flatMap(
                (enrollment) =>
                    enrollment.grades,
            )


        const gradePercentages =
            gradeRecords.map(
                (grade) => {

                    let maxScore = 100

                    if (grade.test) {
                        maxScore =
                            grade.test.maxScore
                    }

                    if (grade.exam) {
                        maxScore =
                            grade.exam.maxScore
                    }

                    if (maxScore === 0) {
                        return 0
                    }

                    return (
                        (grade.score /
                            maxScore) *
                        100
                    )
                },
            )


        const academicAverage =
            gradePercentages.length === 0
                ? 0
                : Number(
                    (
                        gradePercentages.reduce(
                            (
                                sum,
                                value,
                            ) =>
                                sum + value,
                            0,
                        ) /
                        gradePercentages.length
                    ).toFixed(2),
                )


        // =========================
        // Subject performance
        // =========================

        const subjectMap =
            new Map<
                string,
                {
                    name: string
                    scores: number[]
                }
            >()


        for (
            const grade of gradeRecords
        ) {

            const subject =
                grade.test?.subject ??
                grade.exam?.subject


            if (!subject) {
                continue
            }


            let maxScore = 100

            if (grade.test) {
                maxScore =
                    grade.test.maxScore
            }

            if (grade.exam) {
                maxScore =
                    grade.exam.maxScore
            }


            const percentage =
                maxScore === 0
                    ? 0
                    : (
                        grade.score /
                        maxScore
                    ) * 100


            const existing =
                subjectMap.get(
                    subject.id,
                )


            if (existing) {

                existing.scores.push(
                    percentage,
                )

            } else {

                subjectMap.set(
                    subject.id,
                    {
                        name:
                            subject.name,

                        scores: [
                            percentage,
                        ],
                    },
                )
            }
        }


        const subjects =
            Array.from(
                subjectMap.entries(),
            ).map(
                ([
                    subjectId,
                    data,
                ]) => ({
                    id: subjectId,

                    name:
                        data.name,

                    average:
                        Number(
                            (
                                data.scores.reduce(
                                    (
                                        sum,
                                        value,
                                    ) =>
                                        sum +
                                        value,
                                    0,
                                ) /
                                data.scores.length
                            ).toFixed(2),
                        ),
                }),
            )


        // =========================
        // Recent grades
        // =========================

        const recentGrades =
            gradeRecords
                .map(
                    (grade) => {

                        if (
                            grade.test
                        ) {

                            return {
                                id:
                                    grade.id,

                                score:
                                    grade.score,

                                note:
                                    grade.note,

                                type:
                                    "test" as const,

                                title:
                                    grade.test.name,

                                subjectName:
                                    grade.test
                                        .subject
                                        .name,

                                date:
                                    grade.test
                                        .testDate,

                                maxScore:
                                    grade.test
                                        .maxScore,
                            }
                        }


                        if (
                            grade.exam
                        ) {

                            return {
                                id:
                                    grade.id,

                                score:
                                    grade.score,

                                note:
                                    grade.note,

                                type:
                                    "exam" as const,

                                title:
                                    grade.exam.name,

                                subjectName:
                                    grade.exam
                                        .subject
                                        .name,

                                date:
                                    grade.exam
                                        .examDate,

                                maxScore:
                                    grade.exam
                                        .maxScore,
                            }
                        }


                        return null
                    },
                )
                .filter(
                    (
                        grade,
                    ): grade is NonNullable<
                        typeof grade
                    > =>
                        grade !== null,
                )
                .sort(
                    (a, b) =>
                        b.date.localeCompare(
                            a.date,
                        ),
                )
                .slice(0, 10)


        // =========================
        // Promotion
        // =========================

        const promotions =
            await db.query.promotionDecisions.findMany({

                where: (
                    promotion,
                    { eq },
                ) =>
                    eq(
                        promotion.studentId,
                        id,
                    ),

                with: {

                    fromClass: true,

                    toClass: true,
                },

                orderBy: (
                    promotion,
                    { desc },
                ) =>
                    desc(
                        promotion.createdAt,
                    ),
            })


        // =========================
        // Certificates
        // =========================

        const certificates =
            await db.query.resultCertificates.findMany({

                where: (
                    certificate,
                    { eq },
                ) =>
                    eq(
                        certificate.enrollmentId,
                        currentEnrollment?.id ??
                            "",
                    ),

                orderBy: (
                    certificate,
                    { desc },
                ) =>
                    desc(
                        certificate.issuedAt,
                    ),
            })


        // =========================
        // Timeline
        // =========================

        const timeline: Array<{
            id: string
            type:
                | "enrollment"
                | "attendance"
                | "grade"
                | "promotion"
                | "certificate"
            title: string
            description: string
            date: string
        }> = []


        for (
            const enrollment
            of student.enrollments
        ) {

            timeline.push({
                id:
                    `enrollment-${enrollment.id}`,

                type:
                    "enrollment",

                title:
                    "Student enrolled",

                description:
                    `${enrollment.class.name} — ${enrollment.academicYear.name}`,

                date:
                    enrollment.academicYear
                        .startDate,
            })
        }


        for (
            const record
            of attendanceRecords
                .slice(0, 20)
        ) {

            timeline.push({
                id:
                    `attendance-${record.id}`,

                type:
                    "attendance",

                title:
                    `Attendance: ${record.status}`,

                description:
                    record.note ??
                    "Attendance recorded",

                date:
                    record.date,
            })
        }


        for (
            const grade
            of recentGrades
        ) {

            timeline.push({
                id:
                    `grade-${grade.id}`,

                type:
                    "grade",

                title:
                    `${grade.type === "exam"
                        ? "Exam"
                        : "Test"}: ${grade.title}`,

                description:
                    `${grade.subjectName} — ${grade.score}/${grade.maxScore}`,

                date:
                    grade.date,
            })
        }


        for (
            const promotion
            of promotions
        ) {

            timeline.push({
                id:
                    `promotion-${promotion.id}`,

                type:
                    "promotion",

                title:
                    "Promotion decision",

                description:
                    `${promotion.fromClass.name} → ${promotion.toClass?.name ?? "Not promoted"}`,

                date:
                    promotion.createdAt,
            })
        }


        for (
            const certificate
            of certificates
        ) {

            timeline.push({
                id:
                    `certificate-${certificate.id}`,

                type:
                    "certificate",

                title:
                    "Result certificate issued",

                description:
                    certificate.notes ??
                    "Certificate issued",

                date:
                    certificate.issuedAt,
            })
        }


        timeline.sort(
            (a, b) =>
                b.date.localeCompare(
                    a.date,
                ),
        )


        // =========================
        // Response
        // =========================

        return NextResponse.json({

            student: {
                id:
                    student.id,

                admissionNumber:
                    student.admissionNumber,

                firstName:
                    student.firstName,

                middleName:
                    student.middleName,

                lastName:
                    student.lastName,

                dateOfBirth:
                    student.dateOfBirth,

                gender:
                    student.gender,

                nationality:
                    student.nationality,

                nationalId:
                    student.nationalId,

                photo:
                    student.photo,

                phone:
                    student.phone,

                email:
                    student.email,

                address:
                    student.address,

                city:
                    student.city,

                status:
                    student.status,

                notes:
                    student.notes,

                createdAt:
                    student.createdAt,

                updatedAt:
                    student.updatedAt,
            },

            parents:
                parentsData,

            currentEnrollment:
                currentEnrollment
                    ? {
                        id:
                            currentEnrollment.id,

                        academicYear:
                            currentEnrollment
                                .academicYear,

                        class:
                            currentEnrollment
                                .class,
                    }
                    : null,

            enrollments:
                student.enrollments.map(
                    (enrollment) => ({
                        id:
                            enrollment.id,

                        academicYear:
                            enrollment
                                .academicYear,

                        class:
                            enrollment.class,
                    }),
                ),

            attendance: {

                total:
                    totalAttendance,

                present,

                absent,

                late,

                excused,

                rate:
                    attendanceRate,

                recent:
                    attendanceRecords
                        .sort(
                            (a, b) =>
                                b.date.localeCompare(
                                    a.date,
                                ),
                        )
                        .slice(0, 10),
            },

            academic: {

                totalGrades:
                    gradeRecords.length,

                average:
                    academicAverage,

                subjects,

                recentGrades,
            },

            promotion:
                promotions.map(
                    (promotion) => ({
                        id:
                            promotion.id,

                        academicYearId:
                            promotion
                                .academicYearId,

                        fromClass:
                            promotion
                                .fromClass,

                        toClass:
                            promotion
                                .toClass,

                        systemResult:
                            promotion
                                .systemResult,

                        systemDecision:
                            promotion
                                .systemDecision,

                        finalDecision:
                            promotion
                                .finalDecision,

                        reason:
                            promotion.reason,

                        createdAt:
                            promotion.createdAt,
                    }),
                ),

            certificates,

            timeline:
                timeline.slice(0, 50),
        })

    } catch (error) {

        console.error(
            "Student profile error:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to load student profile.",
            },
            {
                status: 500,
            },
        )
    }
}