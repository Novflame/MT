import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";

import { getStudentFullName } from "@/lib/student-name";
export default async function AttendanceReportPage() {
  await requirePermission("attendance.read");
  const db = await getSchoolDB();
  const rows = await db.query.attendance.findMany({
    with: {
      studentEnrollment: {
        with: { student: true, class: true },
      },
    },
  });

  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Attendance Report</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Total records" value={rows.length} />
          <Metric label="Present" value={present} />
          <Metric label="Absent" value={absent} />
        </div>
        <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">Date</th>
                <th className="p-3">Student</th>
                <th className="p-3">Class</th>
                <th className="p-3">Status</th>
                <th className="p-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-3">{r.date}</td>

                  <td className="p-3">
                    {r.studentEnrollment?.student &&
                      getStudentFullName(r.studentEnrollment.student)}
                  </td>
                  <td className="p-3">{r.studentEnrollment?.class.name}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3">{r.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-6 text-gray-500">No attendance records.</p>
          )}
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
