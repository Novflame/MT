
import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import {
  grades,
  students,
  studentEnrollments,
  subjects,
} from "@/db/schema";

const reportLinks = [
  {
    title: "Student Results",
    description:
      "Review student results and access academic report cards.",
    href: "/results",
    category: "ACADEMIC",
  },
  {
    title: "School Analytics",
    description:
      "Explore academic performance and school-wide statistics.",
    href: "/analytics",
    category: "ANALYTICS",
  },
  {
    title: "Attendance Report",
    description:
      "Review student attendance records and attendance patterns.",
    href: "/attendance",
    category: "ATTENDANCE",
  },
  {
    title: "Grade Entry Audit",
    description:
      "Review recorded grades and check assessment entries.",
    href: "/grades",
    category: "ASSESSMENTS",
  },
];

export default async function ReportsPage() {
  await requirePermission("reports.read");

  const db = await getSchoolDB();

  const [studentsCount, enrollments, gradeRows, subjectsRows] =
    await Promise.all([
      db.select().from(students),
      db.select().from(studentEnrollments),
      db.select().from(grades),
      db.select().from(subjects),
    ]);

  const metrics = [
    {
      label: "Total Students",
      value: studentsCount.length,
      description: "Registered students",
      accent: "border-l-blue-500",
    },
    {
      label: "Enrollments",
      value: enrollments.length,
      description: "Student class enrollments",
      accent: "border-l-indigo-500",
    },
    {
      label: "Recorded Grades",
      value: gradeRows.length,
      description: "Assessment grade records",
      accent: "border-l-emerald-500",
    },
    {
      label: "Subjects",
      value: subjectsRows.length,
      description: "Available school subjects",
      accent: "border-l-amber-500",
    },
  ];

  return (
    <main className="min-h-dvh bg-gray-50 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              School Management
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Reports
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
              Access academic records, attendance reports, and school
              performance information from one place.
            </p>
          </div>

          <div className="w-fit rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Available Reports
            </p>
            <p className="mt-1 text-2xl font-bold">{reportLinks.length}</p>
          </div>
        </header>

        <section
          aria-labelledby="overview-heading"
          className="mt-8"
        >
          <div className="mb-4">
            <h2 id="overview-heading" className="text-lg font-semibold">
              School Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Summary of the records currently stored in the system.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <Metric
                key={metric.label}
                label={metric.label}
                value={metric.value}
                description={metric.description}
                accent={metric.accent}
              />
            ))}
          </div>
        </section>

        <section
          aria-labelledby="reports-heading"
          className="mt-10"
        >
          <div className="mb-5">
            <h2 id="reports-heading" className="text-xl font-bold">
              Available Reports
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a report to open its corresponding section.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {reportLinks.map((report, index) => (
              <a
                key={report.href}
                href={report.href}
                className="group flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-gray-900/80 dark:focus-visible:ring-offset-gray-950 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      {report.category}
                    </span>

                    <h3 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
                      {report.title}
                    </h3>
                  </div>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <p className="mt-3 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {report.description}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Open report
                  </span>

                  <span className="font-semibold text-blue-700 transition-transform group-hover:translate-x-1 dark:text-blue-400">
                    →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-gray-200 pt-4 dark:border-gray-800">
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
            Summary figures represent the records currently stored in the
            system. They are record counts, not necessarily counts of unique
            students or active enrollments.
          </p>
        </footer>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  accent: string;
}) {
  return (
    <article
      className={`min-w-0 rounded-xl border border-gray-200 border-l-4 ${accent} bg-white p-5 shadow-sm dark:border-gray-800 dark:border-l-4 dark:bg-gray-900`}
    >
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}
      </p>

      <p className="mt-3 break-words text-3xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </p>

      <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </article>
  );
}

