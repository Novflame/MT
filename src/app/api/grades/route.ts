import { NextResponse } from "next/server"
import { and, eq, gte } from "drizzle-orm"
import { getSchoolDB } from "@/db"
import { grades, tests, exams,
   studentEnrollments, studentUsers,parents,
    parentStudents, notifications,
     teacherAssignments, classHeads, departmentHeads } from "@/db/schema"

import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"
import { type Role } from "@/auth/permissions"
import { canManageAcademicResource } from "@/auth/assessment-authorization"

export async function GET(request: Request) {
  try {
    const session = await requireApiPermission(request, "grades.read")
    const db = await getSchoolDB()
    const url = new URL(request.url)
    const assessmentId = url.searchParams.get("assessmentId")
    const type = url.searchParams.get("type")
    let data = await db.query.grades.findMany({
      with: { enrollment: { with: { student: true, class: true } }, test: true, exam: true },
    })

    if (assessmentId) data = data.filter((g) => type === "test" ? g.testId === assessmentId : g.examId === assessmentId)

    if (session.user.schoolRole === "student") {
      const link = await db.query.studentUsers.findFirst({
         where: eq(studentUsers.userId, session.user.id) })
      data = link ? data.filter((g) => g.enrollment?.studentId === link.studentId) : []
    } else if (session.user.schoolRole === "parent")
       {
        const parent = await db.query.parents.findFirst({
          where: eq(
            parents.userId,
            session.user.id
          )
        })
      const links = parent ? await db.query.parentStudents.findMany({
        where: eq(
          parentStudents.parentId,
          parent.id
        )
      }):[]

const ids = new Set(links.map((x) => x.studentId))

      data = data.filter((g) => g.enrollment ? ids.has(g.enrollment.studentId) : false)
    } else if (session.user.schoolRole === "teacher") {
      const assignments = await db.query.teacherAssignments.findMany({ where: eq(teacherAssignments.teacherId, session.user.id) })
      data = data.filter((g) => {
        const assessment = g.test ?? g.exam
        return !!assessment && assignments.some((x) => x.classId === assessment.classId && x.subjectId === assessment.subjectId && x.academicYearId === assessment.academicYearId)
      })
    } else if (session.user.schoolRole === "head_of_class") {
      const heads = await db.query.classHeads.findMany({ where: eq(classHeads.userId, session.user.id) })
      data = data.filter((g) => {
        const assessment = g.test ?? g.exam
        return !!assessment && heads.some((head) => head.classId === assessment.classId && head.academicYearId === assessment.academicYearId)
      })
    } else if (session.user.schoolRole === "head_of_department") {
      const heads = await db.query.departmentHeads.findMany({ where: eq(departmentHeads.userId, session.user.id) })
      const departmentIds = new Set(heads.map((head) => head.departmentId))
      const subjectRows = await db.query.subjects.findMany()
      const subjectIds = new Set(subjectRows.filter((subject) => subject.departmentId && departmentIds.has(subject.departmentId)).map((subject) => subject.id))
      const yearIds = new Set(heads.map((head) => head.academicYearId))
      data = data.filter((grade) => {
        const assessment = grade.test ?? grade.exam
        return !!assessment && subjectIds.has(assessment.subjectId) && yearIds.has(assessment.academicYearId)
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("GET /api/grades failed:", error)
    return NextResponse.json({ error: "Failed to get grades" }, { status: 500 })
  }
}

export async function POST(request: Request) {
    try {
        const session = await requireApiPermission(request, "grades.create")
        const body = await request.json()
        const enrollmentId = String(body.studentEnrollmentId ?? "")
        const testId = body.testId ? String(body.testId) : null
        const examId = body.examId ? String(body.examId) : null
        const score = Number(body.score)

        if (!enrollmentId || (!testId && !examId) || (testId && examId) || !Number.isFinite(score) || score < 0)
           return NextResponse.json({ error: "Invalid grade" }, { status: 400 })

        const db = await getSchoolDB()

        const enrollment = await db.query.studentEnrollments.findFirst({
           where: eq(studentEnrollments.id, enrollmentId) })
        if (!enrollment) 
          return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })

        let academicYearId = enrollment.academicYearId
        let classId = enrollment.classId
        let subjectId = ""
        let maxScore = 0
        if (testId) { const test = await db.query.tests.findFirst({ where: eq(tests.id, testId) }); if (!test)
           return NextResponse.json({ error: "Test not found" },
           { status: 404 }); 
           academicYearId=test.academicYearId;
            classId=test.classId;
             subjectId=test.subjectId;
              maxScore=test.maxScore }
        if (examId) { const exam = await db.query.exams.findFirst({ 
          where: eq(exams.id, examId) }); if (!exam)
             return NextResponse.json({ error: "Exam not found" }, 
            { status: 404 });
             academicYearId=exam.academicYearId;
              classId=exam.classId;
               subjectId=exam.subjectId; maxScore=exam.maxScore }
        if (enrollment.academicYearId !== academicYearId || enrollment.classId !== classId || score > maxScore) 
          return NextResponse.json({ error: "Grade does not match assessment" }, { status: 400 })
        const allowed = await canManageAcademicResource({ id: session.user.id,
           role: session.user.schoolRole as Role }, "grades.create",
            { academicYearId, classId, subjectId })
        if (!allowed) return NextResponse.json({ error: "Forbidden" },
           { status: 403 })
        const existing = await db.query.grades.findFirst({ where: testId ? and(eq(grades.studentEnrollmentId,
           enrollmentId), eq(grades.testId, testId)) : and(eq(grades.studentEnrollmentId,
             enrollmentId),
            eq(grades.examId, examId!)) })
        if (existing) {
            const [updated] = await db.update(grades).set({ score: Math.round(score), note: body.note ? String(body.note) : null, updatedAt: new Date().toISOString() }).where(eq(grades.id, existing.id)).returning()
            await notifyGradeRecipients(db, enrollmentId, `Grade updated`, `A grade was updated for assessment ${testId ?? examId}.`)
            return NextResponse.json(updated)
        }
        const [grade] = await db.insert(grades).values({ id: crypto.randomUUID(), studentEnrollmentId: enrollmentId, testId, examId, score: Math.round(score), note: body.note ? String(body.note) : null, updatedAt: new Date().toISOString() }).returning()
        await notifyGradeRecipients(db, enrollmentId, `New grade posted`, `A new grade has been posted for assessment ${testId ?? examId}.`)
        return NextResponse.json(grade, { status: 201 })
    } catch (error) {
        if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status })
        console.error("POST /api/grades failed:", error)
        return NextResponse.json({ error: "Failed to save grade" }, { status: 500 })
    }
}


