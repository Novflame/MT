import { redirect } from "next/navigation";

import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";

import PromotionManager from "@/components/promotion/PromotionManager";

export default async function PromotionPage() {
  const session = await requireSession();

  const role = session.user.schoolRole;

  if (role !== "principal" && role !== "deputy") {
    redirect("/dashboard");
  }

  const db = await getSchoolDB();

  const academicYears =
    await db.query.academicYears.findMany({
      orderBy: (academicYear, { desc }) =>
        desc(academicYear.startDate),
    });

  const classes =
    await db.query.schoolClases.findMany({
      orderBy: (schoolClass, { asc }) =>
        asc(schoolClass.gradeLevel),
    });

  const loadedSubjects =
    await db.query.subjects.findMany({
      orderBy: (subject, { asc }) =>
        asc(subject.name),
    });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <PromotionManager
          academicYears={academicYears}
          classes={classes}
          subjects={loadedSubjects}
        />
      </div>
    </main>
  );
}