import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";
// import { parents } from "@/db/schema";
import { getStudentFullName } from "@/lib/student-name"
export default async function ReportCardsPage() {
  const session = await requireSession();
  const db = await getSchoolDB();
  let enrollments = await db.query.studentEnrollments.findMany({
    with: { student: true, class: true },
  });
  if (session.user.schoolRole === "parent") {

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
        })
        : []

enrollments =
    enrollments.filter((enrollment) =>
        links.some(
            (link) =>
                link.studentId ===
                enrollment.studentId,
        ),
    )

    
  }
  if (session.user.schoolRole === "student") {
    const link = await db.query.studentUsers.findFirst({
      where: (s, { eq }) => eq(s.userId, session.user.id),
    });
    enrollments = enrollments.filter((e) => e.studentId === link?.studentId);
  }
  const grades = await db.query.grades.findMany({
    with: { test: true, exam: true },
  });
  return (
    <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Report Cards</h1>
        <div className="mt-6 space-y-6">
          {enrollments.map((e) => {
            const gs = grades.filter((g) => g.studentEnrollmentId === e.id);
            const possible = gs.reduce(
              (a, g) => a + (g.test?.maxScore ?? g.exam?.maxScore ?? 0),
              0,
            );
            const earned = gs.reduce((a, g) => a + g.score, 0);
            const pct = possible ? Math.round((earned / possible) * 100) : 0;
            return (
              <article key={e.id} className="min-w-0 rounded-lg border bg-white p-4 sm:p-8">
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="break-words text-2xl font-bold">{getStudentFullName(
                      e.student
                    )}</h2>
                    <p>{e.class.name}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-3xl font-bold">{pct}%</div>
                    <div>Overall performance</div>
                  </div>
                </div>
                <div className="mt-5 max-w-full overflow-x-auto">
                <table className="w-full min-w-120 text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Assessment</th>
                      <th>Type</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gs.map((g) => (
                      <tr className="border-b" key={g.id}>
                        <td className="py-2">{g.test?.name ?? g.exam?.name}</td>
                        <td>{g.test ? "Test" : "Exam"}</td>
                        <td>
                          {g.score}/{g.test?.maxScore ?? g.exam?.maxScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </article>
            );
          })}
          {enrollments.length === 0 && (
            <div className="rounded-lg border bg-white p-6 text-gray-500">
              No report cards available.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
