import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { grades, students, studentEnrollments, subjects } from "@/db/schema";
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
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="mt-2 text-gray-600">
          Operational and academic reporting.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Students" value={studentsCount.length} />
          <Metric label="Enrollments" value={enrollments.length} />
          <Metric label="Grades" value={gradeRows.length} />
          <Metric label="Subjects" value={subjectsRows.length} />
        </div>
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="text-xl font-semibold">Available reports</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <a className="rounded border p-4 hover:bg-gray-50" href="/results">
              Student results / report cards →
            </a>
            <a
              className="rounded border p-4 hover:bg-gray-50"
              href="/analytics"
            >
              School analytics →
            </a>
            <a
              className="rounded border p-4 hover:bg-gray-50"
              href="/attendance"
            >
              Attendance report →
            </a>
            <a className="rounded border p-4 hover:bg-gray-50" href="/grades">
              Grade entry audit →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
