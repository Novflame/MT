import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { centralDb } from "@/db/central";
import { user } from "@/db/centeral-schema";
import { eq } from "drizzle-orm";
import DepartmentHeadsManager from "@/components/department-heads/DepartmentHeadsManager";

export default async function DepartmentHeadsPage() {
  const session = await requirePermission("departments.update");
  const db = await getSchoolDB();
  const departments = await db.query.departments.findMany();
  const staff = await centralDb
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.schoolRole,
    })
    .from(user)
    .where(eq(user.schoolId, session.user.schoolId));
  return (
    <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Heads of Department</h1>
        <p className="mt-2 text-gray-600">
          Assign department leadership for the active academic year.
        </p>
        <DepartmentHeadsManager departments={departments} staff={staff} />
      </div>
    </main>
  );
}
