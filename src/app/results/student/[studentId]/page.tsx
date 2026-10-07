
import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { getStudentFullName } from "@/lib/student-name";
import { getLocale } from "@/lib/i18n/server";
import { eq } from "drizzle-orm";
import Link from "next/link";

import {

  exams,

  parentStudents,
  parents,
  studentEnrollments,
  studentUsers,
  teacherAssignments,
} from "@/db/schema";

// ============================================================
// Types
// ============================================================

type ExamResultStatus = "completed" | "missing";

function letterGrade(percent: number) {
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  return "F";
}

// ============================================================
// Localized labels
// ============================================================

const translations = {
  en: {
    school: "School",
    results: "Results",
    studentResults: "Student Results",

    backToResults: "Back to Results",

    student: "Student",
    class: "Class",
    academicYear: "Academic Year",

    subject: "Subject",
    finalExam: "Final Exam",
    score: "Score",
    max: "Max",
    percentage: "Percentage",
    grade: "Grade",
    status: "Status",

    completed: "Completed",
    missing: "Missing",

    finalTotal: "Final Total",
    noExam: "No final exam",
    noGrade: "No grade",

    noResults: "No results available",
    noResultsDescription:
      "There are no final examination results available for this student.",

    studentNotFound: "Student not found",
    studentNotFoundDescription:
      "The requested student could not be found.",

    complete: "Complete",
    incomplete: "Incomplete",
  },

  ar: {
    school: "المدرسة",
    results: "النتائج",
    studentResults: "نتائج الطالب",

    backToResults: "العودة إلى النتائج",

    student: "الطالب",
    class: "الفصل",
    academicYear: "العام الدراسي",

    subject: "المادة",
    finalExam: "الامتحان النهائي",
    score: "الدرجة",
    max: "الحد الأقصى",
    percentage: "النسبة",
    grade: "التقدير",
    status: "الحالة",

    completed: "مكتملة",
    missing: "ناقصة",

    finalTotal: "المجموع النهائي",
    noExam: "لا يوجد امتحان نهائي",
    noGrade: "لا توجد درجة",

    noResults: "لا توجد نتائج متاحة",
    noResultsDescription:
      "لا توجد نتائج امتحانات نهائية متاحة لهذا الطالب.",

    studentNotFound: "الطالب غير موجود",
    studentNotFoundDescription:
      "تعذر العثور على الطالب المطلوب.",

    complete: "مكتملة",
    incomplete: "غير مكتملة",
  },

  fr: {
    school: "École",
    results: "Résultats",
    studentResults: "Résultats de l'élève",

    backToResults: "Retour aux résultats",

    student: "Élève",
    class: "Classe",
    academicYear: "Année scolaire",

    subject: "Matière",
    finalExam: "Examen final",
    score: "Note",
    max: "Maximum",
    percentage: "Pourcentage",
    grade: "Mention",
    status: "Statut",

    completed: "Terminé",
    missing: "Manquant",

    finalTotal: "Total final",
    noExam: "Aucun examen final",
    noGrade: "Aucune note",

    noResults: "Aucun résultat disponible",
    noResultsDescription:
      "Aucun résultat d'examen final n'est disponible pour cet élève.",

    studentNotFound: "Élève introuvable",
    studentNotFoundDescription:
      "L'élève demandé est introuvable.",

    complete: "Complet",
    incomplete: "Incomplet",
  },
} as const;

// ============================================================
// Page
// ============================================================

