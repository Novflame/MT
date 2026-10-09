import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";
import {
  academicYears,
  attendance,
  exams,
  grades,
  promotionDecisions,
  resultCertificates,
  studentEnrollments,
  tests,
} from "@/db/schema";
import { desc } from "drizzle-orm";
import { getStudentFullName } from "@/lib/student-name";

function formatCount(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SchoolHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLocaleLowerCase();
  const session = await requireSession();
  if (session.user.schoolRole !== "principal" && session.user.schoolRole !== "deputy") {
    redirect("/dashboard");
  }

  const db = await getSchoolDB();

  const [
    years,
    enrollments,
    decisions,
    allTests,
    allExams,
    attendanceRecords,
    gradeRecords,
    certificates,
  ] = await Promise.all([
    db.select().from(academicYears).orderBy(desc(academicYears.startDate)),
    db.query.studentEnrollments.findMany({
      with: { student: true, class: true, academicYear: true },
    }),
    db.query.promotionDecisions.findMany({
      with: { student: true, fromClass: true, toClass: true, academicYear: true },
    }),
    db.query.tests.findMany(),
    db.query.exams.findMany(),
    db.query.attendance.findMany(),
    db.query.grades.findMany({ with: { enrollment: true } }),
    db.select().from(resultCertificates),
  ]);

  const yearSummaries = years.map((year) => {
    const yearEnrollments = enrollments.filter((item) => item.academicYearId === year.id);
    const enrollmentIds = new Set(yearEnrollments.map((item) => item.id));
    const studentIds = new Set(yearEnrollments.map((item) => item.studentId));
    const yearDecisions = decisions.filter((item) => item.academicYearId === year.id);
    const promoted = yearDecisions.filter((item) => ["promote", "promoted"].includes(item.finalDecision.trim().toLowerCase())).length;
    const graduated = yearDecisions.filter((item) => item.finalDecision.trim().toLowerCase() === "graduate").length;
    const notPromoted = yearDecisions.filter((item) => ["repeat", "not_promoted", "not promoted", "retain"].includes(item.finalDecision.trim().toLowerCase())).length;
    const yearAttendance = attendanceRecords.filter((item) => enrollmentIds.has(item.studentEnrollmentId)).length;
    const yearGrades = gradeRecords.filter((item) => item.enrollment?.academicYearId === year.id).length;

    return {
      ...year,
      studentCount: studentIds.size,
      enrollmentCount: yearEnrollments.length,
      decisionCount: yearDecisions.length,
      promoted,
      graduated,
      notPromoted,
      tests: allTests.filter((item) => item.academicYearId === year.id).length,
      exams: allExams.filter((item) => item.academicYearId === year.id).length,
      attendance: yearAttendance,
      grades: yearGrades,
      certificates: certificates.filter((item) => item.academicYearId === year.id).length,
      enrollmentRows: yearEnrollments,
      decisionRows: yearDecisions,
    };
  });

  const filteredYearSummaries = query
    ? yearSummaries.filter((year) => [
        year.name,
        year.startDate,
        year.endDate,
        ...year.enrollmentRows.flatMap((item) => [getStudentFullName(item.student), item.student.admissionNumber, item.class.name]),
        ...year.decisionRows.flatMap((item) => [getStudentFullName(item.student), item.student.admissionNumber, item.fromClass?.name, item.toClass?.name, item.finalDecision, item.reason]),
      ].some((value) => value?.toLocaleLowerCase().includes(query)))
    : yearSummaries;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Academic archive</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">School History</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Browse academic-year records without changing the active year or modifying historical data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/student-history" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Student History</Link>
            <Link href="/graduates" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Graduates</Link>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Academic years", value: years.length },
            { label: "Enrollment records", value: enrollments.length },
            { label: "Promotion decisions", value: decisions.length },
            { label: "Result certificates", value: certificates.length },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">{formatCount(item.value)}</p>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Academic year archive</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Counts are calculated from existing enrollment, assessment, attendance, certificate, and decision records.</p>
            <form method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input name="q" defaultValue={params.q ?? ""} type="search" placeholder="Search academic year, student, admission number, class, or decision…" aria-label="Search school history" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950" />
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Search</button>
              {query && <Link href="/school-history" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold dark:border-slate-700">Clear</Link>}
            </form>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Showing {filteredYearSummaries.length} of {yearSummaries.length} academic years. Searching a student also shows the academic years containing their records.</p>
          </div>

          {filteredYearSummaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold">{query ? "No matching academic history found" : "No academic years found"}</h3>
              <p className="mt-1 text-sm text-slate-500">{query ? "Try a different search term." : "There are no academic-year records to display."}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredYearSummaries.map((year) => (
                <article key={year.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{year.name}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${year.isActive ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {year.isActive ? "Active year" : "Inactive year"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{year.startDate} — {year.endDate}</p>
                    </div>
                    <p className="text-sm text-slate-500">Student records: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCount(year.studentCount)}</span></p>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-3 xl:grid-cols-6">
                    {[
                      ["Enrollments", year.enrollmentCount],
                      ["Decisions", year.decisionCount],
                      ["Promoted", year.promoted],
                      ["Graduated", year.graduated],
                      ["Tests / exams", year.tests + year.exams],
                      ["Grades", year.grades],
                      ["Attendance entries", year.attendance],
                      ["Certificates", year.certificates],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-white p-4 dark:bg-slate-900">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{formatCount(Number(value))}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-4 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Tests: <strong className="text-slate-900 dark:text-slate-100">{year.tests}</strong></span>
                    <span className="text-slate-600 dark:text-slate-400">Exams: <strong className="text-slate-900 dark:text-slate-100">{year.exams}</strong></span>
                    <span className="text-slate-600 dark:text-slate-400">Not promoted / repeat: <strong className="text-red-700 dark:text-red-300">{year.notPromoted}</strong></span>
                  </div>

                  <details className="border-t border-slate-200 dark:border-slate-800">
                    <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-blue-700 hover:bg-slate-50 dark:text-blue-300 dark:hover:bg-slate-800/50">
                      View year records ({year.enrollmentRows.length} enrollments, {year.decisionRows.length} decisions)
                    </summary>
                    <div className="grid gap-5 p-5 xl:grid-cols-2">
                      <section className="min-w-0">
                        <h4 className="mb-3 font-semibold">Student enrollments</h4>
                        {year.enrollmentRows.length === 0 ? (
                          <p className="text-sm text-slate-500">No enrollment records for this year.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full min-w-140 text-left text-sm">
                              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/70">
                                <tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">Admission no.</th><th className="px-3 py-2">Class</th><th className="px-3 py-2">Profile</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {year.enrollmentRows.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-3 py-2 font-medium">{getStudentFullName(item.student)}</td>
                                    <td className="px-3 py-2">{item.student.admissionNumber}</td>
                                    <td className="px-3 py-2">{item.class.name}</td>
                                    <td className="px-3 py-2"><Link className="font-semibold text-blue-700 hover:underline dark:text-blue-300" href={`/students/${item.studentId}`}>Open</Link></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                      <section className="min-w-0">
                        <h4 className="mb-3 font-semibold">Promotion and graduation decisions</h4>
                        {year.decisionRows.length === 0 ? (
                          <p className="text-sm text-slate-500">No decisions recorded for this year.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full min-w-140 text-left text-sm">
                              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/70">
                                <tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">From</th><th className="px-3 py-2">Decision</th><th className="px-3 py-2">To</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {year.decisionRows.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-3 py-2 font-medium">{getStudentFullName(item.student)}</td>
                                    <td className="px-3 py-2">{item.fromClass?.name ?? "—"}</td>
                                    <td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.finalDecision.trim().toLowerCase() === "graduate" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : ["retain", "repeat", "not_promoted", "not promoted"].includes(item.finalDecision.trim().toLowerCase()) ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"}`}>{item.finalDecision.replaceAll("_", " ")}</span></td>
                                    <td className="px-3 py-2">{item.toClass?.name ?? (item.finalDecision.trim().toLowerCase() === "graduate" ? "Graduated" : "—")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          This archive is read-only. The current schema marks a year as active or inactive; it does not contain a separate formal “closed at” record, so an inactive year is not automatically labelled as formally closed.
        </p>
      </div>
    </main>
  );
}
