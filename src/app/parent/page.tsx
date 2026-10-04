import { redirect } from "next/navigation";
import { requireSession } from "@/auth/session";
import { getSchoolDB, getActiveAcademicYear } from "@/db";
import {
 
} from "@/db/schema";
import { getStudentFullName } from "@/lib/student-name"
export default async function ParentPortal() {
  const session = await requireSession();
  if (session.user.schoolRole !== "parent") redirect("/");
  const db = await getSchoolDB();
  const year = await getActiveAcademicYear();

const parent =
    await db.query.parents.findFirst({
        where: (p, { eq }) =>
            eq(
                p.userId,
                session.user.id,
            ),
    })

const links =
    parent
        ? await db.query.parentStudents.findMany({
            where: (p, { eq }) =>
                eq(
                    p.parentId,
                    parent.id,
                ),
            with: {
                student: true,
            },
        })
        : []



  const children = await Promise.all(
    links.map(async (l) => {
      const enrollment = await db.query.studentEnrollments.findFirst({
        where: (e, { and, eq }) =>
          and(eq(e.studentId, l.studentId), eq(e.academicYearId, year.id)),
        orderBy: (e, { desc }) => desc(e.academicYearId),
        with: { class: true },
      });
      const gs = enrollment
        ? await db.query.grades.findMany({
            where: (g, { eq }) => eq(g.studentEnrollmentId, enrollment.id),
          })
        : [];
      const at = enrollment
        ? await db.query.attendance.findMany({
            where: (a, { eq }) => eq(a.studentEnrollmentId, enrollment.id),
          })
        : [];
      return { ...l.student, enrollment, grades: gs, attendance: at };
    }),
  );
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Parent Portal</h1>
        <p className="mt-2 text-gray-600">
          Monitor your children’s attendance and academic progress.
        </p>
        <div className="mt-6 space-y-5">
          {children.map((c) => (
            <section key={c.id} className="rounded-lg border bg-white p-6">
              <div className="flex justify-between">
                <div>
<h2 className="text-xl font-semibold">
  {getStudentFullName(c)}
</h2>                  <p className="text-gray-500">
                    {c.enrollment?.class.name ?? "No active enrollment"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{c.grades.length} grades</div>
                  <div className="text-sm text-gray-500">
                    {c.attendance.length} attendance records
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded border p-3">
                  Grades
                  <br />
                  <strong>{c.grades.length}</strong>
                </div>
                <div className="rounded border p-3">
                  Present
                  <br />
                  <strong>
                    {c.attendance.filter((a) => a.status === "present").length}
                  </strong>
                </div>
                <div className="rounded border p-3">
                  Absent
                  <br />
                  <strong>
                    {c.attendance.filter((a) => a.status === "absent").length}
                  </strong>
                </div>
              </div>
            </section>
          ))}
          {children.length === 0 && (
            <div className="rounded-lg border bg-white p-6 text-gray-500">
              No children are linked to this account yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