async function notifyGradeRecipients(db: Awaited<ReturnType<typeof import("@/db").getSchoolDB>>, enrollmentId: string, title: string, message: string) {
    const enrollment = await db.query.studentEnrollments.findFirst({ where: eq(studentEnrollments.id, enrollmentId) })
    if (!enrollment) return
    const recipients = new Set<string>()
    const student = await db.query.studentUsers.findFirst({ where: eq(studentUsers.studentId, enrollment.studentId) })
    if (student) recipients.add(student.userId)
    const parentLinks = await db.query.parentStudents.findMany({
        where: eq(parentStudents.studentId, enrollment.studentId),
        with: { parent: true },
    })
    parentLinks.forEach((link) => {
        if (link.parent.userId) recipients.add(link.parent.userId)
    })
    if (!recipients.size) return
    const nowDate = new Date()
    const now = nowDate.toISOString()
    const retryWindow = new Date(nowDate.getTime() - 60_000).toISOString()
    const newRecipients: string[] = []
    for (const recipientUserId of recipients) {
        const duplicate = await db.query.notifications.findFirst({
            where: and(
                eq(notifications.recipientUserId, recipientUserId),
                eq(notifications.title, title),
                eq(notifications.message, message),
                gte(notifications.createdAt, retryWindow),
            ),
        })
        if (!duplicate) newRecipients.push(recipientUserId)
    }
    if (!newRecipients.length) return
    await db.insert(notifications).values(newRecipients.map((recipientUserId) => ({
        id: crypto.randomUUID(), recipientUserId, title, message,
        type: "grade", isRead: false, createdAt: now,
    })))
}
