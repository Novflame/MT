
"use client";

import { useMemo, useState } from "react";

import {
  academicYears,
  schoolClases,
  subjects,
} from "@/db/schema";

/*
|--------------------------------------------------------------------------
| Database Types
|--------------------------------------------------------------------------
*/

type AcademicYear =
  typeof academicYears.$inferSelect;

type SchoolClass =
  typeof schoolClases.$inferSelect;

type Subject =
  typeof subjects.$inferSelect;

/*
|--------------------------------------------------------------------------
| Basic Types
|--------------------------------------------------------------------------
*/

type Student = {
  id: string;
  name: string;
};

type PromotionSystemResult =
  | "promoted"
  | "retained"
  | "incomplete";

type PromotionSystemDecision =
  | "promote"
  | "retain"
  | "complete_results";

type FinalDecision =
  | "promote"
  | "retain";

/*
|--------------------------------------------------------------------------
| Incomplete Issues
|--------------------------------------------------------------------------
|
| missing_exam
|   The exam itself does not exist.
|
| missing_grade
|   The exam exists, but this student has no grade.
|
*/

type PromotionIncompleteReason =
  | "missing_exam"
  | "missing_grade";

type PromotionIncompleteIssue = {
  subjectId: string;
  examId: string | null;
  reason: PromotionIncompleteReason;
};

/*
|--------------------------------------------------------------------------
| Core Failure
|--------------------------------------------------------------------------
*/

type CoreSubjectFailure = {
  subjectId: string;
  score: number;
  maxScore: number;
  percentage: number;
};

/*
|--------------------------------------------------------------------------
| Promotion Calculation
|--------------------------------------------------------------------------
*/

type PromotionCalculation = {
  studentId: string;
  academicYearId: string;
  enrollmentId: string;

  fromClassId: string;
  toClassId: string | null;

  percentage: number;

  systemResult: PromotionSystemResult;

  systemDecision: PromotionSystemDecision;

  coreSubjectFailures: CoreSubjectFailure[];

  missingFinalSubjects: string[];

  missingFinalExams: string[];

  incompleteIssues: PromotionIncompleteIssue[];
};

/*
|--------------------------------------------------------------------------
| Administrative Decision
|--------------------------------------------------------------------------
*/

type PromotionDecision = {
  id: string;

  studentId: string;
  academicYearId: string;

  fromClassId: string;
  toClassId: string | null;

  systemResult: string;
  systemDecision: string;
  finalDecision: string;

  decidedByUserId: string | null;

  reason: string | null;

  createdAt: string;
};

/*
|--------------------------------------------------------------------------
| Promotion Row
|--------------------------------------------------------------------------
*/

type PromotionRow = {
  student: Student;

  academicYear: AcademicYear;

  currentClass: SchoolClass;

  calculation: PromotionCalculation;

  decision: PromotionDecision | null;
};

/*
|--------------------------------------------------------------------------
| Props
|--------------------------------------------------------------------------
*/

type Props = {
  academicYears: AcademicYear[];

  classes: SchoolClass[];

  subjects: Subject[];
};

/*
|--------------------------------------------------------------------------
| Class Summary
|--------------------------------------------------------------------------
*/

