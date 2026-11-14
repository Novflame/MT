import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { getSchoolDB, getActiveAcademicYear } from "@/db"
import { departmentHeads } from "@/db/schema"
import { requirePermission } from "@/auth/session"

export async function GET() { try { await requirePermission("departments.read"); const db=await getSchoolDB(); return NextResponse.json(await db.query.departmentHeads.findMany({ with:{ department:true } })) } catch(error){ return NextResponse.json({error:error instanceof Error?error.message:"Failed"},{status:500}) } }
export async function POST(request: Request) { try { await requirePermission("departments.update"); const db=await getSchoolDB(); const body=await request.json(); const academicYear=await getActiveAcademicYear(); const userId=String(body.userId??""); const departmentId=String(body.departmentId??""); if(!userId||!departmentId)return NextResponse.json({error:"User and department are required"},{status:400}); const existing=await db.query.departmentHeads.findFirst({where:and(eq(departmentHeads.academicYearId,academicYear.id),eq(departmentHeads.departmentId,departmentId))}); if(existing) await db.delete(departmentHeads).where(and(eq(departmentHeads.academicYearId,academicYear.id),eq(departmentHeads.departmentId,departmentId))); const [row]=await db.insert(departmentHeads).values({academicYearId:academicYear.id,userId,departmentId}).returning(); return NextResponse.json(row,{status:201}) } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Failed"},{status:500})} }
