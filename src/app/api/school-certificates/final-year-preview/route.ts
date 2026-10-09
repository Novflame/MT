import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { requireSession } from "@/auth/session";
import { getSchoolDB } from "@/db";
import {
  academicYears,
  studentEnrollments,
} from "@/db/schema";
import { getStudentFullName } from "@/lib/student-name";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireSession();

    if (
      session.user.schoolRole !== "principal" &&
      session.user.schoolRole !== "deputy"
    ) {
      return NextResponse.json(
        { error: "غير مصرح لك بإدارة الشهادات." },
        { status: 403 },
      );
    }

    const params = new URL(request.url).searchParams;
    const academicYearId = params.get("academicYearId");
    const classId = params.get("classId");

    if (!academicYearId) {
      return NextResponse.json(
        { error: "يرجى اختيار السنة الدراسية." },
        { status: 400 },
      );
    }

    const db = await getSchoolDB();

    const academicYear =
      await db.query.academicYears.findFirst({
        where: eq(academicYears.id, academicYearId),
      });

    if (!academicYear) {
      return NextResponse.json(
        { error: "السنة الدراسية غير موجودة." },
        { status: 404 },
      );
    }

    const enrollments =
      await db.query.studentEnrollments.findMany({
        where: classId
          ? and(
              eq(
                studentEnrollments.academicYearId,
                academicYearId,
              ),
              eq(studentEnrollments.classId, classId),
            )
          : eq(
              studentEnrollments.academicYearId,
              academicYearId,
            ),
        with: {
          student: true,
          class: true,
        },
      });

    const students = enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentId: enrollment.student.id,
      admissionNumber:
        enrollment.student.admissionNumber,
      fullName: getStudentFullName(
        enrollment.student,
      ),
      class: enrollment.class,
      alreadyIssued: false,
      certificateId: null,
      issuedAt: null,
    }));

    return NextResponse.json({
      academicYear: {
        id: academicYear.id,
        name: academicYear.name,
        isActive: academicYear.isActive,
      },
      certificateType: "FINAL_YEAR",
      students,
      eligibleCount: students.length,
    });
  } catch (error) {
    console.error(
      "Final-year certificate preview error:",
      error,
    );

    return NextResponse.json(
      { error: "تعذر تحميل قائمة الطلاب." },
      { status: 500 },
    );
  }
}