type ClassSummary = {
  classId: string;

  className: string;

  gradeLevel: number;

  total: number;

  promoted: number;

  retained: number;

  incomplete: number;

  rows: PromotionRow[];
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function PromotionManager({
  academicYears,
  classes,
  subjects,
}: Props) {
  /*
  |--------------------------------------------------------------------------
  | Active Academic Year
  |--------------------------------------------------------------------------
  */

  const activeYear =
    academicYears.find(
      (year) => year.isActive,
    ) ?? null;

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [rows, setRows] =
    useState<PromotionRow[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [selectedClassId, setSelectedClassId] =
    useState<string | null>(null);

  const [reviewRow, setReviewRow] =
    useState<PromotionRow | null>(null);

  const [finalDecision, setFinalDecision] =
    useState<FinalDecision>("promote");

  const [toClassId, setToClassId] =
    useState("");

  const [reason, setReason] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Subject Name
  |--------------------------------------------------------------------------
  */

  function getSubjectName(
    subjectId: string,
  ) {
    const subject =
      subjects.find(
        (item) =>
          item.id === subjectId,
      );

    return (
      subject?.name ??
      `Subject ${subjectId}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Load Promotion
  |--------------------------------------------------------------------------
  */

  async function loadPromotion() {
    if (!activeYear) {
      setError(
        "No active academic year exists.",
      );

      return;
    }

    setLoading(true);

    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/promotion?academicYearId=${encodeURIComponent(
            activeYear.id,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load promotion results.",
        );
      }

      if (
        !data ||
        !Array.isArray(data.results)
      ) {
        throw new Error(
          "Invalid promotion response.",
        );
      }

      setRows(data.results);

      setSelectedClassId(null);

      setSuccess(
        "Promotion results calculated successfully.",
      );
    } catch (error) {
      setRows([]);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load promotion results.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Incomplete Rows
  |--------------------------------------------------------------------------
  |
  | هذه هي البيانات التي سنستخدمها لبناء
  | بطاقات أسباب النقص.
  |
  */

  const incompleteRows =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.calculation
              .systemResult ===
            "incomplete",
        ),
      [rows],
    );

  /*
  |--------------------------------------------------------------------------
  | Number Of Incomplete Issues
  |--------------------------------------------------------------------------
  */

  const incompleteIssueCount =
    useMemo(
      () =>
        incompleteRows.reduce(
          (total, row) =>
            total +
            row.calculation
              .incompleteIssues.length,
          0,
        ),
      [incompleteRows],
    );

  /*
  |--------------------------------------------------------------------------
  | Class Summaries
  |--------------------------------------------------------------------------
  */

  const classSummaries =
    useMemo<ClassSummary[]>(() => {
      const summaries: ClassSummary[] =
        [];

      for (const schoolClass of classes) {
        const classRows =
          rows.filter(
            (row) =>
              row.currentClass.id ===
              schoolClass.id,
          );

        if (
          classRows.length === 0
        ) {
          continue;
        }

        let promoted = 0;
        let retained = 0;
        let incomplete = 0;

        for (const row of classRows) {
          if (
            row.calculation
              .systemResult ===
            "promoted"
          ) {
            promoted++;
          }

          if (
            row.calculation
              .systemResult ===
            "retained"
          ) {
            retained++;
          }

          if (
            row.calculation
              .systemResult ===
            "incomplete"
          ) {
            incomplete++;
          }
        }

        summaries.push({
          classId:
            schoolClass.id,

          className:
            schoolClass.name,

          gradeLevel:
            schoolClass.gradeLevel,

          total:
            classRows.length,

          promoted,

          retained,

          incomplete,

          rows: classRows,
        });
      }

      return summaries.sort(
        (a, b) =>
          a.gradeLevel -
            b.gradeLevel ||
          a.className.localeCompare(
            b.className,
          ),
      );
    }, [classes, rows]);

  /*
  |--------------------------------------------------------------------------
  | Selected Class
  |--------------------------------------------------------------------------
  */

  const selectedClass =
    classSummaries.find(
      (summary) =>
        summary.classId ===
        selectedClassId,
    ) ?? null;

  /*
  |--------------------------------------------------------------------------
  | Destination Classes
  |--------------------------------------------------------------------------
  */

  const destinationClasses =
    reviewRow
      ? classes.filter(
          (schoolClass) =>
            schoolClass.gradeLevel ===
            reviewRow.currentClass
              .gradeLevel + 1,
        )
      : [];

  /*
  |--------------------------------------------------------------------------
  | Open Review
  |--------------------------------------------------------------------------
  */

  function openReview(
    row: PromotionRow,
  ) {
    const existingDecision =
      row.decision;

    const systemDecision =
      row.calculation.systemDecision;

    let initialDecision: FinalDecision =
      "promote";

    if (
      systemDecision === "retain"
    ) {
      initialDecision = "retain";
    }

    setReviewRow(row);

    setFinalDecision(
      existingDecision
        ?.finalDecision === "retain"
        ? "retain"
        : initialDecision,
    );

    setToClassId(
      existingDecision?.toClassId ??
        row.calculation.toClassId ??
        "",
    );

    setReason(
      existingDecision?.reason ?? "",
    );

    setError("");
    setSuccess("");
  }

  /*
  |--------------------------------------------------------------------------
  | Close Review
  |--------------------------------------------------------------------------
  */

  function closeReview() {
    if (saving) {
      return;
    }

    setReviewRow(null);

    setFinalDecision("promote");

    setToClassId("");

    setReason("");
  }

  /*
  |--------------------------------------------------------------------------
  | Save Decision
  |--------------------------------------------------------------------------
  */

  async function saveDecision() {
    if (!reviewRow) {
      return;
    }

    const cleanReason =
      reason.trim();

    if (!cleanReason) {
      setError(
        "A reason is required for an administrative decision.",
      );

      return;
    }

    if (
      finalDecision === "promote" &&
      !toClassId
    ) {
      setError(
        "Select the destination class.",
      );

      return;
    }

    setSaving(true);

    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/promotion",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              studentId:
                reviewRow.student.id,

              academicYearId:
                reviewRow.academicYear.id,

              finalDecision,

              toClassId:
                finalDecision ===
                "promote"
                  ? toClassId
                  : null,

              reason:
                cleanReason,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save decision.",
        );
      }

      setRows((currentRows) =>
        currentRows.map(
          (row) => {
            const sameStudent =
              row.student.id ===
              reviewRow.student.id;

            const sameYear =
              row.academicYear.id ===
              reviewRow.academicYear.id;

            if (
              sameStudent &&
              sameYear
            ) {
              return {
                ...row,
                decision:
                  data.decision,
              };
            }

            return row;
          },
        ),
      );

      setSuccess(
        `Administrative decision saved for ${reviewRow.student.name}.`,
      );

      closeReview();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save decision.",
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Result Label
  |--------------------------------------------------------------------------
  */

  function resultLabel(
    result: PromotionSystemResult,
  ) {
    switch (result) {
      case "promoted":
        return "Promoted";

      case "retained":
        return "Retained";

      case "incomplete":
        return "Incomplete";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Result Classes
  |--------------------------------------------------------------------------
  */

  function resultClasses(
    result: PromotionSystemResult,
  ) {
    switch (result) {
      case "promoted":
        return "border-green-200 bg-green-50 text-green-700";

      case "retained":
        return "border-red-200 bg-red-50 text-red-700";

      case "incomplete":
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN VIEW
  |--------------------------------------------------------------------------
  */

  if (!selectedClass) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        {/* HEADER */}

        <header className="mb-6">
          <p className="text-sm font-medium text-slate-500">
            Academic Management
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Promotion
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Automatic student promotion for{" "}
            {activeYear?.name ??
              "the active academic year"}.
          </p>
        </header>

        {/* ACTION */}

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-slate-900">
              {activeYear?.name ??
                "No active academic year"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              The system calculates all
              students automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPromotion}
            disabled={
              loading || !activeYear
            }
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Calculating..."
              : rows.length > 0
                ? "Recalculate"
                : "Calculate Promotion"}
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        {/* EMPTY */}

        {classSummaries.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <h2 className="font-semibold text-slate-900">
              No promotion results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Calculate promotion to see
              the classes and their
              results.
            </p>
          </div>
        ) : (
          <>
            {/* SUMMARY */}

            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <SummaryCard
                label="Students"
                value={rows.length}
              />

              <SummaryCard
                label="Promoted"
                value={
                  rows.filter(
                    (row) =>
                      row.calculation
                        .systemResult ===
                      "promoted",
                  ).length
                }
                variant="success"
              />

              <SummaryCard
                label="Retained"
                value={
                  rows.filter(
                    (row) =>
                      row.calculation
                        .systemResult ===
                      "retained",
                  ).length
                }
                variant="danger"
              />

              <SummaryCard
                label="Incomplete Students"
                value={
                  incompleteRows.length
                }
                variant="warning"
              />

              <SummaryCard
                label="Missing Issues"
                value={
                  incompleteIssueCount
                }
                variant="warning"
              />
            </section>

            {/* ==========================================================
                INCOMPLETE RESULTS
            ========================================================== */}

            {incompleteRows.length > 0 && (
              <IncompleteResultsSection
                rows={incompleteRows}
                getSubjectName={
                  getSubjectName
                }
              />
            )}

            {/* ==========================================================
                CLASSES
            ========================================================== */}

            <section className="mt-8">
              <div className="mb-3">
                <h2 className="font-semibold text-slate-900">
                  Classes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select a class to review
                  its students.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {classSummaries.map(
                  (summary) => (
                    <button
                      key={
                        summary.classId
                      }
                      type="button"
                      onClick={() =>
                        setSelectedClassId(
                          summary.classId,
                        )
                      }
                      className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-400">
                            Grade{" "}
                            {
                              summary.gradeLevel
                            }
                          </p>

                          <h3 className="mt-1 font-semibold text-slate-900">
                            {
                              summary.className
                            }
                          </h3>
                        </div>

                        <span className="text-slate-400 transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <SmallStat
                          label="Total"
                          value={
                            summary.total
                          }
                        />

                        <SmallStat
                          label="Promoted"
                          value={
                            summary.promoted
                          }
                          variant="success"
                        />

                        <SmallStat
                          label="Retained"
                          value={
                            summary.retained
                          }
                          variant="danger"
                        />
                      </div>

                      {summary.incomplete >
                        0 && (
                        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          {
                            summary.incomplete
                          }{" "}
                          incomplete result
                          {summary.incomplete !==
                          1
                            ? "s"
                            : ""}
                        </div>
                      )}
                    </button>
                  ),
                )}
              </div>
            </section>
          </>
        )}

        {/* REVIEW */}

        {reviewRow && (
          <ReviewModal
            reviewRow={reviewRow}
            finalDecision={
              finalDecision
            }
            setFinalDecision={
              setFinalDecision
            }
            toClassId={toClassId}
            setToClassId={
              setToClassId
            }
            reason={reason}
            setReason={setReason}
            destinationClasses={
              destinationClasses
            }
            saving={saving}
            closeReview={
              closeReview
            }
            saveDecision={
              saveDecision
            }
            getSubjectName={
              getSubjectName
            }
          />
        )}
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CLASS DETAILS
  |--------------------------------------------------------------------------
  */

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* BACK */}

      <button
        type="button"
        onClick={() =>
          setSelectedClassId(null)
        }
        className="mb-5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← All Classes
      </button>

      {/* HEADER */}

      <header className="mb-6">
        <p className="text-sm text-slate-500">
          Grade{" "}
          {selectedClass.gradeLevel}
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {selectedClass.className}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {activeYear?.name}
        </p>
      </header>

      {/* SUMMARY */}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total"
          value={selectedClass.total}
        />

        <SummaryCard
          label="Promoted"
          value={
            selectedClass.promoted
          }
          variant="success"
        />

        <SummaryCard
          label="Retained"
          value={
            selectedClass.retained
          }
          variant="danger"
        />

        <SummaryCard
          label="Incomplete"
          value={
            selectedClass.incomplete
          }
          variant="warning"
        />
      </section>

      {/* INCOMPLETE */}

      {selectedClass.incomplete >
        0 && (
        <IncompleteResultsSection
          rows={selectedClass.rows.filter(
            (row) =>
              row.calculation
                .systemResult ===
              "incomplete",
          )}
          getSubjectName={
            getSubjectName
          }
        />
      )}

      {/* STUDENTS */}

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="font-semibold text-slate-900">
            Students
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Automatic promotion results.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {selectedClass.rows.map(
            (row) => (
              <StudentCard
                key={
                  row.calculation
                    .enrollmentId
                }
                row={row}
                getSubjectName={
                  getSubjectName
                }
                onReview={() =>
                  openReview(row)
                }
              />
            ),
          )}
        </div>
      </section>

      {/* REVIEW */}

      {reviewRow && (
        <ReviewModal
          reviewRow={reviewRow}
          finalDecision={
            finalDecision
          }
          setFinalDecision={
            setFinalDecision
          }
          toClassId={toClassId}
          setToClassId={
            setToClassId
          }
          reason={reason}
          setReason={setReason}
          destinationClasses={
            destinationClasses
          }
          saving={saving}
          closeReview={closeReview}
          saveDecision={
            saveDecision
          }
          getSubjectName={
            getSubjectName
          }
        />
      )}

      {/* MESSAGES */}

      {(error || success) && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
              {error}
            </div>
          )}

          {success && !error && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-lg">
              {success}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Incomplete Results Section
|--------------------------------------------------------------------------
*/

function IncompleteResultsSection({
  rows,
  getSubjectName,
}: {
  rows: PromotionRow[];

  getSubjectName: (
    subjectId: string,
  ) => string;
}) {
  const issueCount =
    rows.reduce(
      (total, row) =>
        total +
        row.calculation
          .incompleteIssues.length,
      0,
    );

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Incomplete Results
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            These results cannot be finalized
            because one or more assessment
            results are missing.
          </p>
        </div>

        <div className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
          {issueCount} issue
          {issueCount !== 1
            ? "s"
            : ""}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <IncompleteStudentCard
            key={
              row.calculation
                .enrollmentId
            }
            row={row}
            getSubjectName={
              getSubjectName
            }
          />
        ))}
      </div>
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Incomplete Student Card
|--------------------------------------------------------------------------
*/

function IncompleteStudentCard({
  row,
  getSubjectName,
}: {
  row: PromotionRow;

  getSubjectName: (
    subjectId: string,
  ) => string;
}) {
  const issues =
    row.calculation
      .incompleteIssues;

  return (
    <article className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
      {/* STUDENT */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">
            {row.student.name}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Class:{" "}
            {row.currentClass.name}
          </p>
        </div>

        <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
          Results incomplete
        </span>
      </div>

      {/* ISSUES */}

      <div className="mt-4 space-y-3">
        {issues.map(
          (issue, index) => {
            const subjectName =
              getSubjectName(
                issue.subjectId,
              );

            const isMissingGrade =
              issue.reason ===
              "missing_grade";

            const isMissingExam =
              issue.reason ===
              "missing_exam";

            return (
              <div
                key={`${issue.subjectId}-${issue.examId ?? "no-exam"}-${index}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {subjectName}
                    </p>

                    {isMissingGrade && (
                      <p className="mt-1 text-xs text-red-600">
                        Student grade has not
                        been entered or
                        corrected.
                      </p>
                    )}

                    {isMissingExam && (
                      <p className="mt-1 text-xs text-amber-700">
                        Final exam results
                        for this subject
                        have not been
                        created yet.
                      </p>
                    )}
                  </div>

                  {/* ACTION */}

                  {isMissingGrade &&
                    issue.examId && (
                      <a
                        href={`/grades?assessmentId=${encodeURIComponent(
                          issue.examId,
                        )}&type=exam`}
                        className="inline-flex w-fit items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Enter / Correct Grade
                        <span className="ml-2">
                          →
                        </span>
                      </a>
                    )}

                  {isMissingExam && (
                    <a
                      href="/exams"
                      className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Review Exams
                      <span className="ml-2">
                        →
                      </span>
                    </a>
                  )}
                </div>

                {/* EXPLANATION */}

                <div className="mt-3 border-t border-slate-200 pt-3">
                  {isMissingGrade && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        Reason:
                      </span>{" "}
                      {row.student.name}
                      {" "}
                      does not have a
                      grade for{" "}
                      {subjectName}.
                    </p>
                  )}

                  {isMissingExam && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        Reason:
                      </span>{" "}
                      The final exam for{" "}
                      {subjectName} has
                      not been added yet.
                    </p>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Student Card
|--------------------------------------------------------------------------
*/

function StudentCard({
  row,
  getSubjectName,
  onReview,
}: {
  row: PromotionRow;

  getSubjectName: (
    subjectId: string,
  ) => string;

  onReview: () => void;
}) {
  const calculation =
    row.calculation;

  const decision =
    row.decision;

  const isPromoted =
    calculation.systemResult ===
    "promoted";

  const isRetained =
    calculation.systemResult ===
    "retained";

  const isIncomplete =
    calculation.systemResult ===
    "incomplete";

  return (
    <article
      className={`rounded-xl border p-4 ${
        isPromoted
          ? "border-green-200 bg-green-50/40"
          : isRetained
            ? "border-red-200 bg-red-50/40"
            : "border-amber-200 bg-amber-50/40"
      }`}
    >
      {/* HEADER */}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">
            {row.student.name}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Final average:{" "}
            {calculation.percentage}%
          </p>
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${resultClasses(
            calculation.systemResult,
          )}`}
        >
          {resultLabel(
            calculation.systemResult,
          )}
        </span>
      </div>

      {/* STATISTICS */}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallStat
          label="Core failures"
          value={
            calculation
              .coreSubjectFailures
              .length
          }
          variant={
            calculation
              .coreSubjectFailures
              .length > 0
              ? "danger"
              : "success"
          }
        />

        <SmallStat
          label="Missing"
          value={
            calculation
              .incompleteIssues.length
          }
          variant={
            calculation
              .incompleteIssues
              .length > 0
              ? "warning"
              : "success"
          }
        />

        <SmallStat
          label="Average"
          value={`${calculation.percentage}%`}
        />
      </div>

      {/* CORE FAILURES */}

      {calculation
        .coreSubjectFailures
        .length > 0 && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-medium text-red-800">
            Core subject failures
          </p>

          <div className="mt-2 space-y-1">
            {calculation.coreSubjectFailures.map(
              (failure) => (
                <div
                  key={
                    failure.subjectId
                  }
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-red-700">
                    {getSubjectName(
                      failure.subjectId,
                    )}
                  </span>

                  <span className="font-medium text-red-800">
                    {
                      failure.percentage
                    }
                    %
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* DECISION */}

      {decision && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Final decision
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                decision.finalDecision ===
                "promote"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {decision.finalDecision ===
              "promote"
                ? "Promote"
                : "Retain"}
            </span>
          </div>

          {decision.reason && (
            <p className="mt-2 text-xs text-slate-500">
              Reason:{" "}
              {decision.reason}
            </p>
          )}
        </div>
      )}

      {/* FOOTER */}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          {isIncomplete && (
            <p className="text-xs text-amber-700">
              Results are incomplete.
            </p>
          )}

          {isPromoted && (
            <p className="text-xs text-green-700">
              System recommends
              promotion.
            </p>
          )}

          {isRetained && (
            <p className="text-xs text-red-700">
              System recommends
              retention.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onReview}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
        >
          Review
        </button>
      </div>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Result Helpers
|--------------------------------------------------------------------------
*/

function resultLabel(
  result: PromotionSystemResult,
) {
  switch (result) {
    case "promoted":
      return "Promoted";

    case "retained":
      return "Retained";

    case "incomplete":
      return "Incomplete";
  }
}

function resultClasses(
  result: PromotionSystemResult,
) {
  switch (result) {
    case "promoted":
      return "border-green-200 bg-green-50 text-green-700";

    case "retained":
      return "border-red-200 bg-red-50 text-red-700";

    case "incomplete":
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

function SummaryCard({
  label,
  value,
  variant = "default",
}: {
  label: string;

  value: number;

  variant?:
    | "default"
    | "success"
    | "danger"
    | "warning";
}) {
  const classes = {
    default:
      "border-slate-200 bg-white text-slate-900",

    success:
      "border-green-200 bg-green-50 text-green-700",

    danger:
      "border-red-200 bg-red-50 text-red-700",

    warning:
      "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${classes[variant]}`}
    >
      <p className="text-xs font-medium opacity-70">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Small Stat
|--------------------------------------------------------------------------
*/

function SmallStat({
  label,
  value,
  variant = "default",
}: {
  label: string;

  value: number | string;

  variant?:
    | "default"
    | "success"
    | "danger"
    | "warning";
}) {
  const classes = {
    default:
      "bg-slate-50 text-slate-900",

    success:
      "bg-green-50 text-green-700",

    danger:
      "bg-red-50 text-red-700",

    warning:
      "bg-amber-50 text-amber-700",
  };

  return (
    <div
      className={`rounded-lg p-2.5 ${classes[variant]}`}
    >
      <p className="text-[11px] opacity-70">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Review Modal
|--------------------------------------------------------------------------
*/

function ReviewModal({
  reviewRow,
  finalDecision,
  setFinalDecision,
  toClassId,
  setToClassId,
  reason,
  setReason,
  destinationClasses,
  saving,
  closeReview,
  saveDecision,
  getSubjectName,
}: {
  reviewRow: PromotionRow;

  finalDecision: FinalDecision;

  setFinalDecision: (
    value: FinalDecision,
  ) => void;

  toClassId: string;

  setToClassId: (
    value: string,
  ) => void;

  reason: string;

  setReason: (
    value: string,
  ) => void;

  destinationClasses: SchoolClass[];

  saving: boolean;

  closeReview: () => void;

  saveDecision: () => void;

  getSubjectName: (
    subjectId: string,
  ) => string;
}) {
  const calculation =
    reviewRow.calculation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}

        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Administrative Review
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {reviewRow.student.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {reviewRow.currentClass.name}
              </p>
            </div>

            <button
              type="button"
              onClick={closeReview}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        {/* CONTENT */}

        <div className="space-y-5 p-5">
          {/* SYSTEM RESULT */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Automatic Result
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  Result
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {
                    calculation.systemResult
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Percentage
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {
                    calculation.percentage
                  }
                  %
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Missing
                </p>

                <p className="mt-1 font-semibold text-amber-700">
                  {
                    calculation
                      .incompleteIssues
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          {/* INCOMPLETE ISSUES */}

          {calculation
            .incompleteIssues
            .length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Missing Results
              </p>

              <div className="mt-3 space-y-2">
                {calculation.incompleteIssues.map(
                  (issue, index) => (
                    <div
                      key={`${issue.subjectId}-${index}`}
                      className="rounded-lg bg-white p-3"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {getSubjectName(
                          issue.subjectId,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-amber-700">
                        {issue.reason ===
                        "missing_grade"
                          ? "Student grade has not been entered."
                          : "Final exam results have not been created."}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* DECISION */}

          <div>
            <label
              htmlFor="final-decision"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Final Decision
            </label>

            <select
              id="final-decision"
              value={finalDecision}
              onChange={(event) =>
                setFinalDecision(
                  event.target
                    .value as FinalDecision,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="promote">
                Promote
              </option>

              <option value="retain">
                Retain
              </option>
            </select>
          </div>

          {/* DESTINATION */}

          {finalDecision ===
            "promote" && (
            <div>
              <label
                htmlFor="destination-class"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Destination Class
              </label>

              <select
                id="destination-class"
                value={toClassId}
                onChange={(event) =>
                  setToClassId(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">
                  Select destination
                  class
                </option>

                {destinationClasses.map(
                  (schoolClass) => (
                    <option
                      key={
                        schoolClass.id
                      }
                      value={
                        schoolClass.id
                      }
                    >
                      {
                        schoolClass.name
                      }
                    </option>
                  ),
                )}
              </select>

              {destinationClasses.length ===
                0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No class exists at
                  the next grade
                  level.
                </p>
              )}
            </div>
          )}

          {/* REASON */}

          <div>
            <label
              htmlFor="reason"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Reason
            </label>

            <textarea
              id="reason"
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value,
                )
              }
              rows={4}
              placeholder="Reason for administrative override..."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={closeReview}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={saveDecision}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

