import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";

import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { studentEnrollments } from "@/db/schema";
import { getCertificate } from "@/certificates/get-certificate";

import { CertificateBatchClient } from "./CertificateBatchClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BatchPageProps = {
  searchParams: Promise<{
    academicYearId?: string;
    classId?: string;
    enrollmentIds?: string;
    language?: string;
  }>;
};

export default async function CertificateBatchPage({
  searchParams,
}: BatchPageProps) {
  const session = await requireSession();

  if (
    session.user.schoolRole !== "principal" &&
    session.user.schoolRole !== "deputy"
  ) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const academicYearId = params.academicYearId;
  const classId = params.classId;
  const language =
    params.language === "en" || params.language === "fr"
      ? params.language
      : "ar";

  const enrollmentIds = [
    ...new Set(
      (params.enrollmentIds ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (
    !academicYearId ||
    enrollmentIds.length === 0 ||
    enrollmentIds.length > 150
  ) {
    redirect("/school-certificates");
  }

  const db = await getSchoolDB();

  const conditions = [
    eq(studentEnrollments.academicYearId, academicYearId),
    inArray(studentEnrollments.id, enrollmentIds),
  ];

  if (classId) {
    conditions.push(eq(studentEnrollments.classId, classId));
  }

  const enrollments =
    await db.query.studentEnrollments.findMany({
      where: and(...conditions),
      columns: {
        id: true,
      },
    });

  // لا نسمح بطباعة سجلات من سنة أخرى أو صف آخر.
  if (enrollments.length !== enrollmentIds.length) {
    redirect("/school-certificates");
  }

  const certificates = [];

  for (const enrollmentId of enrollmentIds) {
    const certificate = await getCertificate(
      enrollmentId,
      session,
    );

    certificates.push(certificate);
  }

  return (
    <CertificateBatchClient
      certificates={certificates}
      language={language}
    />
  );
}