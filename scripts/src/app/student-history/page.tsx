import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { getStudentFullName } from "@/lib/student-name";
import { resultCertificates } from "@/db/schema";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function StudentHistoryIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLocaleLowerCase();
  const session = await requireSession();
  const role = session.user.schoolRole;
  if (role === "student" || role === "parent") redirect("/dashboard");

  const db = await getSchoolDB();
  const [students, activeYear, decisions, certificates] = await Promise.all([
    db.query.students.findMany({
      with: {
        enrollments: {
          with: { academicYear: true, class: true },
        },
      },
      orderBy: (student, { asc }) => asc(student.firstName),
    }),
    db.query.academicYears.findFirst({
      where: (year, { eq }) => eq(year.isActive, true),
    }),
    db.query.promotionDecisions.findMany({
      with: { academicYear: true },
    }),
    db.select().from(resultCertificates),
  ]);

  const latestDecisionByStudent = new Map<string, (typeof decisions)[number]>();
  const sortedDecisions = [...decisions].sort((a, b) => {
    const yearA = a.academicYear?.startDate ?? "";
    const yearB = b.academicYear?.startDate ?? "";
    return yearB.localeCompare(yearA) || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
  for (const decision of sortedDecisions) {
    if (!latestDecisionByStudent.has(decision.studentId)) latestDecisionByStudent.set(decision.studentId, decision);
  }

  const rows = students.map((student) => {
    const enrollment = student.enrollments.find((item) => item.academicYearId === activeYear?.id);
    const latestDecision = latestDecisionByStudent.get(student.id);
    const decision = latestDecision?.finalDecision.trim().toLowerCase();
    const lifecycle = decision === "graduate"
      ? "Graduate"
      : enrollment
        ? "Enrolled"
        : decision
          ? latestDecision?.finalDecision.replaceAll("_", " ")
          : "No current enrollment";
    const certificateCount = certificates.filter((certificate) =>
      student.enrollments.some((item) => item.id === certificate.enrollmentId),
    ).length;
    return { student, enrollment, latestDecision, lifecycle, certificateCount };
  });

  const filteredRows = query
    ? rows.filter(({ student, enrollment, latestDecision, lifecycle, certificateCount }) =>
        [
          getStudentFullName(student),
          student.admissionNumber,
          enrollment?.class.name,
          lifecycle,
          latestDecision?.finalDecision,
          student.enrollments.map((item) => item.academicYear?.name).join(" "),
          String(certificateCount),
          certificateCount > 0 ? "certificate issued" : "no certificate",
        ].some((value) => value?.toLocaleLowerCase().includes(query)),
      )
    : rows;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Academic records</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Student History</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Open an individual profile to review enrollment history, results, attendance, and recorded promotion decisions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/school-history" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">School History</Link>
            <Link href="/graduates" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Graduates</Link>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "All student profiles", value: rows.length },
            { label: "Enrolled this year", value: rows.filter((row) => row.enrollment).length },
            { label: "Latest decision: graduate", value: rows.filter((row) => row.latestDecision?.finalDecision.trim().toLowerCase() === "graduate").length },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">{item.value.toLocaleString("en")}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-lg font-bold">Student records</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current enrollment is checked against the active academic year. A missing enrollment alone does not mean the student graduated.</p>
            <form method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input name="q" defaultValue={params.q ?? ""} type="search" placeholder="Search name, admission number, class, year, status, or certificate…" aria-label="Search student history" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950" />
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Search</button>
              {query && <Link href="/student-history" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold dark:border-slate-700">Clear</Link>}
            </form>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Showing {filteredRows.length} of {rows.length} students · Certificate counts are based on issued certificates.</p>
          </div>
          {filteredRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">{query ? "No students match your search." : "No student records found."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Admission number</th>
                    <th className="px-5 py-3 font-semibold">Current class</th>
                    <th className="px-5 py-3 font-semibold">Latest academic year</th>
                    <th className="px-5 py-3 font-semibold">Lifecycle status</th>
                    <th className="px-5 py-3 font-semibold">Certificates</th>
                    <th className="px-5 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map(({ student, enrollment, latestDecision, lifecycle, certificateCount }) => {
                    const latestEnrollment = [...student.enrollments].sort((a, b) => (b.academicYear?.startDate ?? "").localeCompare(a.academicYear?.startDate ?? ""))[0];
                    const isGraduate = lifecycle === "Graduate";
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4 font-semibold">{getStudentFullName(student)}</td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{student.admissionNumber}</td>
                        <td className="px-5 py-4">{enrollment?.class.name ?? "—"}</td>
                        <td className="px-5 py-4">{latestEnrollment?.academicYear?.name ?? "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isGraduate ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : enrollment ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {lifecycle}
                          </span>
                          {latestDecision && <p className="mt-1 text-xs text-slate-500">Decision: {latestDecision.finalDecision.replaceAll("_", " ")}</p>}
                        </td>
                        <td className="px-5 py-4">
                          {certificateCount > 0 ? <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">{certificateCount} issued</span> : <span className="text-slate-500">None</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/students/${student.id}`} className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Open history</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
