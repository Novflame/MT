
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { requireSession } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"

import {
    
    classHeads,
    coreSubjects,
    studentEnrollments,
    
} from "@/db/schema"

function getStudentName(student: {
    firstName: string
    middleName: string
    lastName: string
}) {
    return [
        student.firstName,
        student.middleName,
        student.lastName,
    ]
        .filter(Boolean)
        .join(" ")
}

// function percentage(score: number, maxScore: number) {
//     if (maxScore <= 0) return 0

//     return Math.round(
//         (score / maxScore) * 100,
//     )
// }

function letterGrade(percent: number) {
    if (percent >= 90) return "A+"
    if (percent >= 80) return "A"
    if (percent >= 70) return "B"
    if (percent >= 60) return "C"
    if (percent >= 50) return "D"

    return "F"
}

export default async function HeadOfClassPage() {
    const session = await requireSession()

    /*
     * This page belongs only to Head of Class.
     */
    if (
        session.user.schoolRole !==
        "head_of_class"
    ) {
        redirect("/")
    }

    const db = await getSchoolDB()

    const academicYear =
        await getActiveAcademicYear()

    /*
     * ---------------------------------------------------------
     * Find the class assigned to this Head of Class
     * ---------------------------------------------------------
     */

    const assignment =
        await db.query.classHeads.findFirst({
            where: and(
                eq(
                    classHeads.userId,
                    session.user.id,
                ),
                eq(
                    classHeads.academicYearId,
                    academicYear.id,
                ),
            ),
            with: {
                class: true,
            },
        })

    if (!assignment) {
        return (
            <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                            Head of Class
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-slate-900">
                            No Class Assigned
                        </h1>

                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                            You have not been assigned to a class
                            for the current academic year.
                        </p>
                    </div>
                </div>
            </main>
        )
    }

    const classId = assignment.classId

    /*
     * ---------------------------------------------------------
     * Load class data
     * ---------------------------------------------------------
     */

    const [
        enrollments,
        classSubjects,
        allSubjects,
        attendanceRecords,
        gradeRecords,
    ] = await Promise.all([
        db.query.studentEnrollments.findMany({
            where: and(
                eq(
                    studentEnrollments.classId,
                    classId,
                ),
                eq(
                    studentEnrollments.academicYearId,
                    academicYear.id,
                ),
            ),
            with: {
                student: true,
            },
        }),

        db.query.coreSubjects.findMany({
            where: and(
                eq(
                    coreSubjects.classId,
                    classId,
                ),
                eq(
                    coreSubjects.academicYearId,
                    academicYear.id,
                ),
            ),
        }),

        db.query.subjects.findMany(),

        db.query.attendance.findMany({
            with: {
                studentEnrollment: true,
            },
        }),

        db.query.grades.findMany({
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
        }),
    ])

    /*
     * ---------------------------------------------------------
     * Subjects
     * ---------------------------------------------------------
     */

    const subjectMap = new Map(
        allSubjects.map((subject) => [
            subject.id,
            subject,
        ]),
    )

    const subjectsForClass = classSubjects
        .map((item) =>
            subjectMap.get(item.subjectId),
        )
        .filter(
            (
                subject,
            ): subject is NonNullable<
                typeof subject
            > => Boolean(subject),
        )
        .sort((a, b) =>
            a.name.localeCompare(b.name),
        )

    const subjectIds = new Set(
        subjectsForClass.map(
            (subject) => subject.id,
        ),
    )

    /*
     * ---------------------------------------------------------
     * Attendance
     * ---------------------------------------------------------
     */

    const enrollmentIds = new Set(
        enrollments.map(
            (enrollment) => enrollment.id,
        ),
    )

    const classAttendance =
        attendanceRecords.filter(
            (record) =>
                enrollmentIds.has(
                    record.studentEnrollmentId,
                ),
        )

    const presentCount =
        classAttendance.filter(
            (record) =>
                record.status === "present",
        ).length

    const absentCount =
        classAttendance.filter(
            (record) =>
                record.status === "absent",
        ).length

    const lateCount =
        classAttendance.filter(
            (record) =>
                record.status === "late",
        ).length

    const attendanceTotal =
        classAttendance.length

    const attendanceRate =
        attendanceTotal > 0
            ? Math.round(
                (presentCount /
                    attendanceTotal) *
                    100,
            )
            : 0

    /*
     * ---------------------------------------------------------
     * Grades
     * ---------------------------------------------------------
     */

    const classGrades =
        gradeRecords.filter((grade) => {
            const subjectId =
                grade.exam?.subjectId ??
                grade.test?.subjectId

            const enrollmentId =
                grade.studentEnrollmentId

            return (
                enrollmentIds.has(
                    enrollmentId,
                ) &&
                Boolean(subjectId) &&
                subjectIds.has(subjectId!)
            )
        })

    /*
     * ---------------------------------------------------------
     * Subject performance
     * ---------------------------------------------------------
     */

    const subjectPerformance =
        subjectsForClass.map((subject) => {
            const gradesForSubject =
                classGrades.filter((grade) => {
                    const gradeSubjectId =
                        grade.exam?.subjectId ??
                        grade.test?.subjectId

                    return (
                        gradeSubjectId ===
                        subject.id
                    )
                })

            const totalScore =
                gradesForSubject.reduce(
                    (sum, grade) =>
                        sum + grade.score,
                    0,
                )

            const totalMax =
                gradesForSubject.reduce(
                    (sum, grade) => {
                        const maxScore =
                            grade.exam?.maxScore ??
                            grade.test?.maxScore ??
                            0

                        return (
                            sum + maxScore
                        )
                    },
                    0,
                )

            const average =
                totalMax > 0
                    ? Math.round(
                        (totalScore /
                            totalMax) *
                            100,
                    )
                    : 0

            return {
                id: subject.id,
                name: subject.name,
                gradeCount:
                    gradesForSubject.length,
                average,
            }
        })

    /*
     * ---------------------------------------------------------
     * Student performance
     * ---------------------------------------------------------
     */

    const studentPerformance =
        enrollments
            .map((enrollment) => {
                const gradesForStudent =
                    classGrades.filter(
                        (grade) =>
                            grade.studentEnrollmentId ===
                            enrollment.id,
                    )

                const totalScore =
                    gradesForStudent.reduce(
                        (sum, grade) =>
                            sum + grade.score,
                        0,
                    )

                const totalMax =
                    gradesForStudent.reduce(
                        (sum, grade) => {
                            const maxScore =
                                grade.exam?.maxScore ??
                                grade.test?.maxScore ??
                                0

                            return (
                                sum + maxScore
                            )
                        },
                        0,
                    )

                const average =
                    totalMax > 0
                        ? Math.round(
                            (totalScore /
                                totalMax) *
                                100,
                        )
                        : 0

                return {
                    id: enrollment.id,
                    student:
                        enrollment.student,
                    gradeCount:
                        gradesForStudent.length,
                    average,
                }
            })
            .sort(
                (a, b) =>
                    b.average -
                    a.average,
            )

    const classAverage =
        studentPerformance.length > 0
            ? Math.round(
                studentPerformance.reduce(
                    (sum, student) =>
                        sum +
                        student.average,
                    0,
                ) /
                    studentPerformance.length,
            )
            : 0

    /*
     * ---------------------------------------------------------
     * Final exam results
     * ---------------------------------------------------------
     */

    const finalGrades =
        classGrades.filter(
            (grade) =>
                grade.exam?.type ===
                "FINAL",
        )

    const finalScore =
        finalGrades.reduce(
            (sum, grade) =>
                sum + grade.score,
            0,
        )

    const finalMax =
        finalGrades.reduce(
            (sum, grade) =>
                sum +
                (grade.exam?.maxScore ?? 0),
            0,
        )

    const finalAverage =
        finalMax > 0
            ? Math.round(
                (finalScore /
                    finalMax) *
                    100,
            )
            : 0

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">

                {/* =====================================================
                    HEADER
                ===================================================== */}

                <header className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                Head of Class
                            </p>

                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                {assignment.class.name}
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                {academicYear.name}
                                {" · "}
                                {session.user.name ??
                                    "Head of Class"}
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Class Average
                            </p>

                            <div className="mt-1 flex items-end gap-2">
                                <span className="text-3xl font-bold text-slate-900">
                                    {classAverage}%
                                </span>

                                <span className="pb-1 text-sm font-semibold text-slate-500">
                                    {letterGrade(
                                        classAverage,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* =====================================================
                    SUMMARY
                ===================================================== */}

                <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Students
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                            {enrollments.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Subjects
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                            {subjectsForClass.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Present
                        </p>
                        <p className="mt-2 text-3xl font-bold text-emerald-600">
                            {presentCount}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Absent
                        </p>
                        <p className="mt-2 text-3xl font-bold text-red-500">
                            {absentCount}
                        </p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Attendance
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                            {attendanceRate}%
                        </p>
                    </div>
                </section>

                {/* =====================================================
                    SUBJECT PERFORMANCE
                ===================================================== */}

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            Subject Performance
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Academic performance across all subjects
                            in your class.
                        </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {subjectPerformance.map(
                            (subject) => (
                                <div
                                    key={subject.id}
                                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {subject.name}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-400">
                                            {
                                                subject.gradeCount
                                            }{" "}
                                            grade
                                            {subject.gradeCount ===
                                            1
                                                ? ""
                                                : "s"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-slate-800"
                                                style={{
                                                    width: `${Math.min(
                                                        subject.average,
                                                        100,
                                                    )}%`,
                                                }}
                                            />
                                        </div>

                                        <span className="w-14 text-right text-sm font-bold text-slate-900">
                                            {
                                                subject.average
                                            }%
                                        </span>

                                        <span className="w-8 text-sm font-semibold text-slate-500">
                                            {letterGrade(
                                                subject.average,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            ),
                        )}

                        {subjectsForClass.length ===
                            0 && (
                            <div className="px-6 py-10 text-center text-sm text-slate-500">
                                No subjects are assigned to
                                this class yet.
                            </div>
                        )}
                    </div>
                </section>

                {/* =====================================================
                    STUDENTS
                ===================================================== */}

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            Students
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Academic performance of students in
                            your class.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
    <table className="w-full `min-w-162.5` text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                        #
                                    </th>

                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Student
                                    </th>

                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Grades
                                    </th>

                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Average
                                    </th>

                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Result
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {studentPerformance.map(
                                    (
                                        student,
                                        index,
                                    ) => (
                                        <tr
                                            key={
                                                student.id
                                            }
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {index +
                                                    1}
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {getStudentName(
                                                        student.student,
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {
                                                        student
                                                            .student
                                                            .admissionNumber
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {
                                                    student.gradeCount
                                                }
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-900">
                                                    {
                                                        student.average
                                                    }
                                                    %
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={
                                                        student.average >=
                                                        50
                                                            ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                                                            : "inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                                    }
                                                >
                                                    {letterGrade(
                                                        student.average,
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* =====================================================
                    RESULTS
                ===================================================== */}

                <section className="grid gap-6 lg:grid-cols-2">

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Final Results
                        </p>

                        <div className="mt-4 flex items-end gap-3">
                            <span className="text-4xl font-bold text-slate-900">
                                {finalAverage}%
                            </span>

                            <span className="pb-1 font-semibold text-slate-500">
                                {letterGrade(
                                    finalAverage,
                                )}
                            </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                            Based on recorded final exam grades
                            across the class.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Attendance Overview
                        </p>

                        <div className="mt-5 grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-emerald-50 p-4">
                                <p className="text-xs font-semibold text-emerald-600">
                                    Present
                                </p>
                                <p className="mt-1 text-2xl font-bold text-emerald-700">
                                    {
                                        presentCount
                                    }
                                </p>
                            </div>

                            <div className="rounded-xl bg-red-50 p-4">
                                <p className="text-xs font-semibold text-red-600">
                                    Absent
                                </p>
                                <p className="mt-1 text-2xl font-bold text-red-700">
                                    {
                                        absentCount
                                    }
                                </p>
                            </div>

                            <div className="rounded-xl bg-amber-50 p-4">
                                <p className="text-xs font-semibold text-amber-600">
                                    Late
                                </p>
                                <p className="mt-1 text-2xl font-bold text-amber-700">
                                    {lateCount}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </main>
    )
}

