import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { centralDb } from "@/db/central";
import { user } from "@/db/centeral-schema";
import { eq, and } from "drizzle-orm";
import ParentStudentsManager from "@/components/parent-students/ParentStudentsManager";
import { getStudentFullName } from "@/lib/student-name";
export default async function ParentStudentsPage() {
  const session = await requirePermission("users.update");
  const db = await getSchoolDB();
  const [students, parents] = await Promise.all([
    db.query.students.findMany({
    orderBy: (s, { asc }) =>
        asc(s.firstName),
}),
    centralDb
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(
        and(
          eq(user.schoolId, session.user.schoolId),
          eq(user.schoolRole, "parent"),
        ),
      ),
  ]);
  const studentOptions = students.map(
    (student) => ({
        id: student.id,
        name: getStudentFullName(student),
    }),
)
  return (
    <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Parent / Student Links</h1>
        <p className="mt-2 text-gray-600">
          Link a parent account to one or more students.
        </p>
        <ParentStudentsManager students={studentOptions} parents={parents} />
      </div>
    </main>
  );
}
