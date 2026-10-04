import { NextResponse } from "next/server"
import { getSchoolDB } from "@/db"
import { eq } from "drizzle-orm"
import { exams , grades } from "@/db/schema"
import { requirePermission } from "@/auth/session"
import { type Role } from "@/auth/permissions"
import { getActiveAcademicYear } from "@/db/academic-year"
import {
    isExamType,
    createExamName,
} from "@/lib/exam-name"

import {
    getNextSequence,
} from "@/lib/sequence"
import { canManageAcademicResource } from "@/auth/assessment-authorization"
export async function GET() {
    try {
        await requirePermission("exams.read")

        const db = await getSchoolDB()
       
        const data = await db.query.exams.findMany({
            with: {
                subject: true,
                class: true,
            },
        })

        return NextResponse.json(data)
    } catch (error) {
        console.error(error)

        if (
            error instanceof Error &&
            error.message === "Forbidden"
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            )
        }

        return NextResponse.json(
            {
                error: "Failed to get exams",
            },
            {
                status: 500,
            },
        )
    }
}



//<===== POST =====>

export async function POST(request: Request) {
    try {
        await requirePermission("exams.create")

        const body = await request.json()

        const subjectId = body.subjectId?.trim()
        const classId = body.classId?.trim()
        const type = body.type?.trim()
        const examDate = body.examDate?.trim()
        const maxScore = Number(body.maxScore)

        if (
            !subjectId ||
            !classId ||
            !type ||
            !examDate ||
            !maxScore
        ) {
            return NextResponse.json(
                {
                    error: "All exam fields are required",
                },
                {
                    status: 400,
                },
            )
        }

        if (!isExamType(type)) {
            return NextResponse.json(
                {
                    error:
                        "Invalid exam type. Allowed types are QUIZ, MONTHLY, MIDTERM and FINAL.",
                },
                {
                    status: 400,
                },
            )
        }

        if (
            !Number.isInteger(maxScore) ||
            maxScore <= 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "Maximum score must be a positive whole number.",
                },
                {
                    status: 400,
                },
            )
        }

        const db = await getSchoolDB()

        const academicYear =
            await getActiveAcademicYear()

        const session =
            await requirePermission("exams.create")

        const allowed =
            await canManageAcademicResource(
                {
                    id: session.user.id,
                    role:
                        session.user
                            .schoolRole as Role,
                },
                "exams.create",
                {
                    academicYearId:
                        academicYear.id,
                    classId,
                    subjectId,
                },
            )

        if (!allowed) {
            return NextResponse.json(
                {
                    error: "Forbidden",
                },
                {
                    status: 403,
                },
            )
        }

        const subject =
            await db.query.subjects.findFirst({
                where: (subjects, { eq }) =>
                    eq(
                        subjects.id,
                        subjectId,
                    ),
            })

        if (!subject) {
            return NextResponse.json(
                {
                    error: "Subject not found",
                },
                {
                    status: 404,
                },
            )
        }

        const schoolClass =
            await db.query.schoolClases.findFirst({
                where: (schoolClases, { eq }) =>
                    eq(
                        schoolClases.id,
                        classId,
                    ),
            })

        if (!schoolClass) {
            return NextResponse.json(
                {
                    error: "Class not found",
                },
                {
                    status: 404,
                },
            )
        }

        /*
         * Find existing exams of the same
         * class + subject + type.
         */
        const existingExams =
            await db.query.exams.findMany({
                where: (exams, { and, eq }) =>
                    and(
                        eq(
                            exams.classId,
                            classId,
                        ),
                        eq(
                            exams.subjectId,
                            subjectId,
                        ),
                        eq(
                            exams.type,
                            type,
                        ),
                    ),
                columns: {
                    name: true,
                },
            })

        /*
         * Extract the sequence number from
         * the end of each exam name.
         *
         * Example:
         *
         * MATH-10-A-QUIZ-01 → 1
         * MATH-10-A-QUIZ-03 → 3
         */
        const sequenceNumbers =
            existingExams
                .map((exam) => {
                    const match =
                        exam.name.match(
                            /-(\d+)$/,
                        )

                    return match
                        ? Number(match[1])
                        : 0
                })
                .filter(
                    (number) =>
                        number > 0,
                )

        const count =
            getNextSequence(
                sequenceNumbers,
            )

        /*
         * The server creates the official
         * exam name.
         */
        const name = createExamName({
            subjectName: subject.name,
            gradeNumber:
                schoolClass.gradeLevel,
            className: schoolClass.name,
            type,
            count,
        })

        const [exam] = await db
            .insert(exams)
            .values({
                id: crypto.randomUUID(),
                name,
                subjectId,
                classId,
                type,
                examDate,
                maxScore,
                academicYearId:
                    academicYear.id,
            })
            .returning()

        return NextResponse.json(
            exam,
            {
                status: 201,
            },
        )
    } catch (error) {
        console.error(error)

        if (
            error instanceof Error &&
            error.message === "Forbidden"
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

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to create exam",
            },
            {
                status: 500,
            },
        )
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await (await 
            import("@/auth/session")).requirePermission("exams.update");

             const body=await request.json(); const id=String(body.id??""); 

             const db=await getSchoolDB();

             const exam = await db.query.exams.findFirst({
    where: eq(exams.id, id),
}) 
              if(!exam)return NextResponse.json({error:"Exam not found"},
                {status:404});

               const allowed=await canManageAcademicResource({
                 id: session.user.id, role: session.user.schoolRole as Role },
                 "exams.update",
                 {academicYearId:exam.academicYearId,
                    classId:exam.classId,subjectId:exam.subjectId});

                  if(!allowed)return NextResponse.json({error:"Forbidden"},
                    {status:403});

                   const [updated] = await db
    .update(exams)
    .set({
        name:
            body.name !== undefined
                ? String(body.name).trim()
                : exam.name,
        examDate:
            body.examDate !== undefined
                ? String(body.examDate)
                : exam.examDate,
        maxScore:
            body.maxScore !== undefined
                ? Number(body.maxScore)
                : exam.maxScore,
        type:
            body.type !== undefined
                ? String(body.type)
                : exam.type,
    })
    .where(eq(exams.id, id))
    .returning()

return NextResponse.json(updated)


    } catch(error){return NextResponse.json(
        {error:error instanceof Error?error.message:"Failed to update exam"},{status:500})}
}




export async function DELETE(request: Request) {
    try {
        const session = await (
            await import("@/auth/session")
        ).requirePermission("exams.delete")

        const id = new URL(request.url).searchParams.get("id")

        if (!id) {
            return NextResponse.json(
                { error: "id required" },
                { status: 400 },
            )
        }

        const db = await getSchoolDB()

        const exam = await db.query.exams.findFirst({
            where: eq(exams.id, id),
        })

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 },
            )
        }

        const allowed = await canManageAcademicResource(
            {
                id: session.user.id,
                role: session.user.schoolRole as Role,
            },
            "exams.delete",
            {
                academicYearId: exam.academicYearId,
                classId: exam.classId,
                subjectId: exam.subjectId,
            },
        )

        if (!allowed) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            )
        }

        const gradeCount = await db.query.grades.findMany({
            where: eq(grades.examId, id),
            columns: {
                id: true,
            },
        })

        if (gradeCount.length) {
            return NextResponse.json(
                {
                    error:
                        "Cannot delete an exam that already has grades. Remove or archive its grades first.",
                },
                { status: 409 },
            )
        }

        await db
            .delete(exams)
            .where(eq(exams.id, id))

        return NextResponse.json({
            success: true,
        })
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to delete exam",
            },
            { status: 500 },
        )
    }
}
