import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/auth/auth"
import { getSchoolDB } from "@/db"
import { students, studentUsers } from "@/db/schema"
import { requirePermission } from "@/auth/session"
import { type Role } from "@/auth/permissions"

export async function POST(request: Request) {
  try {
    const session = await requirePermission("users.create")
    const body = await request.json()
    const name = String(body.name ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    const role = String(body.role ?? "") as Role
    const studentId = body.studentId ? String(body.studentId) : null
    if (!name || !email || password.length < 8 || !["parent", "student"].includes(role)) return NextResponse.json({ error: "Valid name, email, password and portal role are required" }, { status: 400 })

    const db = await getSchoolDB()
    if (role === "student") {
      if (!studentId) return NextResponse.json({ error: "Student profile is required" }, { status: 400 })
      const student = await db.query.students.findFirst({ where: eq(students.id, studentId) })
      if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
      const existing = await db.query.studentUsers.findFirst({ where: eq(studentUsers.studentId, studentId) })
      if (existing) return NextResponse.json({ error: "This student already has a portal account" }, { status: 409 })
    }

    const result = await auth.api.signUpEmail({
      body: { name, email, password, schoolId: session.user.schoolId, schoolRole: role },
      headers: { "x-internal-registration-secret": process.env.INTERNAL_REGISTRATION_SECRET ?? "" },
    })
    if (!result?.user) return NextResponse.json({ error: "Failed to create portal user" }, { status: 500 })

    if (role === "student") {
      await db.insert(studentUsers).values({ id: crypto.randomUUID(), userId: result.user.id, studentId: studentId! })
    }
    return NextResponse.json({ success: true, user: { id: result.user.id, name, email, role } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create portal user" }, { status: 500 })
  }
}
