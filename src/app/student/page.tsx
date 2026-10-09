import { redirect } from "next/navigation";
import { requireSession } from "@/auth/session";
import { getSchoolDB, getActiveAcademicYear } from "@/db";
import { getStudentFullName } from "@/lib/student-name";
export default async function StudentPortal() {
  const session = await requireSession();
  if (session.user.schoolRole !== "student") redirect("/");
  const db = await getSchoolDB();
  const year = await getActiveAcademicYear();
  const link = await db.query.studentUsers.findFirst({
    where: (s, { eq }) => eq(s.userId, session.user.id),
    with: { student: { with: { enrollments: { with: { class: true } } } } },
  });
  const student = link?.student;
  if (!student)
    return (
      <main className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="mx-auto max-w-4xl rounded-lg border bg-white p-4 sm:p-6">
          Your student profile is not linked yet.
        </div>
      </main>
    );
  const enrollment =
    student.enrollments.find((e) => e.academicYearId === year.id) ??
    student.enrollments[0];
  const grades = enrollment
    ? await db.query.grades.findMany({
        where: (g, { eq }) => eq(g.studentEnrollmentId, enrollment.id),
        with: { test: true, exam: true },
      })
    : [];
  const attendance = enrollment
    ? await db.query.attendance.findMany({
        where: (a, { eq }) => eq(a.studentEnrollmentId, enrollment.id),
      })
    : [];
  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="mx-auto min-w-0 max-w-5xl">
        <h1 className="break-words text-2xl font-bold sm:text-3xl">Student Portal</h1>
        <p className="mt-2 break-words text-gray-600">Welcome, {getStudentFullName(student)}.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric l="Class" v={enrollment?.class.name ?? "—"} />
          <Metric l="Grades" v={grades.length} />
          <Metric
            l="Attendance"
            v={`${attendance.filter((a) => a.status === "present").length}/${attendance.length}`}
          />
        </div>
        <section className="mt-6 rounded-lg border bg-white p-4 sm:p-6">
          <h2 className="text-xl font-semibold">My grades</h2>
          <div className="mt-4 space-y-2">
            {grades.map((g) => (
              <div key={g.id} className="flex min-w-0 items-start justify-between gap-3 border-b py-2">
                <span className="min-w-0 break-words">{g.test?.name ?? g.exam?.name}</span>
                <strong className="shrink-0 whitespace-nowrap">
                  {g.score}/{g.test?.maxScore ?? g.exam?.maxScore}
                </strong>
              </div>
            ))}
            {grades.length === 0 && (
              <p className="text-gray-500">No grades yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
function Metric({ l, v }: { l: string; v: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="text-sm text-gray-500">{l}</div>
      <div className="mt-1 text-2xl font-bold">{v}</div>
    </div>
  );
}