export default async function StudentResultsPage({
  params,
}: {
  params: Promise<{
    studentId: string;
  }>;
}) {
  const session = await requirePermission("results.read");
  const db = await getSchoolDB();

  const locale = await getLocale();
  const t = translations[locale];

  const { studentId } = await params;
  const role = session.user.schoolRole;

  // ============================================================
  // Check student visibility
  // ============================================================

  if (role === "student") {
    const studentUser = await db.query.studentUsers.findFirst({
      where: eq(studentUsers.userId, session.user.id),
    });

    if (!studentUser || studentUser.studentId !== studentId) {
      throw new Error("Forbidden");
    }
  }

  if (role === "parent") {
    const parent = await db.query.parents.findFirst({
      where: eq(parents.userId, session.user.id),
    });

    if (!parent) {
      throw new Error("Forbidden");
    }

    const child = await db.query.parentStudents.findFirst({
      where: eq(parentStudents.parentId, parent.id),
    });

    const children = await db.query.parentStudents.findMany({
      where: eq(parentStudents.parentId, parent.id),
    });

    const isChild =
      child !== undefined ||
      children.some(
        (item) => item.studentId === studentId,
      );

    if (!isChild) {
      throw new Error("Forbidden");
    }
  }

  // ============================================================
  // Teacher assignments
  // ============================================================

  let teacherAssignmentKeys: Set<string> | null = null;

  if (role === "teacher") {
    const assignments = await db.query.teacherAssignments.findMany({
      where: eq(
        teacherAssignments.teacherId,
        session.user.id,
      ),
    });

    teacherAssignmentKeys = new Set(
      assignments.map(
        (assignment) =>
          `${assignment.academicYearId}:${assignment.classId}:${assignment.subjectId}`,
      ),
    );
  }

  // ============================================================
  // Student enrollments
  // ============================================================

  const enrollments =
    await db.query.studentEnrollments.findMany({
      where: eq(
        studentEnrollments.studentId,
        studentId,
      ),
      with: {
        student: true,
        class: true,
        academicYear: true,
      },
    });

  if (enrollments.length === 0) {
    return (
      <main className="min-h-dvh bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">
              {t.studentNotFound}
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t.studentNotFoundDescription}
            </p>

            <Link
              href="/results"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t.backToResults}
            </Link>
          </section>
        </div>
      </main>
    );
  }

  // ============================================================
  // Load result data
  // ============================================================

  const [
    coreSubjectRows,
    finalExams,
    finalGrades,
  ] = await Promise.all([
    db.query.coreSubjects.findMany(),

    db.query.exams.findMany({
      where: eq(exams.type, "FINAL"),
      with: {
        subject: true,
      },
    }),

    db.query.grades.findMany({
      with: {
        exam: {
          with: {
            subject: true,
          },
        },
      },
    }),
  ]);

  // ============================================================
  // Build lookup maps
  // ============================================================

  const coreSubjectsByClassYear = new Map<
    string,
    typeof coreSubjectRows
  >();

  for (const row of coreSubjectRows) {
    const key =
      `${row.academicYearId}:${row.classId}`;

    const existing =
      coreSubjectsByClassYear.get(key);

    if (existing) {
      existing.push(row);
    } else {
      coreSubjectsByClassYear.set(key, [row]);
    }
  }

  const finalExamsByClassYearSubject = new Map<
    string,
    typeof finalExams
  >();

  for (const exam of finalExams) {
    const key =
      `${exam.academicYearId}:${exam.classId}:${exam.subjectId}`;

    const existing =
      finalExamsByClassYearSubject.get(key);

    if (existing) {
      existing.push(exam);
    } else {
      finalExamsByClassYearSubject.set(key, [exam]);
    }
  }

  for (const examList of finalExamsByClassYearSubject.values()) {
    examList.sort((a, b) =>
      b.examDate.localeCompare(a.examDate),
    );
  }

  const gradesByEnrollment = new Map<
    string,
    typeof finalGrades
  >();

  for (const grade of finalGrades) {
    if (!grade.exam || grade.exam.type !== "FINAL") {
      continue;
    }

    const existing = gradesByEnrollment.get(
      grade.studentEnrollmentId,
    );

    if (existing) {
      existing.push(grade);
    } else {
      gradesByEnrollment.set(
        grade.studentEnrollmentId,
        [grade],
      );
    }
  }

  // ============================================================
  // Build enrollment result groups
  // ============================================================

  const enrollmentResults = enrollments.map(
    (enrollment) => {
      const classYearKey =
        `${enrollment.academicYearId}:${enrollment.classId}`;

      let requiredSubjects =
        coreSubjectsByClassYear.get(classYearKey) ?? [];

      if (teacherAssignmentKeys !== null) {
        requiredSubjects = requiredSubjects.filter(
          (requiredSubject) =>
            teacherAssignmentKeys!.has(
              `${enrollment.academicYearId}:${enrollment.classId}:${requiredSubject.subjectId}`,
            ),
        );
      }

      const studentGrades =
        gradesByEnrollment.get(enrollment.id) ?? [];

      const subjects = requiredSubjects.map(
        (requiredSubject) => {
          const examKey =
            `${enrollment.academicYearId}:${enrollment.classId}:${requiredSubject.subjectId}`;

          const subjectExams =
            finalExamsByClassYearSubject.get(
              examKey,
            ) ?? [];

          const exam = subjectExams[0] ?? null;

          if (!exam) {
            return {
              subjectId: requiredSubject.subjectId,
              subjectName:
                "Unknown",
              examId: null,
              examName: null,
              score: null,
              maxScore: null,
              percentage: null,
              letter: null,
              status:
                "missing" as ExamResultStatus,
            };
          }

          const grade = studentGrades.find(
            (item) => item.examId === exam.id,
          );

          if (!grade) {
            return {
              subjectId: requiredSubject.subjectId,
              subjectName:
                exam.subject?.name ??
                "Unknown",
              examId: exam.id,
              examName: exam.name,
              score: null,
              maxScore: exam.maxScore,
              percentage: null,
              letter: null,
              status:
                "missing" as ExamResultStatus,
            };
          }

          const percentage =
            exam.maxScore > 0
              ? Number(
                  (
                    (grade.score /
                      exam.maxScore) *
                    100
                  ).toFixed(1),
                )
              : 0;

          return {
            subjectId: requiredSubject.subjectId,
            subjectName:
              exam.subject?.name ??
              "Unknown",
            examId: exam.id,
            examName: exam.name,
            score: grade.score,
            maxScore: exam.maxScore,
            percentage,
            letter: letterGrade(
              percentage,
            ),
            status:
              "completed" as ExamResultStatus,
          };
        },
      );

      let earned = 0;
      let possible = 0;

      for (const subject of subjects) {
        if (
          subject.score === null ||
          subject.maxScore === null
        ) {
          continue;
        }

        earned += subject.score;
        possible += subject.maxScore;
      }

      const percentage =
        possible > 0
          ? Number(
              (
                (earned / possible) *
                100
              ).toFixed(1),
            )
          : 0;

      const completedSubjects =
        subjects.filter(
          (subject) =>
            subject.status === "completed",
        ).length;

      const complete =
        subjects.length > 0 &&
        completedSubjects === subjects.length;

      return {
        enrollmentId: enrollment.id,
        academicYearId:
          enrollment.academicYearId,
        academicYearName:
          enrollment.academicYear.name,
        className:
          enrollment.class.name,
        subjects,
        earned,
        possible,
        percentage,
        letter: complete
          ? letterGrade(percentage)
          : null,
        completedSubjects,
        totalSubjects: subjects.length,
        complete,
      };
    },
  );

  // ============================================================
  // Student
  // ============================================================

  const student = enrollments[0].student;
  const studentName =
    getStudentFullName(student);

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="min-h-dvh bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}

        <header className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{t.school}</span>
                <span>/</span>
                <span>{t.results}</span>
                <span>/</span>
                <span>{t.studentResults}</span>
              </div>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                {studentName}
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.student}
              </p>
            </div>

            <Link
              href="/results"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t.backToResults}
            </Link>
          </div>
        </header>

        {/* Results */}

        {enrollmentResults.length === 0 ? (
          <section className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              {t.noResults}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t.noResultsDescription}
            </p>
          </section>
        ) : (
          <div className="space-y-5">
            {enrollmentResults.map((result) => (
              <section
                key={result.enrollmentId}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                {/* Academic year / class header */}

                <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:px-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          {result.academicYearName}
                        </span>

                        <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                          {result.className}
                        </h2>
                      </div>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {result.completedSubjects} /{" "}
                        {result.totalSubjects}{" "}
                        {t.subject}
                      </p>
                    </div>

                    <div
                      className={
                        result.complete
                          ? "rounded-xl bg-emerald-50 px-4 py-2.5 dark:bg-emerald-950/30"
                          : "rounded-xl bg-red-50 px-4 py-2.5 dark:bg-red-950/30"
                      }
                    >
                      <p
                        className={
                          result.complete
                            ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                            : "text-xs font-medium text-red-600 dark:text-red-400"
                        }
                      >
                        {result.complete
                          ? t.completed
                          : t.incomplete}
                      </p>

                      <p
                        className={
                          result.complete
                            ? "mt-0.5 text-lg font-bold text-emerald-700 dark:text-emerald-400"
                            : "mt-0.5 text-lg font-bold text-red-700 dark:text-red-400"
                        }
                      >
                        {result.complete
                          ? `${result.percentage}% ${result.letter}`
                          : `${result.completedSubjects}/${result.totalSubjects}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subject table */}

                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-190 text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white text-start dark:border-slate-800 dark:bg-slate-900">
                        <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 sm:px-5">
                          {t.subject}
                        </th>

                        <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300">
                          {t.finalExam}
                        </th>

                        <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300">
                          {t.score}
                        </th>

                        <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300">
                          {t.max}
                        </th>

                        <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300">
                          {t.percentage}
                        </th>

                        <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300">
                          {t.grade}
                        </th>

                        <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 sm:px-5">
                          {t.status}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {result.subjects.map(
                        (subject) => (
                          <tr
                            key={subject.subjectId}
                            className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                          >
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 sm:px-5">
                              {subject.subjectName}
                            </td>

                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {subject.examName ??
                                t.noExam}
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              {subject.score ??
                                "—"}
                            </td>

                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {subject.maxScore ??
                                "—"}
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              {subject.percentage !==
                              null
                                ? `${subject.percentage}%`
                                : "—"}
                            </td>

                            <td className="px-4 py-3">
                              {subject.letter ? (
                                <span
                                  className={
                                    subject.percentage !==
                                      null &&
                                    subject.percentage >=
                                      50
                                      ? "inline-flex min-w-9 justify-center rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                      : "inline-flex min-w-9 justify-center rounded-lg bg-red-50 px-2 py-1 font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                  }
                                >
                                  {subject.letter}
                                </span>
                              ) : (
                                <span className="text-slate-400">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 sm:px-5">
                              {subject.status ===
                              "completed" ? (
                                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  {t.completed}
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                                  {t.missing}
                                </span>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Total */}

                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-end sm:px-5">
                  <div className="text-start sm:text-end">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {t.finalTotal}
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      {result.earned} /{" "}
                      {result.possible}
                    </p>

                    <p
                      className={
                        result.complete
                          ? "text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                          : "text-sm font-semibold text-red-700 dark:text-red-400"
                      }
                    >
                      {result.complete
                        ? `${result.percentage}% ${result.letter}`
                        : t.incomplete}
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

