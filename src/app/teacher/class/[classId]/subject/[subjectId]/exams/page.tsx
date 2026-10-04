import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import { exams, subjects, schoolClases } from "@/db/schema"
import { requirePermission } from "@/auth/session"
import ExamsClient from "./ExamsClient"

type PageProps = {
    params: Promise<{
        classId: string
        subjectId: string
    }>
}

export default async function ExamsPage({ params }: PageProps) {
    const { classId, subjectId } = await params

    await requirePermission("exams.read")

    const db = await getSchoolDB()

    const schoolClass = await db.query.schoolClases.findFirst({
        where: eq(schoolClases.id, classId),
    })

    const subject = await db.query.subjects.findFirst({
        where: eq(subjects.id, subjectId),
    })

    if (!schoolClass || !subject) {
        notFound()
    }

    const examRows = await db.query.exams.findMany({
        where: and(
            eq(exams.classId, classId),
            eq(exams.subjectId, subjectId),
        ),
        orderBy: (exams, { desc }) => [
            desc(exams.examDate),
        ],
    })

    const initialExams = examRows.map((exam) => ({
        id: exam.id,
        name: exam.name,
        type: exam.type,
        examDate: exam.examDate,
        maxScore: exam.maxScore,
        classId: exam.classId,
        subjectId: exam.subjectId,
        academicYearId: exam.academicYearId,
    }))

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <ExamsClient
                    classId={classId}
                    subjectId={subjectId}
                    className={schoolClass.name}
                    gradeNumber={schoolClass.gradeLevel}
                    subjectName={subject.name}
                    initialExams={initialExams}
                />
            </div>
        </main>
    )
}