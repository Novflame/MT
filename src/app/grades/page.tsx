
import {
    requirePermission,
} from "@/auth/session"
import {
    getStudentFullName,
} from "@/lib/student-name"
import {
    getSchoolDB,
    getActiveAcademicYear,
} from "@/db"

import GradesManager from "@/components/grades/GradesManager"

export default async function GradesPage({
    searchParams,
}: {
    searchParams: Promise<{
        classId?: string
    }>
}) {
    await requirePermission("grades.read")

    const db = await getSchoolDB()

    const year =
        await getActiveAcademicYear()

    const params =
        await searchParams

    const classId =
        params.classId

    // =========================================================
    // Load classes and subjects
    // =========================================================

    const [
        classes,
        subjects,
    ] = await Promise.all([
        db.query.schoolClases.findMany(),

        db.query.subjects.findMany(),
    ])

    // =========================================================
    // Students of selected class
    // =========================================================

    const enrollments =
        classId
            ? await db.query.studentEnrollments.findMany({
                where: (enrollment, { and, eq }) =>
                    and(
                        eq(
                            enrollment.classId,
                            classId,
                        ),

                        eq(
                            enrollment.academicYearId,
                            year.id,
                        ),
                    ),

                with: {
                    student: true,
                },
            })
            : []

    // =========================================================
    // Load assessments
    // =========================================================

    const [
        tests,
        exams,
    ] = await Promise.all([
        db.query.tests.findMany({
            where: (test, { and, eq }) =>
                and(
                    eq(
                        test.academicYearId,
                        year.id,
                    ),

                    ...(classId
                        ? [
                            eq(
                                test.classId,
                                classId,
                            ),
                        ]
                        : []),
                ),
        }),

        db.query.exams.findMany({
            where: (exam, { and, eq }) =>
                and(
                    eq(
                        exam.academicYearId,
                        year.id,
                    ),

                    ...(classId
                        ? [
                            eq(
                                exam.classId,
                                classId,
                            ),
                        ]
                        : []),
                ),
        }),
    ])

    // =========================================================
    // Existing grades
    //
    // We only need grades belonging to the selected
    // students/enrollments.
    // =========================================================

    const enrollmentIds =
        enrollments.map(
            (enrollment) =>
                enrollment.id,
        )

    const existingGrades =
        enrollmentIds.length > 0
            ? await db.query.grades.findMany({
                where: (grade, { inArray }) =>
                    inArray(
                        grade.studentEnrollmentId,
                        enrollmentIds,
                    ),
            })
            : []

    // =========================================================
    // Build completed grade lookup
    //
    // test:<testId>:<enrollmentId>
    // exam:<examId>:<enrollmentId>
    // =========================================================

    const completedGrades =
        new Set<string>()

    for (const grade of existingGrades) {
        if (grade.testId) {
            completedGrades.add(
                `test:${grade.testId}:${grade.studentEnrollmentId}`,
            )
        }

        if (grade.examId) {
            completedGrades.add(
                `exam:${grade.examId}:${grade.studentEnrollmentId}`,
            )
        }
    }

    // =========================================================
    // Convert assessments
    //
    // IMPORTANT:
    // An assessment stays visible until ALL students
    // have a grade.
    //
    // Each assessment also receives only the students
    // who still need a grade.
    // =========================================================

    const assessments = [
    ...tests.map((test) => {
        const pendingEnrollments =
            enrollments.filter(
                (enrollment) =>
                    !completedGrades.has(
                        `test:${test.id}:${enrollment.id}`,
                    ),
            )

        return {
            ...test,

            kind: "test" as const,

            pendingEnrollments:
                pendingEnrollments.map(
                    (enrollment) => ({
                        id: enrollment.id,

                        student: {
                            name: getStudentFullName(
                                enrollment.student,
                            ),
                        },
                    }),
                ),
        }
    }),

    ...exams.map((exam) => {
        const pendingEnrollments =
            enrollments.filter(
                (enrollment) =>
                    !completedGrades.has(
                        `exam:${exam.id}:${enrollment.id}`,
                    ),
            )

        return {
            ...exam,

            kind: "exam" as const,

            pendingEnrollments:
                pendingEnrollments.map(
                    (enrollment) => ({
                        id: enrollment.id,

                        student: {
                            name: getStudentFullName(
                                enrollment.student,
                            ),
                        },
                    }),
                ),
        }
    }),
]
        // =====================================================
        // Remove fully completed assessments
        // =====================================================
        .filter(
            (assessment) =>
                assessment.pendingEnrollments
                    .length > 0,
        )

    // =========================================================
    // Render
    // =========================================================

    return (
        <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">
            <div className="mx-auto max-w-6xl">

                {/* Header */}

                <h1 className="text-3xl font-bold">
                    Grades
                </h1>

                <p className="mt-2 text-gray-600">
                    Enter and update student assessment scores.
                </p>

                {/* Main content */}

                <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">

                    {/* Classes */}

                    <aside className="rounded-lg border bg-white p-4">
                        <h2 className="font-semibold">
                            Classes
                        </h2>

                        <div className="mt-3 space-y-2">
                            {classes.map(
                                (schoolClass) => (
                                    <a
                                        key={
                                            schoolClass.id
                                        }
                                        href={`/grades?classId=${schoolClass.id}`}
                                        className={`block rounded px-3 py-2 ${
                                            schoolClass.id ===
                                            classId
                                                ? "bg-black text-white"
                                                : "hover:bg-gray-100"
                                        }`}
                                    >
                                        {
                                            schoolClass.name
                                        }
                                    </a>
                                ),
                            )}
                        </div>
                    </aside>

                    {/* Grades */}

                    <GradesManager
                        assessments={
                            classId
                                ? assessments
                                : []
                        }

                        subjects={subjects}
                    />
                </div>
            </div>
        </main>
    )
}
