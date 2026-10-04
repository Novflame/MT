import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import {
    exams,
    grades,
    studentEnrollments,
    subjects,
    schoolClases,
} from "@/db/schema"
import { requirePermission } from "@/auth/session"

import GradesClient from "./GradesClient"

type PageProps = {
    params: Promise<{
        classId: string
        subjectId: string
        examsId: string
    }>
}

export default async function GradesPage({ params }: PageProps) {
    const { classId, subjectId, examsId } = await params

    await requirePermission("grades.read")

    const db = await getSchoolDB()

    const exam = await db.query.exams.findFirst({
        where: and(
            eq(exams.id, examsId),
            eq(exams.classId, classId),
            eq(exams.subjectId, subjectId),
        ),
        with: {
            subject: true,
            class: true,
        },
    })

    if (!exam) {
        notFound()
    }

    const schoolClass = await db.query.schoolClases.findFirst({
        where: eq(schoolClases.id, classId),
    })

    const subject = await db.query.subjects.findFirst({
        where: eq(subjects.id, subjectId),
    })

    if (!schoolClass || !subject) {
        notFound()
    }

    const enrollments = await db.query.studentEnrollments.findMany({
        where: and(
            eq(studentEnrollments.classId, classId),
            eq(studentEnrollments.academicYearId, exam.academicYearId),
        ),
        with: {
            student: true,
        },
    })

    const examGrades = await db.query.grades.findMany({
        where: eq(grades.examId, examsId),
    })

    const gradeMap = new Map(
        examGrades.map((grade) => [
            grade.studentEnrollmentId,
            {
                id: grade.id,
                score: grade.score,
                note: grade.note,
            },
        ]),
    )

    const students = enrollments
        .map((enrollment) => {
            const grade = gradeMap.get(enrollment.id)

            return {
                enrollmentId: enrollment.id,
                studentId: enrollment.studentId,
                firstName: enrollment.student.firstName,
                middleName: enrollment.student.middleName,
                lastName: enrollment.student.lastName,
                grade: grade
                    ? {
                          id: grade.id,
                          score: grade.score,
                          note: grade.note,
                      }
                    : null,
            }
        })
        .sort((a, b) => {
            const nameA =
                `${a.firstName} ${a.middleName} ${a.lastName}`.trim()

            const nameB =
                `${b.firstName} ${b.middleName} ${b.lastName}`.trim()

            return nameA.localeCompare(nameB)
        })
const session = await requirePermission("grades.read")
    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <GradesClient
                    classId={classId}
                    subjectId={subjectId}
                    examId={examsId}
                    className={schoolClass.name}
                    subjectName={subject.name}
                      teacherName={session.user.name ?? "Teacher"}
                    exam={{
                        id: exam.id,
                        name: exam.name,
                        type: exam.type,
                        examDate: exam.examDate,
                        maxScore: exam.maxScore,
                    }}
                    initialStudents={students}
                />
            </div>
        </main>
    )
}