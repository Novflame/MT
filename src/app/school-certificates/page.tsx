import { redirect } from "next/navigation";
import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";

import SchoolCertificatesManager from "@/components/school-certificates/SchoolCertificatesManager";

export default async function SchoolCertificatesPage() {
  const session = await requireSession();

  const role = session.user.schoolRole;

  if (role !== "principal" && role !== "deputy") {
    redirect("/dashboard");
  }

  const db = await getSchoolDB();

  const academicYears = await db.query.academicYears.findMany({
    orderBy: (academicYear, { desc }) =>
      desc(academicYear.startDate),
  });

  const classes = await db.query.schoolClases.findMany({
    orderBy: (schoolClass, { asc }) =>
      asc(schoolClass.gradeLevel),
  });

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto w-full max-w-7xl">
        <SchoolCertificatesManager
          academicYears={academicYears.map((year) => ({
            id: year.id,
            name: year.name,
            isActive: year.isActive,
          }))}
          classes={classes.map((schoolClass) => ({
            id: schoolClass.id,
            name: schoolClass.name,
            gradeLevel: schoolClass.gradeLevel,
          }))}
        />
      </div>
    </main>
  );
}