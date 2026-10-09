import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { getStudentFullName } from "@/lib/student-name";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function GraduatesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLocaleLowerCase();
  const session = await requireSession();
  if (session.user.schoolRole !== "principal" && session.user.schoolRole !== "deputy") {
    redirect("/dashboard");
  }

  const db = await getSchoolDB();
  const decisions = await db.query.promotionDecisions.findMany({
    with: {
      student: true,
      academicYear: true,
      fromClass: true,
      toClass: true,
    },
  });

  // The latest recorded decision is the student's current lifecycle outcome.
  // Do not infer graduation merely because a student lacks an active enrollment.
  const latestByStudent = new Map<string, (typeof decisions)[number]>();
  const ordered = [...decisions].sort((a, b) => {
    const yearCompare = (b.academicYear?.startDate ?? "").localeCompare(a.academicYear?.startDate ?? "");
    if (yearCompare !== 0) return yearCompare;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  for (const decision of ordered) {
    if (!latestByStudent.has(decision.studentId)) latestByStudent.set(decision.studentId, decision);
  }

  const allGraduates = [...latestByStudent.values()]
    .filter((decision) => decision.finalDecision.trim().toLowerCase() === "graduate")
    .sort((a, b) => getStudentFullName(a.student).localeCompare(getStudentFullName(b.student)));
  const graduates = query
    ? allGraduates.filter((decision) => [
        getStudentFullName(decision.student),
        decision.student.admissionNumber,
        decision.academicYear?.name,
        decision.fromClass?.name,
        decision.reason,
      ].some((value) => value?.toLocaleLowerCase().includes(query)))
    : allGraduates;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green-700 dark:text-green-400">Student lifecycle</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Graduates</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Students whose latest recorded promotion decision is explicitly marked as graduate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/school-history" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">School History</Link>
            <Link href="/student-history" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Student History</Link>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-900/60 dark:bg-green-950/30">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Confirmed from existing decisions</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-green-900 dark:text-green-200">{allGraduates.length}</p>
          <p className="mt-1 text-sm text-green-800 dark:text-green-300">No new graduate records are created by this page.</p>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-lg font-bold">Graduation records</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Open a student's profile to review their full enrollment and academic history.</p>
            <form method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input name="q" defaultValue={params.q ?? ""} type="search" placeholder="Search name, admission number, year, class, or reason…" aria-label="Search graduates" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950" />
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Search</button>
              {query && <Link href="/graduates" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold dark:border-slate-700">Clear</Link>}
            </form>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Showing {graduates.length} of {allGraduates.length} recorded graduates.</p>
          </div>
          {graduates.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="font-semibold">{query ? "No graduates match your search" : "No confirmed graduates found"}</h3>
              <p className="mt-1 text-sm text-slate-500">A student is not considered a graduate unless a recorded final decision explicitly says “graduate”.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Admission number</th>
                    <th className="px-5 py-3 font-semibold">Graduation year</th>
                    <th className="px-5 py-3 font-semibold">Last class</th>
                    <th className="px-5 py-3 font-semibold">Decision reason</th>
                    <th className="px-5 py-3 text-right font-semibold">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {graduates.map((decision) => (
                    <tr key={decision.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4 font-semibold">{getStudentFullName(decision.student)}</td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{decision.student.admissionNumber}</td>
                      <td className="px-5 py-4">{decision.academicYear?.name ?? "—"}</td>
                      <td className="px-5 py-4">{decision.fromClass?.name ?? "—"}</td>
                      <td className="max-w-64 px-5 py-4 text-slate-600 dark:text-slate-300">{decision.reason?.trim() || "No reason recorded"}</td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/students/${decision.studentId}`} className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">View history</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
