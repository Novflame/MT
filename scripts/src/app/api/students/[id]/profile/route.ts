import { getRequestSession } from "@/auth/session"
// src/app/api/students/[id]/profile/route.ts

import { NextResponse } from "next/server"
// import { and, desc, eq } from "drizzle-orm"

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
import { canViewStudent } from "@/auth/authorization"
import { classHeads, departmentHeads, teacherAssignments } from "@/db/schema"
import { eq } from "drizzle-orm"


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
            await getRequestSession(request.headers)


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


        // Record-level authorization must happen before loading the profile.
        const canView = await canViewStudent(
            { id: session.user.id, role },
            id,
        )

        if (!canView) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
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


        // Limit academic details to the user's assignment scope. Access to one student
        // does not grant access to every subject, parent contact, or official history.
        let profileEnrollments = student.enrollments
        let allowedSubjectIds: Set<string> | null = null
        if (role === "teacher") {
            const assignments = await db.query.teacherAssignments.findMany({
                where: eq(teacherAssignments.teacherId, session.user.id),
            })
            allowedSubjectIds = new Set(assignments.map((assignment) => assignment.subjectId))
            profileEnrollments = profileEnrollments.filter((enrollment) => assignments.some((assignment) =>
                assignment.classId === enrollment.classId && assignment.academicYearId === enrollment.academicYearId
            ))
        } else if (role === "head_of_class") {
            const assignments = await db.query.classHeads.findMany({
                where: eq(classHeads.userId, session.user.id),
            })
            profileEnrollments = profileEnrollments.filter((enrollment) => assignments.some((assignment) =>
                assignment.classId === enrollment.classId && assignment.academicYearId === enrollment.academicYearId
            ))
        } else if (role === "head_of_department") {
            const assignments = await db.query.departmentHeads.findMany({
                where: eq(departmentHeads.userId, session.user.id),
            })
            const departmentIds = new Set(assignments.map((assignment) => assignment.departmentId))
            const departmentSubjects = await db.query.subjects.findMany()
            allowedSubjectIds = new Set(departmentSubjects.filter((subject) =>
                subject.departmentId && departmentIds.has(subject.departmentId)
            ).map((subject) => subject.id))
            const requiredSubjects = await db.query.coreSubjects.findMany()
            profileEnrollments = profileEnrollments.filter((enrollment) =>
                assignments.some((assignment) => assignment.academicYearId === enrollment.academicYearId) &&
                requiredSubjects.some((required) =>
                    required.academicYearId === enrollment.academicYearId &&
                    required.classId === enrollment.classId &&
                    allowedSubjectIds!.has(required.subjectId)
                )
            )
        }

        if (allowedSubjectIds) {
            profileEnrollments = profileEnrollments.map((enrollment) => ({
                ...enrollment,
                attendance: enrollment.attendance.filter((record) => allowedSubjectIds!.has(record.subjectId)),
                grades: enrollment.grades.filter((grade) => {
                    const subjectId = grade.test?.subjectId ?? grade.exam?.subjectId
                    return !!subjectId && allowedSubjectIds!.has(subjectId)
                }),
            }))
        }

        const exposeOfficialHistory = role === "principal" || role === "deputy" || role === "student" || role === "parent"

        // =========================
        // Current enrollment
        // =========================

        const currentEnrollment =
            profileEnrollments[0] ?? null


        // =========================
        // Parents
        // =========================

        const parentsData =
            (role === "principal" || role === "deputy" || role === "parent" || role === "student" ? student.parentStudents : []).map(
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
            profileEnrollments.flatMap(
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
            profileEnrollments.flatMap(
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

        const promotions = exposeOfficialHistory ?
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
            }) : []


        // =========================
        // Certificates
        // =========================

        const certificates = exposeOfficialHistory ?
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
            }) : []


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
                profileEnrollments.map(
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
                exposeOfficialHistory ? timeline.slice(0, 50) : [],
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
