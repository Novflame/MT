import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import StudentsManager from "@/components/students/StudentsManager"
import { getActiveAcademicYear } from "@/db/academic-year"
import { getStudentFullName } from "@/lib/student-name"
import { classHeads, coreSubjects, departmentHeads, teacherAssignments } from "@/db/schema"
import type { Role } from "@/auth/permissions"

export default async function StudentsPage() {
  const session = await requirePermission("students.read")
  const role = session.user.schoolRole as Role

  // This is an administrative directory, not the student/parent self-service profile.
  if (role === "student") redirect("/student")
  if (role === "parent") redirect("/parent")

  const db = await getSchoolDB()
  const academicYear = await getActiveAcademicYear()
  const [allStudents, classes] = await Promise.all([
    db.query.students.findMany({
      with: {
        parentStudents: { with: { parent: true } },
        enrollments: { with: { class: true, academicYear: true } },
      },
      orderBy: (students, { asc }) => asc(students.firstName),
    }),
    db.query.schoolClases.findMany({ orderBy: (schoolClases, { asc }) => asc(schoolClases.gradeLevel) }),
  ])

  let visibleStudents = allStudents
  let visibleClassIds: Set<string> | null = null
  if (role === "head_of_class") {
    const assignments = await db.query.classHeads.findMany({
      where: and(eq(classHeads.userId, session.user.id), eq(classHeads.academicYearId, academicYear.id)),
    })
    const classIds = new Set(assignments.map((assignment) => assignment.classId))
    visibleClassIds = classIds
    visibleStudents = allStudents.filter((student) => student.enrollments.some((enrollment) =>
      enrollment.academicYearId === academicYear.id && classIds.has(enrollment.classId)
    ))
  } else if (role === "teacher") {
    const assignments = await db.query.teacherAssignments.findMany({
      where: and(eq(teacherAssignments.teacherId, session.user.id), eq(teacherAssignments.academicYearId, academicYear.id)),
    })
    const classIds = new Set(assignments.map((assignment) => assignment.classId))
    visibleClassIds = classIds
    visibleStudents = allStudents.filter((student) => student.enrollments.some((enrollment) =>
      enrollment.academicYearId === academicYear.id && classIds.has(enrollment.classId)
    ))
  } else if (role === "head_of_department") {
    const heads = await db.query.departmentHeads.findMany({
      where: and(eq(departmentHeads.userId, session.user.id), eq(departmentHeads.academicYearId, academicYear.id)),
    })
    const departmentIds = new Set(heads.map((head) => head.departmentId))
    const departmentSubjects = await db.query.subjects.findMany()
    const subjectIds = new Set(departmentSubjects.filter((subject) =>
      subject.departmentId && departmentIds.has(subject.departmentId)
    ).map((subject) => subject.id))
    const core = await db.query.coreSubjects.findMany({
      where: eq(coreSubjects.academicYearId, academicYear.id),
    })
    const classIds = new Set(core.filter((subject) => subjectIds.has(subject.subjectId)).map((subject) => subject.classId))
    visibleClassIds = classIds
    visibleStudents = allStudents.filter((student) => student.enrollments.some((enrollment) =>
      enrollment.academicYearId === academicYear.id && classIds.has(enrollment.classId)
    ))
  } else if (role !== "principal" && role !== "deputy") {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Students</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-300">Manage students within your authorized school scope.</p>
        <div className="mt-8">
          <StudentsManager
            classes={classes.filter((schoolClass) => !visibleClassIds || visibleClassIds.has(schoolClass.id)).map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name, gradeLevel: schoolClass.gradeLevel }))}
            academicYearName={academicYear.name}
            students={visibleStudents.filter((student) => student.status !== "archived").map((student) => {
              const enrollment = student.enrollments.find((item) => item.academicYearId === academicYear.id)
              const parentLink = student.parentStudents[0]
              const parent = parentLink?.parent
              const canSeeParentContact = role === "principal" || role === "deputy" || role === "head_of_class"
              return {
                id: student.id,
                name: getStudentFullName(student),
                parentName: canSeeParentContact ? parent?.name ?? "" : "",
                parentPhone: canSeeParentContact ? parent?.phone ?? "" : "",
                classId: enrollment?.classId ?? "",
                className: enrollment?.class.name ?? "Not enrolled",
              }
            })}
          />
        </div>
      </div>
    </main>
  )
}
