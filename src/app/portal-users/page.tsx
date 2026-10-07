import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
// import { studentUsers } from "@/db/schema";
import PortalUsersManager from "@/components/portal-users/PortalUsersManager";
import { getStudentFullName } from "@/lib/student-name";
export default async function PortalUsersPage() {
  await requirePermission("users.create");
  const db = await getSchoolDB();
  const [students, links] = await Promise.all([
    db.query.students.findMany({ orderBy: (s, { asc }) => asc(s.firstName) }),
    db.query.studentUsers.findMany(),
  ]);
  const linked = new Set(links.map((x) => x.studentId));
  return (
    <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Portal Accounts</h1>
        <p className="mt-2 text-gray-600">
          Create parent and student login accounts.
        </p>
        <PortalUsersManager
          students={students.map((s) => ({
            id: s.id,
            name: getStudentFullName(s),
            userId: linked.has(s.id) ? "linked" : null,
          }))}
        />
      </div>
    </main>
  );
}
