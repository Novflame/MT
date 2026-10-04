import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"
import { tests, teacherAssignments, grades } from "@/db/schema"
import { requirePermission } from "@/auth/session"
import { type Role } from "@/auth/permissions"
import { canManageAcademicResource } from "@/auth/assessment-authorization"

export async function GET() {
    try {
        const session = await requirePermission("tests.read")
        const db = await getSchoolDB()
        const data = await db.query.tests.findMany({ with: { subject: true, class: true } })
        if (session.user.schoolRole === "principal" || session.user.schoolRole === "deputy" || session.user.schoolRole === "head_of_department") return NextResponse.json(data)
        const visible = data.filter((x) => x.classId && x.subjectId)
        if (session.user.schoolRole === "teacher") {
            const assignments = await db.query.teacherAssignments.findMany({ where: eq(teacherAssignments.teacherId, session.user.id) })
            return NextResponse.json(visible.filter((x) => assignments.some((a) => a.classId === x.classId && a.subjectId === x.subjectId && a.academicYearId === x.academicYearId)))
        }
        return NextResponse.json(visible)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to get tests" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await requirePermission("tests.create")
        const body = await request.json()
        const name = String(body.name ?? "").trim()
        const subjectId = String(body.subjectId ?? "").trim()
        const classId = String(body.classId ?? "").trim()
        const testDate = String(body.testDate ?? "").trim()
        const term = String(body.term ?? "term1").trim()
        const maxScore = Number(body.maxScore)
        if (!name || !subjectId || !classId || !testDate || !Number.isFinite(maxScore) || maxScore <= 0) return NextResponse.json({ error: "Invalid test fields" }, { status: 400 })
        const db = await getSchoolDB()
        const academicYear = await getActiveAcademicYear()
        const allowed = await canManageAcademicResource({ id: session.user.id, role: session.user.schoolRole as Role }, "tests.create", { academicYearId: academicYear.id, classId, subjectId })
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        const [test] = await db.insert(tests).values({ id: crypto.randomUUID(), name, subjectId, classId, academicYearId: academicYear.id, testDate, maxScore: Math.round(maxScore), term }).returning()
        return NextResponse.json(test, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create test" }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await requirePermission("tests.update")
        const body = await request.json(); const id=String(body.id??""); const db=await getSchoolDB(); const test=await db.query.tests.findFirst({where:eq(tests.id,id)}); if(!test)return NextResponse.json({error:"Test not found"},{status:404})
        const allowed=await canManageAcademicResource({ id: session.user.id, role: session.user.schoolRole as Role },"tests.update",{academicYearId:test.academicYearId,classId:test.classId,subjectId:test.subjectId}); if(!allowed)return NextResponse.json({error:"Forbidden"},{status:403})
        const [updated]=await db.update(tests).set({name:body.name!==undefined?String(body.name).trim():test.name,testDate:body.testDate!==undefined?String(body.testDate):test.testDate,maxScore:body.maxScore!==undefined?Number(body.maxScore):test.maxScore,term:body.term!==undefined?String(body.term):test.term}).where(eq(tests.id,id)).returning(); return NextResponse.json(updated)
    } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Failed to update test"},{status:500})}
}
export async function DELETE(request: Request) {
    try {const session=await requirePermission("tests.delete");const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({error:'id required'},{status:400});const db=await getSchoolDB();const test=await db.query.tests.findFirst({where:eq(tests.id,id)});if(!test)return NextResponse.json({error:'Not found'},{status:404});const allowed=await canManageAcademicResource({ id: session.user.id, role: session.user.schoolRole as Role },'tests.delete',{academicYearId:test.academicYearId,classId:test.classId,subjectId:test.subjectId});if(!allowed)return NextResponse.json({error:'Forbidden'},{status:403});const gradeCount=await db.query.grades.findMany({where:eq(grades.testId,id),columns:{id:true}});if(gradeCount.length)return NextResponse.json({error:'Cannot delete a test that already has grades. Remove or archive its grades first.'},{status:409});await db.delete(tests).where(eq(tests.id,id));return NextResponse.json({success:true})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Failed to delete test'},{status:500})}
}
