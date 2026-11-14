
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
  studentUsers,
  teacherAssignments,
} from "@/db/schema";

// ============================================================
// Letter grade
// ============================================================

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

const resultTranslations = {
  en: {
    school: "School",
    results: "Results",
    myResults: "My Results",
    studentsResults: "Students Results",
    finalResults: "Final Results",

    myFinalResultsDescription: "Your final examination results.",
    studentsFinalResultsDescription:
      "Final examination results for the students linked to you.",
    teacherFinalResultsDescription:
      "Final examination results for your assigned classes and subjects.",
    finalResultsDescription: "Final examination results.",

    examResults: "Exam Results",

    students: "Students",
    complete: "Complete",
    incomplete: "Incomplete",
    final: "Final",
    examination: "Examination",

    class: "Class",
    student: "Student",
    subjects: "Subjects",

    result: "Result",
    status: "Status",
    action: "Action",
    viewResults: "View Results",

    noResultsAvailable: "No results available",
    noResultsDescription:
      "Final examination results have not been published yet.",
  },

  ar: {
    school: "المدرسة",
    results: "النتائج",
    myResults: "نتائجي",
    studentsResults: "نتائج الطلاب",
    finalResults: "النتائج النهائية",

    myFinalResultsDescription: "نتائج امتحاناتك النهائية.",
    studentsFinalResultsDescription:
      "نتائج الامتحانات النهائية للطلاب المرتبطين بك.",
    teacherFinalResultsDescription:
      "نتائج الامتحانات النهائية للفصول والمواد المسندة إليك.",
    finalResultsDescription: "نتائج الامتحانات النهائية.",

    examResults: "نتائج الامتحانات",

    students: "الطلاب",
    complete: "مكتملة",
    incomplete: "غير مكتملة",
    final: "نهائي",
    examination: "امتحان",

    class: "الفصل",
    student: "الطالب",
    subjects: "المواد",

    result: "النتيجة",
    status: "الحالة",
    action: "الإجراء",
    viewResults: "عرض النتائج",

    noResultsAvailable: "لا توجد نتائج متاحة",
    noResultsDescription:
      "لم يتم نشر نتائج الامتحانات النهائية بعد.",
  },

  fr: {
    school: "École",
    results: "Résultats",
    myResults: "Mes résultats",
    studentsResults: "Résultats des élèves",
    finalResults: "Résultats finaux",

    myFinalResultsDescription: "Vos résultats des examens finaux.",
    studentsFinalResultsDescription:
      "Résultats des examens finaux des élèves qui vous sont liés.",
    teacherFinalResultsDescription:
      "Résultats des examens finaux pour vos classes et matières attribuées.",
    finalResultsDescription: "Résultats des examens finaux.",

    examResults: "Résultats des examens",

    students: "Élèves",
    complete: "Complets",
    incomplete: "Incomplets",
    final: "Final",
    examination: "Examen",

    class: "Classe",
    student: "Élève",
    subjects: "Matières",

    result: "Résultat",
    status: "Statut",
    action: "Action",
    viewResults: "Voir les résultats",

    noResultsAvailable: "Aucun résultat disponible",
    noResultsDescription:
      "Les résultats des examens finaux n'ont pas encore été publiés.",
  },
} as const;

// ============================================================
// Results page
// ============================================================

