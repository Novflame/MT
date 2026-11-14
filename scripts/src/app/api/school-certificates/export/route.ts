import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { centralDb } from "@/db/central";
import { schools, user } from "@/db/centeral-schema";
import {
  academicYears,
  classHeads,
  promotionDecisions,
  studentEnrollments,
} from "@/db/schema";
import { getStudentFullName } from "@/lib/student-name";
import {
  createSchoolCertificatePdf,
  type SchoolCertificateDocument,
  type SchoolCertificateLanguage,
  type SchoolCertificateType,
} from "@/lib/school-certificate-pdf";


const VALID_TYPES = [
  "MID_TERM",
  "SCHOOL_COMPLETION",
  "APPRECIATION_ACHIEVEMENT",
] as const;

function isAdmin(role: string | null | undefined) {
  return role === "principal" || role === "deputy";
}

function isCertificateType(
  value: unknown,
): value is SchoolCertificateType {
  return (
    typeof value === "string" &&
    VALID_TYPES.includes(value as SchoolCertificateType)
  );
}

function ensureLanguage(value: unknown): SchoolCertificateLanguage {
  return value === "ar" || value === "fr" ? value : "en";
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    if (!isAdmin(session.user.schoolRole)) {
      return NextResponse.json(
        { error: "Only the principal or deputy can export certificates." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const academicYearId =
      typeof body.academicYearId === "string" ? body.academicYearId.trim() : "";
    const certificateType = body.certificateType;
    const rawEnrollmentIds: string[] = Array.isArray(body.enrollmentIds)
      ? body.enrollmentIds.filter(
          (id: unknown): id is string =>
            typeof id === "string" && id.trim().length > 0,
        )
      : [];
    const language = ensureLanguage(body.language);
    const notes =
      typeof body.notes === "string" ? body.notes.trim() : null;

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year is required." },
        { status: 400 },
      );
    }

    if (!isCertificateType(certificateType)) {
      return NextResponse.json(
        { error: "Invalid certificate type." },
        { status: 400 },
      );
    }

    if (rawEnrollmentIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one student to export." },
        { status: 400 },
      );
    }

    if (
      certificateType === "APPRECIATION_ACHIEVEMENT" &&
      (!notes || notes.length === 0)
    ) {
      return NextResponse.json(
        { error: "A certificate reason is required for appreciation certificates." },
        { status: 400 },
      );
    }

    const db = await getSchoolDB();

    const academicYear = await db.query.academicYears.findFirst({
      where: eq(academicYears.id, academicYearId),
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found." },
        { status: 404 },
      );
    }

    const uniqueEnrollmentIds: string[] = [...new Set(rawEnrollmentIds)];

    const enrollments = await db.query.studentEnrollments.findMany({
      where: and(
        eq(studentEnrollments.academicYearId, academicYearId),
        inArray(studentEnrollments.id, uniqueEnrollmentIds),
      ),
      with: {
        student: true,
        class: true,
      },
    });

    if (enrollments.length !== uniqueEnrollmentIds.length) {
      return NextResponse.json(
        { error: "One or more selected students do not belong to this academic year." },
        { status: 400 },
      );
    }

    if (certificateType === "SCHOOL_COMPLETION") {
      const classes = await db.query.schoolClases.findMany({
        columns: {
          id: true,
          gradeLevel: true,
        },
      });

      if (classes.length === 0) {
        return NextResponse.json(
          { error: "No school classes were found." },
          { status: 400 },
        );
      }

      const highestGradeLevel = Math.max(
        ...classes.map((schoolClass) => schoolClass.gradeLevel),
      );

      const highestGradeClassIds = new Set(
        classes
          .filter((schoolClass) => schoolClass.gradeLevel === highestGradeLevel)
          .map((schoolClass) => schoolClass.id),
      );

      const eligibleEnrollments = enrollments.filter((enrollment) =>
        highestGradeClassIds.has(enrollment.classId),
      );

      if (eligibleEnrollments.length !== enrollments.length) {
        return NextResponse.json(
          { error: "School completion certificates can only be issued to students in the highest grade." },
          { status: 400 },
        );
      }

      const decisions = await db.query.promotionDecisions.findMany({
        where: and(
          eq(promotionDecisions.academicYearId, academicYearId),
          eq(promotionDecisions.finalDecision, "graduate"),
          inArray(
            promotionDecisions.studentId,
            enrollments.map((enrollment) => enrollment.studentId),
          ),
        ),
      });

      const finalizedGraduateIds = new Set(
        decisions
          .filter((decision) => decision.decidedByUserId !== null)
          .map((decision) => decision.studentId),
      );

      const ineligible = enrollments.filter(
        (enrollment) => !finalizedGraduateIds.has(enrollment.studentId),
      );

      if (ineligible.length > 0) {
        return NextResponse.json(
          { error: "Every selected student must have a finalized administrative graduate decision." },
          { status: 400 },
        );
      }
    }

    const existingSchool = await centralDb.query.schools.findFirst({
      where: eq(schools.id, Number(session.user.schoolId)),
    });

    const schoolName = existingSchool?.name ?? "School";
    const schoolSubtitle = existingSchool?.address ?? "";
    const logoDataUrl = existingSchool?.logo ?? null;

    const certificatePayload: SchoolCertificateDocument[] = [];

    for (const enrollment of enrollments) {
      const classHead = await db.query.classHeads.findFirst({
        where: and(
          eq(classHeads.academicYearId, enrollment.academicYearId),
          eq(classHeads.classId, enrollment.classId),
        ),
      });

      const headTeacher = classHead
        ? await centralDb.query.user.findFirst({
            where: eq(user.id, classHead.userId),
          })
        : null;

      const principalName =
        (await centralDb.query.user.findFirst({
          where: eq(user.id, session.user.id),
        }))?.name ?? "Principal";

      const certificateRecord: SchoolCertificateDocument = {
        certificateType,
        language,
        fullName: getStudentFullName(enrollment.student),
        schoolName,
        schoolSubtitle,
        academicYear: academicYear.name,
        className: enrollment.class.name,
        sectionName: enrollment.class.name,
        admissionNumber: enrollment.student.admissionNumber,
        issueDate: new Date().toISOString(),
        principalName,
        departmentHeadName: headTeacher?.name ?? "Head of Department",
        message:
          certificateType === "APPRECIATION_ACHIEVEMENT"
            ? notes
            : null,
        logoDataUrl,
      };

      certificatePayload.push(certificateRecord);
    }

    const pdfBuffer = await createSchoolCertificatePdf(certificatePayload);
    const fileName = `${certificateType.toLowerCase()}-${academicYearId}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Certificate PDF export error:", error);

    return NextResponse.json(
      { error: "Failed to generate certificate PDF." },
      { status: 500 },
    );
  }
}
