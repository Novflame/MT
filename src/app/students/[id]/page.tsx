import { desc, eq } from "drizzle-orm"

import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import StudentProfile from "@/components/students/StudentProfile"
import {
    grades,
    students,
    studentEnrollments,
} from "@/db/schema"

type Props = {
    params: Promise<{
        id: string
    }>
}

export default async function StudentProfilePage({
    params,
}: Props) {
    await requirePermission("students.read")

    const { id } = await params

    const db = await getSchoolDB()

    const student =
        await db.query.students.findFirst({
            where: eq(students.id, id),

            with: {
                enrollments: {
                    with: {
                        class: true,
                        academicYear: true,
                    },
                },

                parentStudents: {
                    with: {
                        parent: true,
                    },
                },
            },
        })

    if (!student) {
        return (
            <main className="min-h-dvh bg-slate-950 px-4 py-8 text-white sm:px-8">
                <div className="mx-auto max-w-5xl">
                    <h1 className="text-2xl font-bold">
                        Student not found
                    </h1>

                    <p className="mt-2 text-slate-400">
                        The requested student does not exist.
                    </p>
                </div>
            </main>
        )
    }

    /*
     * The enrollments relation is used in its existing order.
     * We do not introduce a new promotion relation here.
     */
    const currentEnrollment =
        student.enrollments[0] ?? null

    /*
     * Attendance
     */
    const attendanceRecords =
        currentEnrollment
            ? await db.query.attendance.findMany({
                  where: (
                      attendance,
                      { eq },
                  ) =>
                      eq(
                          attendance.studentEnrollmentId,
                          currentEnrollment.id,
                      ),
                  orderBy: (
                      attendance,
                      { desc },
                  ) => desc(attendance.date),
              })
            : []

    const attendanceTotal =
        attendanceRecords.length

    const attendancePresent =
        attendanceRecords.filter(
            (record) =>
                record.status === "present",
        ).length

    const attendanceAbsent =
        attendanceRecords.filter(
            (record) =>
                record.status === "absent",
        ).length

    const attendanceLate =
        attendanceRecords.filter(
            (record) =>
                record.status === "late",
        ).length

    const attendanceExcused =
        attendanceRecords.filter(
            (record) =>
                record.status === "excused",
        ).length

    const attendanceRate =
        attendanceTotal > 0
            ? Math.round(
                  (attendancePresent /
                      attendanceTotal) *
                      100,
              )
            : 0

    const recentAttendance =
        attendanceRecords
            .slice(0, 10)
            .map((record) => ({
                id: record.id,
                date: String(record.date),
                status: record.status,
                note: record.note ?? null,
            }))

    /*
     * Grades
     */
    const gradeRecords =
        currentEnrollment
            ? await db.query.grades.findMany({
                  where: eq(
                      grades.studentEnrollmentId,
                      currentEnrollment.id,
                  ),
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
                  orderBy: desc(
                      grades.updatedAt,
                  ),
              })
            : []

    /*
     * Academic average
     */
    const academicValues =
        gradeRecords
            .map((grade) => {
                const assessment =
                    grade.test ??
                    grade.exam

                if (!assessment) {
                    return null
                }

                const maxScore =
                    Number(
                        assessment.maxScore,
                    )

                if (!maxScore) {
                    return null
                }

                return (
                    (Number(grade.score) /
                        maxScore) *
                    100
                )
            })
            .filter(
                (
                    value,
                ): value is number =>
                    value !== null &&
                    Number.isFinite(value),
            )

    const academicAverage =
        academicValues.length > 0
            ? Math.round(
                  academicValues.reduce(
                      (sum, value) =>
                          sum + value,
                      0,
                  ) /
                      academicValues.length,
              )
            : 0

    /*
     * Subject performance
     */
    const subjectMap = new Map<
        string,
        {
            id: string
            name: string
            total: number
            count: number
        }
    >()

    for (const grade of gradeRecords) {
        const assessment =
            grade.test ??
            grade.exam

        const subject =
            grade.test?.subject ??
            grade.exam?.subject

        if (!assessment || !subject) {
            continue
        }

        const maxScore =
            Number(assessment.maxScore)

        if (!maxScore) {
            continue
        }

        const percentage =
            (Number(grade.score) /
                maxScore) *
            100

        const existing =
            subjectMap.get(subject.id)

        if (existing) {
            existing.total += percentage
            existing.count += 1
        } else {
            subjectMap.set(subject.id, {
                id: subject.id,
                name: subject.name,
                total: percentage,
                count: 1,
            })
        }
    }

    const subjects =
        Array.from(
            subjectMap.values(),
        ).map((subject) => ({
            id: subject.id,
            name: subject.name,
            average: Math.round(
                subject.total /
                    subject.count,
            ),
        }))

    /*
     * Recent grades
     */
    const recentGrades =
        gradeRecords
            .slice(0, 10)
            .map((grade) => {
                const assessment =
                    grade.test ??
                    grade.exam

                if (!assessment) {
                    return null
                }

                const subject =
                    grade.test?.subject ??
                    grade.exam?.subject

                return {
                    id: grade.id,
                    title:
                        assessment.name,
                    subjectName:
                        subject?.name ??
                        "Unknown subject",
                    score: Number(
                        grade.score,
                    ),
                    maxScore: Number(
                        assessment.maxScore,
                    ),
                    date: String(
                        grade.updatedAt,
                    ),
                }
            })
            .filter(
                (
                    record,
                ): record is NonNullable<
                    typeof record
                > => record !== null,
            )

    /*
     * Parents
     */
    const parents =
        student.parentStudents.map(
            (relation) => ({
                id: relation.parent.id,
                name:
                    relation.parent.name,
                phone:
                    relation.parent.phone,
            }),
        )

    /*
     * Enrollment history
     */
   const enrollments = student.enrollments
    .filter(
        (
            enrollment,
        ): enrollment is typeof enrollment & {
            academicYear: NonNullable<
                typeof enrollment.academicYear
            >
        } =>
            enrollment.academicYear !== null,
    )
    .map((enrollment) => ({
        id: enrollment.id,

        class: {
            name: enrollment.class.name,
            gradeLevel:
                enrollment.class.gradeLevel,
        },

        academicYear: {
            name:
                enrollment.academicYear.name,
        },
    }))

    /*
     * Timeline
     *
     * There is no promotions relation in the
     * current schema, so timeline uses the
     * real enrollment, attendance and grade data.
     */
    const timeline = [
        ...student.enrollments.map(
            (enrollment) => ({
                id: `enrollment-${enrollment.id}`,

                date:
                    enrollment.academicYear
                        ?.startDate ??
                    "",

                title: "Enrollment",

                description:
                    `${enrollment.class.name} • ` +
                    `${
                        enrollment
                            .academicYear
                            ?.name ??
                        "Academic year"
                    }`,
            }),
        ),

        ...recentAttendance.map(
            (record) => ({
                id: `attendance-${record.id}`,
                date: record.date,
                title: "Attendance",
                description:
                    `Attendance marked as ${record.status}`,
            }),
        ),

        ...recentGrades.map(
            (record) => ({
                id: `grade-${record.id}`,
                date: record.date,
                title: record.title,
                description:
                    `${record.subjectName}: ` +
                    `${record.score}/${record.maxScore}`,
            }),
        ),
    ]
        .filter(
            (record) => Boolean(record.date),
        )
        .sort(
            (a, b) =>
                new Date(
                    b.date,
                ).getTime() -
                new Date(
                    a.date,
                ).getTime(),
        )
        .slice(0, 50)

    /*
     * Student Profile data
     */
   const profile = {
    student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        nationality: student.nationality,
        nationalId: student.nationalId,
        photo: student.photo,
        phone: student.phone,
        email: student.email,
        address: student.address,
        city: student.city,
        status: student.status,
        notes: student.notes,
    },

    currentEnrollment:
        currentEnrollment &&
        currentEnrollment.academicYear
            ? {
                  class: {
                      name:
                          currentEnrollment.class.name,
                      gradeLevel:
                          currentEnrollment.class.gradeLevel,
                  },

                  academicYear: {
                      name:
                          currentEnrollment
                              .academicYear.name,
                  },
              }
            : null,

    attendance: {
        rate: attendanceRate,
        total: attendanceTotal,
        present: attendancePresent,
        absent: attendanceAbsent,
        late: attendanceLate,
        recent: recentAttendance,
    },

    academic: {
        average: academicAverage,
        subjects,
        recentGrades,
    },

    parents,

    enrollments,

    promotion: [],

    timeline,
}

    return (
        <main className="min-h-dvh bg-slate-950 px-4 py-6 text-white sm:px-8">
            <div className="mx-auto w-full max-w-7xl">
                <StudentProfile
                    profile={profile}
                />
            </div>
        </main>
    )
}