export default async function ResultsPage() {
  const session = await requirePermission("results.read");
  const db = await getSchoolDB();

  const locale = await getLocale();
  const t = resultTranslations[locale];

  const role = session.user.schoolRole;

  // ============================================================
  // Student / parent visibility
  // ============================================================

  let allowedStudentIds: Set<string> | null = null;

  if (role === "student") {
    const studentUser = await db.query.studentUsers.findFirst({
      where: eq(studentUsers.userId, session.user.id),
    });

    allowedStudentIds = new Set(
      studentUser ? [studentUser.studentId] : [],
    );
  }

  if (role === "parent") {
    const parent = await db.query.parents.findFirst({
      where: eq(parents.userId, session.user.id),
    });

    if (!parent) {
      allowedStudentIds = new Set();
    } else {
      const children = await db.query.parentStudents.findMany({
        where: eq(parentStudents.parentId, parent.id),
      });

      allowedStudentIds = new Set(
        children.map((child) => child.studentId),
      );
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
  // Load data
  //
  // IMPORTANT:
  // Final result completeness is based on actual FINAL exams
  // for the student's class and academic year.
  //
  // We intentionally do NOT use coreSubjects here because an
  // empty coreSubjects configuration must not turn every real
  // final result into "incomplete".
  // ============================================================

  const [enrollments, finalExams, finalGrades] =
    await Promise.all([
      db.query.studentEnrollments.findMany({
        with: {
          student: true,
          class: true,
        },
      }),

      db.query.exams.findMany({
        where: eq(exams.type, "FINAL"),
        with: {
          subject: true,
        },
      }),

      db.query.grades.findMany({
        with: {
          exam: true,
        },
      }),
    ]);

  // ============================================================
  // Final exams by class / academic year / subject
  // ============================================================

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

  // Use the latest final exam when more than one exists for
  // the same academic year / class / subject.
  for (const examsForSubject of finalExamsByClassYearSubject.values()) {
    examsForSubject.sort((a, b) =>
      b.examDate.localeCompare(a.examDate),
    );
  }

  // ============================================================
  // Final grades by enrollment
  // ============================================================

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
  // Visible enrollments
  // ============================================================

  const visibleEnrollments = enrollments.filter(
    (enrollment) => {
      if (
        allowedStudentIds !== null &&
        !allowedStudentIds.has(enrollment.studentId)
      ) {
        return false;
      }

      if (teacherAssignmentKeys !== null) {
        const hasClassAssignment = Array.from(
          teacherAssignmentKeys,
        ).some((key) =>
          key.startsWith(
            `${enrollment.academicYearId}:${enrollment.classId}:`,
          ),
        );

        if (!hasClassAssignment) {
          return false;
        }
      }

      return true;
    },
  );

  // ============================================================
  // Build student summary rows
  // ============================================================

  const results = visibleEnrollments.map((enrollment) => {
    const studentGrades =
      gradesByEnrollment.get(enrollment.id) ?? [];

    /*
     * Find every actual FINAL exam for this student's
     * academic year and class.
     *
     * This replaces the previous coreSubjects-based logic.
     */
    const requiredExamEntries = Array.from(
      finalExamsByClassYearSubject.entries(),
    )
      .filter(([key, examsForSubject]) => {
        if (examsForSubject.length === 0) {
          return false;
        }

        const [
          academicYearId,
          classId,
        ] = key.split(":");

        if (
          academicYearId !== enrollment.academicYearId ||
          classId !== enrollment.classId
        ) {
          return false;
        }

        /*
         * Teachers only see subjects actually assigned to them.
         */
        if (teacherAssignmentKeys !== null) {
          const subjectId =
            key.split(":")[2];

          return teacherAssignmentKeys.has(
            `${enrollment.academicYearId}:${enrollment.classId}:${subjectId}`,
          );
        }

        return true;
      })
      .map(([key, examsForSubject]) => ({
        key,
        exam: examsForSubject[0],
      }))
      .filter(
        (
          entry,
        ): entry is {
          key: string;
          exam: (typeof finalExams)[number];
        } => Boolean(entry.exam),
      );

    let earned = 0;
    let possible = 0;
    let completedSubjects = 0;

    for (const { exam } of requiredExamEntries) {
      const grade = studentGrades.find(
        (item) => item.examId === exam.id,
      );

      if (!grade) {
        continue;
      }

      completedSubjects += 1;
      earned += grade.score;
      possible += exam.maxScore;
    }

    const totalSubjects =
      requiredExamEntries.length;

    const percentage =
      possible > 0
        ? Number(((earned / possible) * 100).toFixed(1))
        : 0;

    /*
     * A student is complete only when every actual FINAL
     * exam required for this visible class/subject scope
     * has a corresponding grade.
     */
    const complete =
      totalSubjects > 0 &&
      completedSubjects === totalSubjects;

    return {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      studentName: getStudentFullName(
        enrollment.student,
      ),
      classId: enrollment.classId,
      className: enrollment.class.name,
      gradeLevel: enrollment.class.gradeLevel,
      academicYearId: enrollment.academicYearId,
      completedSubjects,
      totalSubjects,
      status: complete
        ? ("complete" as const)
        : ("incomplete" as const),
      percentage,
      letter: complete
        ? letterGrade(percentage)
        : null,
    };
  });

  // ============================================================
  // Group by class
  // ============================================================

  const classGroups = Array.from(
    results
      .reduce(
        (map, result) => {
          const key =
            `${result.academicYearId}:${result.classId}`;

          const existing = map.get(key);

          if (existing) {
            existing.results.push(result);
          } else {
            map.set(key, {
              key,
              classId: result.classId,
              className: result.className,
              gradeLevel: result.gradeLevel,
              academicYearId: result.academicYearId,
              results: [result],
            });
          }

          return map;
        },
        new Map<
          string,
          {
            key: string;
            classId: string;
            className: string;
            gradeLevel: number;
            academicYearId: string;
            results: typeof results;
          }
        >(),
      )
      .values(),
  );

  for (const classGroup of classGroups) {
    classGroup.results.sort((a, b) =>
      a.studentName.localeCompare(b.studentName),
    );
  }

  // ============================================================
  // Page information
  // ============================================================

  const pageTitle =
    role === "student"
      ? t.myResults
      : role === "parent"
        ? t.studentsResults
        : t.finalResults;

  const pageDescription =
    role === "student"
      ? t.myFinalResultsDescription
      : role === "parent"
        ? t.studentsFinalResultsDescription
        : role === "teacher"
          ? t.teacherFinalResultsDescription
          : t.finalResultsDescription;

  // ============================================================
  // Summary
  // ============================================================

  const totalStudents = results.length;

  const completedResults = results.filter(
    (result) => result.status === "complete",
  ).length;

  const incompleteResults =
    totalStudents - completedResults;

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="min-h-dvh bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}

        <header className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm sm:h-11 sm:w-11">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M4 4h16v16H4z" />
                  <path d="M8 8h8" />
                  <path d="M8 12h8" />
                  <path d="M8 16h5" />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{t.school}</span>

                  <span className="text-slate-300 dark:text-slate-600">
                    /
                  </span>

                  <span>{t.results}</span>
                </div>

                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  {pageTitle}
                </h1>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {pageDescription}
                </p>
              </div>
            </div>

            <Link
              href="/results/exams"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
            >
              {t.examResults}
            </Link>
          </div>
        </header>

        {/* Summary */}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t.students}
            </p>

            <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
              {totalStudents}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t.complete}
            </p>

            <p className="mt-1 text-xl font-bold text-emerald-600 sm:text-2xl">
              {completedResults}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t.incomplete}
            </p>

            <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400 sm:text-2xl">
              {incompleteResults}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t.final}
            </p>

            <p className="mt-1 text-sm font-bold text-blue-700 dark:text-blue-400">
              {t.examination}
            </p>
          </div>
        </section>

        {/* Results by class */}

        {classGroups.length === 0 ? (
          <section className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              —
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
              {t.noResultsAvailable}
            </h2>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t.noResultsDescription}
            </p>
          </section>
        ) : (
          <div className="space-y-5">
            {classGroups.map((classGroup) => {
              const classCompleted =
                classGroup.results.filter(
                  (result) =>
                    result.status === "complete",
                ).length;

              const classIncomplete =
                classGroup.results.length -
                classCompleted;

              return (
                <section
                  key={classGroup.key}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
                >
                  {/* Class header */}

                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:px-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {t.class}
                          </span>

                          <h2 className="text-lg font-bold text-slate-950 dark:text-white sm:text-xl">
                            {classGroup.className}
                          </h2>
                        </div>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {t.final} {t.examination}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {t.students}
                          </p>

                          <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                            {classGroup.results.length}
                          </p>
                        </div>

                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:ring-emerald-900/50">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                            {t.complete}
                          </p>

                          <p className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-400">
                            {classCompleted}
                          </p>
                        </div>

                        <div className="rounded-xl bg-red-50 px-3 py-2 text-center ring-1 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                            {t.incomplete}
                          </p>

                          <p className="mt-0.5 font-bold text-red-700 dark:text-red-400">
                            {classIncomplete}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class table */}

                  <div className="max-w-full overflow-x-auto">
                    <table className="w-full min-w-190 text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white text-start dark:border-slate-800 dark:bg-slate-900">
                          <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 sm:px-5">
                            {t.student}
                          </th>

                          <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300">
                            {t.subjects}
                          </th>

                          <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300">
                            {t.status}
                          </th>

                          <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300">
                            {t.result}
                          </th>

                          <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 sm:px-5">
                            {t.action}
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {classGroup.results.map((result) => (
                          <tr
                            key={result.enrollmentId}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                          >
                            <td className="px-4 py-4 sm:px-5">
                              <Link
                                href={`/results/student/${result.studentId}`}
                                className="font-semibold text-blue-700 underline-offset-4 hover:underline dark:text-blue-400"
                              >
                                {result.studentName}
                              </Link>
                            </td>

                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                              <span className="font-semibold">
                                {result.completedSubjects}
                              </span>

                              <span className="text-slate-400">
                                {" "}
                                / {result.totalSubjects}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              {result.status === "complete" ? (
                                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  {t.complete}
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                                  {t.incomplete}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {result.status === "complete" ? (
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {result.percentage}%
                                  </p>

                                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                    {result.letter}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 sm:px-5">
                              <Link
                                href={`/results/student/${result.studentId}`}
                                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                {t.viewResults}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

