
import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import {
  students,
  teacherAssignments,
  exams,
  tests,
  grades,
  attendance,
} from "@/db/schema";

export default async function AnalyticsPage() {
  await requirePermission("reports.read");

  const db = await getSchoolDB();

  const [studentRows, testRows, examRows, gradeRows, attendanceRows, assignments] =
    await Promise.all([
      db.select().from(students),
      db.select().from(tests),
      db.select().from(exams),
      db.select().from(grades),
      db.select().from(attendance),
      db.select().from(teacherAssignments),
    ]);

  const totalStudents = studentRows.length;
  const totalTests = testRows.length;
  const totalExams = examRows.length;
  const totalGrades = gradeRows.length;
  const totalAttendance = attendanceRows.length;

  const totalTeachers = new Set(
    assignments.map((assignment) => assignment.teacherId),
  ).size;

  const presentCount = attendanceRows.filter(
    (record) => record.status === "present",
  ).length;

  const absentCount = attendanceRows.filter(
    (record) => record.status === "absent",
  ).length;

  const lateCount = attendanceRows.filter(
    (record) => record.status === "late",
  ).length;

  const excusedCount = attendanceRows.filter(
    (record) => record.status === "excused",
  ).length;

  const attendanceRate =
    totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 100)
      : 0;

  const absenceRate =
    totalAttendance > 0
      ? Math.round((absentCount / totalAttendance) * 100)
      : 0;

  const lateRate =
    totalAttendance > 0
      ? Math.round((lateCount / totalAttendance) * 100)
      : 0;

  const attendanceMetrics = [
    { label: "Present", count: presentCount, color: "bg-green-500" },
    { label: "Absent", count: absentCount, color: "bg-red-500" },
    { label: "Late", count: lateCount, color: "bg-amber-500" },
    { label: "Excused", count: excusedCount, color: "bg-blue-500" },
  ];

  return (
    <main className="min-h-dvh bg-gray-50 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page header */}
        <header>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            School-level operational indicators for the available school data.
          </p>
        </header>

        {/* Overview metrics */}
        <section aria-labelledby="overview-heading">
          <SectionHeading
            id="overview-heading"
            title="School Overview"
            description="A summary of students, teaching activity, and recorded grades."
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Metric
              label="Students"
              value={totalStudents}
              description="Students in the school database"
              accent="blue"
            />
            <Metric
              label="Teachers"
              value={totalTeachers}
              description="Unique teachers with assignments"
              accent="indigo"
            />
            <Metric
              label="Tests"
              value={totalTests}
              description="Recorded tests"
              accent="violet"
            />
            <Metric
              label="Exams"
              value={totalExams}
              description="Recorded examinations"
              accent="cyan"
            />
            <Metric
              label="Grades"
              value={totalGrades}
              description="Recorded grade entries"
              accent="amber"
            />
            <Metric
              label="Attendance Records"
              value={totalAttendance}
              description="Total attendance entries"
              accent="green"
            />
          </div>
        </section>

        {/* Attendance summary */}
        <section aria-labelledby="attendance-heading">
          <SectionHeading
            id="attendance-heading"
            title="Attendance Analytics"
            description="Attendance distribution based on recorded attendance statuses."
          />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Attendance Rate
              </p>

              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-4xl font-bold tracking-tight">
                  {attendanceRate}%
                </p>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Present
                </span>
              </div>

              <div
                className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                role="progressbar"
                aria-label="Attendance rate"
                aria-valuenow={attendanceRate}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-green-500 transition-[width]"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {presentCount.toLocaleString()} present out of{" "}
                {totalAttendance.toLocaleString()} recorded entries.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Absence Rate
              </p>

              <p className="mt-3 text-4xl font-bold tracking-tight">
                {absenceRate}%
              </p>

              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {absentCount.toLocaleString()} recorded absences.
              </p>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${absenceRate}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Late Arrivals
              </p>

              <p className="mt-3 text-4xl font-bold tracking-tight">
                {lateRate}%
              </p>

              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {lateCount.toLocaleString()} recorded late arrivals.
              </p>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${lateRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Attendance breakdown */}
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
              <h3 className="font-semibold">Attendance Breakdown</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Count of records for each attendance status.
              </p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {attendanceMetrics.map((metric) => {
                const percentage =
                  totalAttendance > 0
                    ? Math.round((metric.count / totalAttendance) * 100)
                    : 0;

                return (
                  <div
                    key={metric.label}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${metric.color}`}
                    />

                    <span className="min-w-20 flex-1 text-sm font-medium">
                      {metric.label}
                    </span>

                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {percentage}%
                    </span>

                    <span className="w-20 text-right text-sm font-semibold tabular-nums">
                      {metric.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Academic activity */}
        <section aria-labelledby="academic-heading">
          <SectionHeading
            id="academic-heading"
            title="Academic Activity"
            description="Recorded assessment and grading activity."
          />

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:dark:divide-gray-800">
              <ActivityItem
                label="Tests"
                value={totalTests}
                description="Classroom assessments"
              />
              <ActivityItem
                label="Exams"
                value={totalExams}
                description="Recorded examinations"
              />
              <ActivityItem
                label="Grades"
                value={totalGrades}
                description="Recorded grading entries"
              />
            </div>
          </div>
        </section>

        {/* Data scope notice */}
        <footer className="rounded-lg border border-gray-200 bg-gray-100/70 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
          These indicators summarize records currently available in the school
          database. They are not filtered by academic year, class, or term.
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: string | number;
  description: string;
  accent: "blue" | "indigo" | "violet" | "cyan" | "amber" | "green";
}) {
  const accentStyles = {
    blue: "border-l-blue-500",
    indigo: "border-l-indigo-500",
    violet: "border-l-violet-500",
    cyan: "border-l-cyan-500",
    amber: "border-l-amber-500",
    green: "border-l-green-500",
  };

  return (
    <div
      className={`rounded-xl border border-gray-200 border-l-4 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6 ${accentStyles[accent]}`}
    >
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p className="mt-2 break-words text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
        {value.toLocaleString()}
      </p>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

function ActivityItem({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

