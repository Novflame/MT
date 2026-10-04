import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { getStudentFullName } from "@/lib/student-name";
import { eq, isNotNull } from "drizzle-orm";
import Link from "next/link";

import {
  exams,
  grades,
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
// Results page
// ============================================================

export default async function ResultsPage() {
  const session = await requirePermission("results.read");

  const db = await getSchoolDB();

  // ============================================================
  // Determine student visibility
  // ============================================================

  let allowedStudentIds: string[] | null = null;

  // ------------------------------------------------------------
  // Student
  // ------------------------------------------------------------

  if (session.user.schoolRole === "student") {
    const link = await db.query.studentUsers.findFirst({
      where: eq(studentUsers.userId, session.user.id),
    });

    allowedStudentIds = link ? [link.studentId] : [];
  }

  // ------------------------------------------------------------
  // Parent
  // ------------------------------------------------------------
  else if (session.user.schoolRole === "parent") {
    const parent = await db.query.parents.findFirst({
      where: eq(parents.userId, session.user.id),
    });

    if (!parent) {
      allowedStudentIds = [];
    } else {
      const links = await db.query.parentStudents.findMany({
        where: eq(parentStudents.parentId, parent.id),
      });

      allowedStudentIds = links.map((link) => link.studentId);
    }
  }

  // ============================================================
  // Teacher assignments
  // ============================================================

  let teacherAssignmentKeys: Set<string> | null = null;

  if (session.user.schoolRole === "teacher") {
    const assignments = await db.query.teacherAssignments.findMany({
      where: eq(teacherAssignments.teacherId, session.user.id),
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
  // ============================================================

  const [
    enrollments,
    allSubjects,
    allCoreSubjects,
    allFinalExams,
    allFinalGrades,
  ] = await Promise.all([
    // --------------------------------------------------------
    // Student enrollments
    // --------------------------------------------------------

    db.query.studentEnrollments.findMany({
      with: {
        student: true,
        class: true,
      },
    }),

    // --------------------------------------------------------
    // Subjects
    // --------------------------------------------------------

    db.query.subjects.findMany(),

    // --------------------------------------------------------
    // Core subjects
    // --------------------------------------------------------

    db.query.coreSubjects.findMany(),

    // --------------------------------------------------------
    // Final exams only
    // --------------------------------------------------------

    db.query.exams.findMany({
      where: eq(exams.type, "FINAL"),
    }),

    // --------------------------------------------------------
    // Grades belonging to exams
    // --------------------------------------------------------

    db.query.grades.findMany({
      where: isNotNull(grades.examId),
      with: {
        exam: true,
      },
    }),
  ]);

  // ============================================================
  // Create quick subject lookup
  // ============================================================

  const subjectMap = new Map(
    allSubjects.map((subject) => [subject.id, subject]),
  );

  // ============================================================
  // Visible enrollments
  // ============================================================

  const visibleEnrollments = enrollments.filter((enrollment) => {
    // ------------------------------------------------
    // Student / parent restriction
    // ------------------------------------------------

    if (
      allowedStudentIds !== null &&
      !allowedStudentIds.includes(enrollment.studentId)
    ) {
      return false;
    }

    // ------------------------------------------------
    // Teacher restriction
    //
    // A teacher must have at least one assignment
    // for this academic year + class.
    // ------------------------------------------------

    if (teacherAssignmentKeys !== null) {
      const hasClassAssignment = Array.from(teacherAssignmentKeys).some((key) =>
        key.startsWith(`${enrollment.academicYearId}:${enrollment.classId}:`),
      );

      if (!hasClassAssignment) {
        return false;
      }
    }

    return true;
  });

  // ============================================================
  // Build results
  // ============================================================

  const results = visibleEnrollments.map((enrollment) => {
    // ------------------------------------------------
    // Core subjects for this class/year
    // ------------------------------------------------

    let requiredSubjects = allCoreSubjects.filter(
      (core) =>
        core.classId === enrollment.classId &&
        core.academicYearId === enrollment.academicYearId,
    );

    // ------------------------------------------------
    // Teacher can only see assigned subjects
    // ------------------------------------------------

    if (teacherAssignmentKeys !== null) {
      requiredSubjects = requiredSubjects.filter((requiredSubject) =>
        teacherAssignmentKeys.has(
          `${enrollment.academicYearId}:${enrollment.classId}:${requiredSubject.subjectId}`,
        ),
      );
    }

    // ------------------------------------------------
    // Final exams for this class/year
    // ------------------------------------------------

    const finalExams = allFinalExams.filter(
      (exam) =>
        exam.classId === enrollment.classId &&
        exam.academicYearId === enrollment.academicYearId,
    );

    // ------------------------------------------------
    // Student final grades
    // ------------------------------------------------

    const studentFinalGrades = allFinalGrades.filter(
      (grade) =>
        grade.studentEnrollmentId === enrollment.id &&
        grade.exam !== null &&
        grade.exam.type === "FINAL" &&
        grade.exam.classId === enrollment.classId &&
        grade.exam.academicYearId === enrollment.academicYearId,
    );

    // ------------------------------------------------
    // Build subject results
    // ------------------------------------------------

    const subjectResults = requiredSubjects.map((requiredSubject) => {
      const subject = subjectMap.get(requiredSubject.subjectId);

      // ------------------------------------------------
      // Find Final exam for this subject
      //
      // If more than one exists, use the latest date.
      // ------------------------------------------------

      const subjectExams = finalExams
        .filter((exam) => exam.subjectId === requiredSubject.subjectId)
        .sort((a, b) => b.examDate.localeCompare(a.examDate));

      const exam = subjectExams[0] ?? null;

      // ------------------------------------------------
      // No Final exam exists
      // ------------------------------------------------

      if (!exam) {
        return {
          subjectId: requiredSubject.subjectId,

          subjectName: subject?.name ?? "Unknown",

          examId: null,

          examName: null,

          score: null,

          maxScore: null,

          percentage: null,

          letter: null,

          status: "missing" as const,
        };
      }

      // ------------------------------------------------
      // Find student's grade for this exact exam
      // ------------------------------------------------

      const examGrade = studentFinalGrades.find(
        (grade) => grade.examId === exam.id,
      );

      // ------------------------------------------------
      // Final exam exists but grade is missing
      // ------------------------------------------------

      if (!examGrade) {
        return {
          subjectId: requiredSubject.subjectId,

          subjectName: subject?.name ?? "Unknown",

          examId: exam.id,

          examName: exam.name,

          score: null,

          maxScore: exam.maxScore,

          percentage: null,

          letter: null,

          status: "missing" as const,
        };
      }

      // ------------------------------------------------
      // Calculate percentage
      // ------------------------------------------------

      const percentage =
        exam.maxScore > 0
          ? Number(((examGrade.score / exam.maxScore) * 100).toFixed(1))
          : 0;

      // ------------------------------------------------
      // Completed subject
      // ------------------------------------------------

      return {
        subjectId: requiredSubject.subjectId,

        subjectName: subject?.name ?? "Unknown",

        examId: exam.id,

        examName: exam.name,

        score: examGrade.score,

        maxScore: exam.maxScore,

        percentage,

        letter: letterGrade(percentage),

        status: "completed" as const,
      };
    });

    // ------------------------------------------------
    // Calculate total
    // ------------------------------------------------

    let earned = 0;
    let possible = 0;

    for (const subject of subjectResults) {
      if (subject.score === null || subject.maxScore === null) {
        continue;
      }

      earned += subject.score;

      possible += subject.maxScore;
    }

    const percentage =
      possible > 0 ? Number(((earned / possible) * 100).toFixed(1)) : 0;

    // ------------------------------------------------
    // Missing subjects
    // ------------------------------------------------

    const missingSubjects = subjectResults.filter(
      (subject) => subject.status === "missing",
    );

    // ------------------------------------------------
    // Completion
    // ------------------------------------------------

    const complete = subjectResults.length > 0 && missingSubjects.length === 0;

    // ------------------------------------------------
    // Final result
    // ------------------------------------------------

    return {
      enrollmentId: enrollment.id,

      student: enrollment.student,

      class: enrollment.class,

      academicYearId: enrollment.academicYearId,

      status: complete ? "complete" : "incomplete",

      earned,

      possible,

      percentage,

      letter: complete ? letterGrade(percentage) : null,

      completedSubjects: subjectResults.filter(
        (subject) => subject.status === "completed",
      ).length,

      totalSubjects: subjectResults.length,

      missingSubjects,

      subjects: subjectResults,
    };
  });

  // ============================================================
  // Page information
  // ============================================================

  const role = session.user.schoolRole;

  const pageTitle =
    role === "student"
      ? "My Results"
      : role === "parent"
        ? "Students Results"
        : "Results";

  const pageDescription =
    role === "student"
      ? "Your final examination results."
      : role === "parent"
        ? "Final examination results for your students."
        : role === "teacher"
          ? "Final examination results for your assigned classes and subjects."
          : "Final examination results.";

  // ============================================================
  // Summary
  // ============================================================

  const totalStudents = results.length;

  const completedResults = results.filter(
    (result) => result.status === "complete",
  ).length;

  const incompleteResults = results.filter(
    (result) => result.status === "incomplete",
  ).length;

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ================================================= */}
        {/* Header */}
        {/* ================================================= */}

        <header className="mb-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>School</span>

                <span className="text-slate-300">/</span>

                <span>Results</span>
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {pageTitle}
              </h1>

              <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
            </div>

            <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white sm:flex">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 4h16v16H4z" />
                <path d="M8 8h8" />
                <path d="M8 12h8" />
                <path d="M8 16h5" />
              </svg>
            </div>
          </div>

          <Link
            href="/results/exams"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm 
            font-semibold text-white transition hover:bg-slate-800"
          >
            <span> Exam Results </span>

           
          </Link>
        </header>

        {/* ================================================= */}
        {/* Summary */}
        {/* ================================================= */}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Students
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalStudents}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Complete
            </p>

            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {completedResults}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Incomplete
            </p>

            <p className="mt-1 text-2xl font-bold text-orange-500">
              {incompleteResults}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Final
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              Examination
            </p>
          </div>
        </div>

        {/* ================================================= */}
        {/* Results */}
        {/* ================================================= */}

        <div className="space-y-4">
          {results.map((result) => (
            <section
              key={result.enrollmentId}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              {/* Student header */}

              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-slate-900">
                    {getStudentFullName(result.student)}
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span>{result.class.name}</span>

                    <span className="text-slate-300">•</span>

                    <span>
                      {result.completedSubjects} / {result.totalSubjects}{" "}
                      subjects completed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={
                      result.status === "complete"
                        ? "rounded-xl bg-emerald-50 px-4 py-2 text-right"
                        : "rounded-xl bg-orange-50 px-4 py-2 text-right"
                    }
                  >
                    <p
                      className={
                        result.status === "complete"
                          ? "text-xs font-medium text-emerald-600"
                          : "text-xs font-medium text-orange-600"
                      }
                    >
                      {result.status === "complete" ? "Final Result" : "Status"}
                    </p>

                    <p
                      className={
                        result.status === "complete"
                          ? "text-xl font-bold text-emerald-700"
                          : "text-sm font-bold text-orange-700"
                      }
                    >
                      {result.status === "complete"
                        ? `${result.percentage}% ${result.letter}`
                        : "Incomplete"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subjects */}

              <div className="overflow-x-auto">
                <table className="w-full `min-w-175` text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-5 py-3 font-semibold text-slate-600">
                        Subject
                      </th>

                      <th className="px-4 py-3 font-semibold text-slate-600">
                        Final Exam
                      </th>

                      <th className="px-4 py-3 font-semibold text-slate-600">
                        Score
                      </th>

                      <th className="px-4 py-3 font-semibold text-slate-600">
                        Max
                      </th>

                      <th className="px-4 py-3 font-semibold text-slate-600">
                        Percent
                      </th>

                      <th className="px-5 py-3 font-semibold text-slate-600">
                        Grade
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.subjects.map((subject) => (
                      <tr
                        key={subject.subjectId}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {subject.subjectName}
                        </td>

                        <td className="px-4 py-3 text-slate-500">
                          {subject.examName ?? "No final exam"}
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {subject.score ?? "-"}
                        </td>

                        <td className="px-4 py-3 text-slate-500">
                          {subject.maxScore ?? "-"}
                        </td>

                        <td className="px-4 py-3">
                          {subject.percentage !== null ? (
                            <span className="font-semibold text-slate-800">
                              {subject.percentage}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-5 py-3">
                          {subject.letter ? (
                            <span
                              className={
                                subject.percentage !== null &&
                                subject.percentage >= 50
                                  ? "inline-flex min-w-9 justify-center rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700"
                                  : "inline-flex min-w-9 justify-center rounded-lg bg-red-50 px-2 py-1 font-bold text-red-700"
                              }
                            >
                              {subject.letter}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Missing results */}

              {result.missingSubjects.length > 0 && (
                <div className="border-t border-orange-100 bg-orange-50 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      !
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-orange-800">
                        Missing results
                      </p>

                      <p className="mt-1 text-sm text-orange-700">
                        {result.missingSubjects
                          .map((subject) => subject.subjectName)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Total */}

              {result.status === "complete" && (
                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Final Total
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {result.earned} / {result.possible}
                    </p>

                    <p className="text-sm font-semibold text-slate-600">
                      {result.percentage}%
                    </p>
                  </div>
                </div>
              )}
            </section>
          ))}

          {/* Empty */}

          {results.length === 0 && (
            <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                —
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                No results available
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Final examination results have not been published yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
