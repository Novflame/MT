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
  | "graduate"
  | "complete_results";

type FinalDecision =
  | "promote"
  | "retain"
  | "graduate";

/*
|--------------------------------------------------------------------------
| Incomplete Issues
|--------------------------------------------------------------------------
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
| Blocking Final Result Issue
|--------------------------------------------------------------------------
*/

type FinalResultIssue = {
  studentId: string;
  studentName: string;
  enrollmentId: string;

  classId: string;
  className: string;

  subjectId: string;
  subjectName: string;

  examId: string | null;

  reason:
    | "missing_exam"
    | "missing_grade";

  message: string;
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
| API Response
|--------------------------------------------------------------------------
*/

type FinalResultsCheckResponse = {
  success: false;
  status: "final_results_incomplete";
  academicYearId: string;
  issues: FinalResultIssue[];
  issueCount: number;
  message: string;
};

type PromotionResponse = {
  success: true;
  status: "final_results_complete";
  results: PromotionRow[];
  decisions: PromotionDecision[];
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
  graduated: number;
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

  const [reviewingPromotion, setReviewingPromotion] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [closing, setClosing] =
    useState(false);

 
  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    selectedClassId,
    setSelectedClassId,
  ] = useState<string | null>(null);

  const [reviewRow, setReviewRow] =
    useState<PromotionRow | null>(null);

     const [promotionReviewed, setPromotionReviewed] =
    useState(false);



  const [finalDecision, setFinalDecision] =
    useState<FinalDecision>("promote");

  const [toClassId, setToClassId] =
    useState("");

  const [reason, setReason] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Blocking Final Results Overlay
  |--------------------------------------------------------------------------
  */

  const [finalResultIssues, setFinalResultIssues] =
    useState<FinalResultIssue[]>([]);

  const [finalResultsOverlayOpen, setFinalResultsOverlayOpen] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Close Confirmation Modal
  |--------------------------------------------------------------------------
  */

  const [closeConfirmationOpen, setCloseConfirmationOpen] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Subject Name
  |--------------------------------------------------------------------------
  */

  function getSubjectName(
    subjectId: string,
  ): string {
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
  | Handle Final Result Validation Failure
  |--------------------------------------------------------------------------
  */

  function handleFinalResultIncomplete(
    data: FinalResultsCheckResponse,
  ) {
    setRows([]);
    setPromotionReviewed(false);
    setSelectedClassId(null);

    setFinalResultIssues(
      Array.isArray(data.issues)
        ? data.issues
        : [],
    );

    setFinalResultsOverlayOpen(true);

    setError("");

    setSuccess("");
  }

  /*
  |--------------------------------------------------------------------------
  | Check Final Results
  |--------------------------------------------------------------------------
  |
  | This is the mandatory first step.
  |
  | The API will return:
  |
  | 200 -> final results complete
  | 409 -> final results incomplete
  |
  | No promotion review starts when final results are incomplete.
  |
  */

  async function checkFinalResults() {
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

      if (
        response.status === 409 &&
        data?.status ===
          "final_results_incomplete" &&
        Array.isArray(data?.issues)
      ) {
        handleFinalResultIncomplete(
          data as FinalResultsCheckResponse,
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ??
            data?.error ??
            "Failed to check final results.",
        );
      }

      if (
        !data ||
        !Array.isArray(data.results)
      ) {
        throw new Error(
          "Invalid final results response.",
        );
      }

      const promotionData =
        data as PromotionResponse;

      setRows(
        promotionData.results,
      );

      setSelectedClassId(null);

      setPromotionReviewed(false);

      setFinalResultIssues([]);

      setFinalResultsOverlayOpen(false);

      setSuccess(
        "All required final results are complete. Promotion review is now available.",
      );
    } catch (error) {
      setRows([]);
      setPromotionReviewed(false);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to check final results.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Review Promotion
  |--------------------------------------------------------------------------
  |
  | This persists the system promotion recommendations.
  |
  | Administrative final decisions are NOT overwritten.
  |
  */

  async function reviewPromotion() {
    if (!activeYear) {
      setError(
        "No active academic year exists.",
      );

      return;
    }

    if (!resultsReady) {
      setError(
        "Promotion review is blocked until all final results are complete.",
      );

      return;
    }

    setReviewingPromotion(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/promotion",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              academicYearId:
                activeYear.id,

              action: "review",
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 409 &&
        data?.status ===
          "final_results_incomplete" &&
        Array.isArray(data?.issues)
      ) {
        handleFinalResultIncomplete(
          data as FinalResultsCheckResponse,
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ??
            data?.error ??
            "Failed to review promotion.",
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Refresh the complete promotion rows.
      |--------------------------------------------------------------------------
      */

      const refreshResponse =
        await fetch(
          `/api/promotion?academicYearId=${encodeURIComponent(
            activeYear.id,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const refreshData =
        await refreshResponse.json();

      if (
        refreshResponse.status ===
          409 &&
        refreshData?.status ===
          "final_results_incomplete" &&
        Array.isArray(
          refreshData?.issues,
        )
      ) {
        handleFinalResultIncomplete(
          refreshData as FinalResultsCheckResponse,
        );

        return;
      }

      if (!refreshResponse.ok) {
        throw new Error(
          refreshData?.message ??
            refreshData?.error ??
            "Failed to refresh promotion results.",
        );
      }

      if (
        !Array.isArray(
          refreshData.results,
        )
      ) {
        throw new Error(
          "Invalid promotion response.",
        );
      }

      setRows(
        refreshData.results,
      );

      setPromotionReviewed(true);

      setSelectedClassId(null);

      setSuccess(
        "Promotion recommendations have been reviewed. Final administrative decisions can now be entered.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to review promotion.",
      );
    } finally {
      setReviewingPromotion(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Incomplete Rows
  |--------------------------------------------------------------------------
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
  | Results Ready
  |--------------------------------------------------------------------------
  */

  const resultsReady =
    rows.length > 0 &&
    incompleteRows.length === 0;

  /*
  |--------------------------------------------------------------------------
  | Final Decisions Ready
  |--------------------------------------------------------------------------
  */

  const decisionsReady =
    resultsReady &&
    promotionReviewed &&
    rows.every((row) => {
      const decision =
        row.decision?.finalDecision;

      return (
        decision === "promote" ||
        decision === "retain" ||
        decision === "graduate"
      );
    });

  /*
  |--------------------------------------------------------------------------
  | Overall Summary
  |--------------------------------------------------------------------------
  */

  const overallSummary =
    useMemo(() => {
      let promoted = 0;
      let retained = 0;
      let graduated = 0;

      for (const row of rows) {
        switch (
          row.decision?.finalDecision
        ) {
          case "promote":
            promoted++;
            break;

          case "retain":
            retained++;
            break;

          case "graduate":
            graduated++;
            break;
        }
      }

      return {
        promoted,
        retained,
        graduated,
      };
    }, [rows]);

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

        const promoted =
          classRows.filter(
            (row) =>
              row.decision
                ?.finalDecision ===
              "promote",
          ).length;

        const retained =
          classRows.filter(
            (row) =>
              row.decision
                ?.finalDecision ===
              "retain",
          ).length;

        const graduated =
          classRows.filter(
            (row) =>
              row.decision
                ?.finalDecision ===
              "graduate",
          ).length;

        const incomplete =
          classRows.filter(
            (row) =>
              row.calculation
                .systemResult ===
              "incomplete",
          ).length;

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
          graduated,
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
  | Open Administrative Review
  |--------------------------------------------------------------------------
  */

 
function openReview(row: PromotionRow) {
  if (!promotionReviewed) {
    setError(
      "Review Promotion must be completed before entering final administrative decisions.",
    );
    return;
  }

  if (row.calculation.systemResult === "incomplete") {
    const issues: FinalResultIssue[] = [];

    for (const issue of row.calculation.incompleteIssues) {
      const subjectName = getSubjectName(issue.subjectId);

      let message: string;

      if (issue.reason === "missing_exam") {
        message =
          "Student = " +
          row.student.name +
          ", Class = " +
          row.currentClass.name +
          ", Subject = " +
          subjectName +
          ": final exam was not created.";
      } else {
        message =
          "Student = " +
          row.student.name +
          ", Class = " +
          row.currentClass.name +
          ", Subject = " +
          subjectName +
          ": final result was not submitted.";
      }

      issues.push({
        studentId: row.student.id,
        studentName: row.student.name,
        enrollmentId: row.calculation.enrollmentId,
        classId: row.currentClass.id,
        className: row.currentClass.name,
        subjectId: issue.subjectId,
        subjectName,
        examId: issue.examId,
        reason: issue.reason,
        message,
      });
    }

    setFinalResultIssues(issues);
    setFinalResultsOverlayOpen(true);

    return;
  }

  const existingDecision = row.decision;
  const systemDecision = row.calculation.systemDecision;

  let initialDecision: FinalDecision = "promote";

  if (systemDecision === "retain") {
    initialDecision = "retain";
  }

  if (systemDecision === "graduate") {
    initialDecision = "graduate";
  }

  if (existingDecision?.finalDecision === "retain") {
    initialDecision = "retain";
  }

  if (existingDecision?.finalDecision === "graduate") {
    initialDecision = "graduate";
  }

  if (existingDecision?.finalDecision === "promote") {
    initialDecision = "promote";
  }

  setReviewRow(row);

  setFinalDecision(initialDecision);

  setToClassId(
    existingDecision?.toClassId ??
      row.calculation.toClassId ??
      "",
  );

  setReason(existingDecision?.reason ?? "");

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

    if (!promotionReviewed) {
      setError(
        "Promotion review must be completed before saving a final decision.",
      );

      return;
    }

    if (
      reviewRow.calculation
        .systemResult ===
      "incomplete"
    ) {
      setError(
        "Final exams and final grades must be complete before saving a final decision.",
      );

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

      if (
        response.status === 409 &&
        data?.status ===
          "final_results_incomplete" &&
        Array.isArray(data?.issues)
      ) {
        handleFinalResultIncomplete(
          data as FinalResultsCheckResponse,
        );

        closeReview();

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ??
            data?.error ??
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
        `Final administrative decision saved for ${reviewRow.student.name}.`,
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
  | Request Close
  |--------------------------------------------------------------------------
  */

  function requestCloseAcademicYear() {
    if (!activeYear) {
      setError(
        "No active academic year exists.",
      );

      return;
    }

    if (!resultsReady) {
      setError(
        "The academic year cannot be closed until all final exams and final grades are complete.",
      );

      return;
    }

    if (!promotionReviewed) {
      setError(
        "Promotion review must be completed before closing the academic year.",
      );

      return;
    }

    if (!decisionsReady) {
      setError(
        "The academic year cannot be closed until every student has a final administrative decision.",
      );

      return;
    }

    setCloseConfirmationOpen(true);
  }

  /*
  |--------------------------------------------------------------------------
  | Close Academic Year
  |--------------------------------------------------------------------------
  */

  async function closeAcademicYear() {
    if (!activeYear) {
      return;
    }

    setCloseConfirmationOpen(false);

    setClosing(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/promotion",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              academicYearId:
                activeYear.id,

              action: "close",
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 409 &&
        data?.status ===
          "final_results_incomplete" &&
        Array.isArray(data?.issues)
      ) {
        handleFinalResultIncomplete(
          data as FinalResultsCheckResponse,
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ??
            data?.error ??
            "Failed to close the academic year.",
        );
      }

      setSuccess(
        data.message ??
          "Academic year closed successfully.",
      );

      setRows([]);
      setSelectedClassId(null);
      setPromotionReviewed(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to close the academic year.",
      );
    } finally {
      setClosing(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN VIEW
  |--------------------------------------------------------------------------
  */

  if (!selectedClass) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-7xl">
        <header className="mb-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Academic Management
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Academic Year Closing
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Complete the final-result check,
            review promotion recommendations,
            finalize administrative decisions,
            then close and roll over the
            academic year.
          </p>
        </header>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {activeYear?.name ??
                  "No active academic year"}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Final results must be complete
                before promotion review or year
                closing can proceed.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={
                  checkFinalResults
                }
                disabled={
                  loading ||
                  reviewingPromotion ||
                  closing ||
                  !activeYear
                }
                className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:w-auto"
              >
                {loading
                  ? "Checking Final Results..."
                  : rows.length > 0
                    ? "Refresh Final Results"
                    : "Check Final Results"}
              </button>

              {resultsReady &&
                !promotionReviewed && (
                  <button
                    type="button"
                    onClick={
                      reviewPromotion
                    }
                    disabled={
                      reviewingPromotion ||
                      loading ||
                      closing
                    }
                    className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {reviewingPromotion
                      ? "Reviewing Promotion..."
                      : "Review Promotion"}
                  </button>
                )}

              <button
                type="button"
                onClick={
                  requestCloseAcademicYear
                }
                disabled={
                  closing ||
                  loading ||
                  reviewingPromotion ||
                  !decisionsReady
                }
                className="w-full rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {closing
                  ? "Closing..."
                  : "Close Academic Year"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatusStep
              number="1"
              title="Check Final Results"
              complete={
                resultsReady
              }
              active={
                !resultsReady
              }
            />

            <StatusStep
              number="2"
              title="Review Promotion"
              complete={
                promotionReviewed
              }
              active={
                resultsReady &&
                !promotionReviewed
              }
            />

            <StatusStep
              number="3"
              title="Finalize & Close"
              complete={false}
              active={
                promotionReviewed
              }
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300"
          >
            {success}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              ✓
            </div>

            <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
              Final Results Check Required
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Start by checking the final exams
              and final results for the active
              academic year. Promotion review
              remains blocked until all required
              results are complete.
            </p>

            <button
              type="button"
              onClick={
                checkFinalResults
              }
              disabled={
                loading ||
                !activeYear
              }
              className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {loading
                ? "Checking..."
                : "Check Final Results"}
            </button>
          </div>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryCard
                label="Students"
                value={rows.length}
              />

              <SummaryCard
                label="Promoted"
                value={
                  overallSummary.promoted
                }
                variant="success"
              />

              <SummaryCard
                label="Graduated"
                value={
                  overallSummary.graduated
                }
                variant="success"
              />

              <SummaryCard
                label="Retained"
                value={
                  overallSummary.retained
                }
                variant="danger"
              />

              <SummaryCard
                label="Incomplete"
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

            {resultsReady &&
              !promotionReviewed && (
                <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/30">
                  <h2 className="font-semibold text-blue-900 dark:text-blue-200">
                    Final Results Are Complete
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                    All required final results are
                    available. Review the system
                    promotion recommendations before
                    entering administrative decisions.
                  </p>

                  <button
                    type="button"
                    onClick={
                      reviewPromotion
                    }
                    disabled={
                      reviewingPromotion
                    }
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reviewingPromotion
                      ? "Reviewing Promotion..."
                      : "Review Promotion"}
                  </button>
                </div>
              )}

            {promotionReviewed &&
              !decisionsReady && (
                <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/30">
                  <h2 className="font-semibold text-blue-900 dark:text-blue-200">
                    Promotion Review Complete
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                    System recommendations are
                    ready. Review each student and
                    provide the final administrative
                    decision before closing the year.
                  </p>
                </div>
              )}

            {decisionsReady && (
              <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-900/60 dark:bg-green-950/30">
                <h2 className="font-semibold text-green-900 dark:text-green-200">
                  Academic Year Is Ready To Close
                </h2>

                <p className="mt-1 text-sm leading-6 text-green-800 dark:text-green-300">
                  Final results, promotion review,
                  and administrative decisions are
                  complete for every student. The
                  academic year can now be closed.
                </p>

                <button
                  type="button"
                  onClick={
                    requestCloseAcademicYear
                  }
                  disabled={closing}
                  className="mt-4 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close Academic Year
                </button>
              </div>
            )}

            {incompleteRows.length > 0 && (
              <IncompleteResultsSection
                rows={incompleteRows}
                getSubjectName={
                  getSubjectName
                }
              />
            )}

            <section className="mt-8">
              <div className="mb-3">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Classes
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Select a class to review its
                  students.
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
                      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-400">
                            Grade{" "}
                            {
                              summary.gradeLevel
                            }
                          </p>

                          <h3 className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {
                              summary.className
                            }
                          </h3>
                        </div>

                        <span className="text-slate-400 transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
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
                          label="Graduated"
                          value={
                            summary.graduated
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
                        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
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

        <FinalResultsBlockingOverlay
          open={
            finalResultsOverlayOpen
          }
          issues={finalResultIssues}
          onClose={() =>
            setFinalResultsOverlayOpen(
              false,
            )
          }
        />

        {closeConfirmationOpen && (
          <CloseAcademicYearModal
            academicYearName={
              activeYear?.name ??
              "Current Academic Year"
            }
            closing={closing}
            onCancel={() =>
              setCloseConfirmationOpen(
                false,
              )
            }
            onConfirm={
              closeAcademicYear
            }
          />
        )}

        <FeedbackToast
          error={error}
          success={success}
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CLASS DETAILS
  |--------------------------------------------------------------------------
  */

  return (
    <div className="mx-auto min-h-dvh w-full max-w-7xl">
      <button
        type="button"
        onClick={() =>
          setSelectedClassId(null)
        }
        className="mb-5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        ← All Classes
      </button>

      <header className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Grade{" "}
          {selectedClass.gradeLevel}
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          {selectedClass.className}
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {activeYear?.name}
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
          label="Graduated"
          value={
            selectedClass.graduated
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

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Students
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review final results and
            administrative decisions.
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
                promotionReviewed={promotionReviewed}
              />
            ),
          )}
        </div>
      </section>

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

      <FinalResultsBlockingOverlay
        open={
          finalResultsOverlayOpen
        }
        issues={finalResultIssues}
        onClose={() =>
          setFinalResultsOverlayOpen(
            false,
          )
        }
      />

      {closeConfirmationOpen && (
        <CloseAcademicYearModal
          academicYearName={
            activeYear?.name ??
            "Current Academic Year"
          }
          closing={closing}
          onCancel={() =>
            setCloseConfirmationOpen(
              false,
            )
          }
          onConfirm={
            closeAcademicYear
          }
        />
      )}

      <FeedbackToast
        error={error}
        success={success}
      />
    </div>
  );
}

















/*
|--------------------------------------------------------------------------
| Status Step
|--------------------------------------------------------------------------
*/

function StatusStep({
  number,
  title,
  complete,
  active,
}: {
  number: string;
  title: string;
  complete: boolean;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        complete
          ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-950/30"
          : active
            ? "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30"
            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            complete
              ? "bg-green-600 text-white"
              : active
                ? "bg-blue-600 text-white"
                : "bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          {complete
            ? "✓"
            : number}
        </span>

        <div>
          <p
            className={`text-xs font-semibold ${
              complete
                ? "text-green-800 dark:text-green-300"
                : active
                  ? "text-blue-800 dark:text-blue-300"
                  : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {title}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {complete
              ? "Complete"
              : active
                ? "Current step"
                : "Waiting"}
          </p>
        </div>
      </div>
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
    <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Final Results Incomplete
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Promotion and year closing are
            blocked until the missing final
            exams or final grades are completed.
          </p>
        </div>

        <div className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
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
    <article className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900/60 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {row.student.name}
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Class:{" "}
            {row.currentClass.name}
          </p>
        </div>

        <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Final results incomplete
        </span>
      </div>

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

            return (
              <div
                key={`${issue.subjectId}-${issue.examId ?? "no-exam"}-${index}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {subjectName}
                    </p>

                    {isMissingGrade ? (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        The students final
                        result was not submitted.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        The final exam for
                        this subject was not
                        created.
                      </p>
                    )}
                  </div>

                  {isMissingGrade &&
                    issue.examId && (
                      <a
                        href={`/grades?assessmentId=${encodeURIComponent(
                          issue.examId,
                        )}&type=exam`}
                        className="inline-flex w-fit items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                      >
                        Enter / Correct Grade
                        <span className="ml-2">
                          →
                        </span>
                      </a>
                    )}

                  {!isMissingGrade && (
                    <a
                      href="/exams"
                      className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Review Exams
                      <span className="ml-2">
                        →
                      </span>
                    </a>
                  )}
                </div>

                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {isMissingGrade
                        ? "Reason:"
                        : "Status:"}
                    </span>{" "}
                    {isMissingGrade
                      ? `${row.student.name} does not have a final result for ${subjectName}.`
                      : `The final exam for ${subjectName} has not been created.`}
                  </p>
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

function StudentCard({ row, getSubjectName, onReview, promotionReviewed, }: { row: PromotionRow; getSubjectName: ( subjectId: string, ) => string; onReview: () => void; promotionReviewed: boolean; }) {
  const calculation =
    row.calculation;

  const decision =
    row.decision;

  const isPromoted =
    calculation.systemDecision ===
    "promote";

  const isGraduated =
    calculation.systemDecision ===
    "graduate";

  const isRetained =
    calculation.systemDecision ===
    "retain";

  const isIncomplete =
    calculation.systemResult ===
    "incomplete";

  const resultText =
    isGraduated
      ? "Graduation Recommended"
      : resultLabel(
          calculation.systemResult,
        );

  const resultStyle =
    isGraduated
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300"
      : resultClasses(
          calculation.systemResult,
        );

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isIncomplete
          ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20"
          : isGraduated
            ? "border-green-200 bg-green-50/40 dark:border-green-900/60 dark:bg-green-950/20"
            : isPromoted
              ? "border-green-200 bg-green-50/40 dark:border-green-900/60 dark:bg-green-950/20"
              : isRetained
                ? "border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20"
                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {row.student.name}
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Final average:{" "}
            {calculation.percentage}%
          </p>
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${resultStyle}`}
        >
          {resultText}
        </span>
      </div>

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
              .incompleteIssues.length > 0
              ? "warning"
              : "success"
          }
        />

        <SmallStat
          label="Average"
          value={`${calculation.percentage}%`}
        />
      </div>

      {calculation
        .coreSubjectFailures
        .length > 0 && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-xs font-medium text-red-800 dark:text-red-300">
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
                  <span className="text-red-700 dark:text-red-300">
                    {getSubjectName(
                      failure.subjectId,
                    )}
                  </span>

                  <span className="font-medium text-red-800 dark:text-red-300">
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

      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            System recommendation
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              calculation.systemDecision ===
              "retain"
                ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                : calculation.systemDecision ===
                    "graduate"
                  ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                  : calculation.systemDecision ===
                      "complete_results"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
            }`}
          >
            {systemDecisionLabel(
              calculation.systemDecision,
            )}
          </span>
        </div>

        {calculation.systemDecision ===
          "promote" &&
          calculation.toClassId && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Destination class is
              automatically selected.
            </p>
          )}

        {calculation.systemDecision ===
          "promote" &&
          !calculation.toClassId && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              A destination class must
              be selected by the
              Principal/Deputy.
            </p>
          )}

        {calculation.systemDecision ===
          "graduate" && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-300">
            No next-grade class exists.
            The system recommends
            graduation.
          </p>
        )}
      </div>

      {decision && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Final decision
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                decision.finalDecision ===
                  "promote" ||
                decision.finalDecision ===
                  "graduate"
                  ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              }`}
            >
              {finalDecisionLabel(
                decision.finalDecision,
              )}
            </span>
          </div>

          {decision.reason && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Reason:{" "}
              {decision.reason}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isIncomplete && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Complete all final exams and
              final grades before making a
              final decision.
            </p>
          )}

          {isGraduated && (
            <p className="text-xs text-green-700 dark:text-green-300">
              System recommends
              graduation.
            </p>
          )}

          {isPromoted && (
            <p className="text-xs text-green-700 dark:text-green-300">
              System recommends
              promotion.
            </p>
          )}

          {isRetained && (
            <p className="text-xs text-red-700 dark:text-red-300">
              System recommends
              retention.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onReview}
          disabled={
            isIncomplete ||
            !promotionReviewed
          }
          className="w-full rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:w-auto"
        >
          {isIncomplete
            ? "Results Required"
            : !promotionReviewed
              ? "Review Promotion First"
              : "Review Decision"}
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
): string {
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
): string {
  switch (result) {
    case "promoted":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300";

    case "retained":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";

    case "incomplete":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
  }
}

function systemDecisionLabel(
  decision: PromotionSystemDecision,
): string {
  switch (decision) {
    case "promote":
      return "Promote";

    case "retain":
      return "Retain";

    case "graduate":
      return "Graduate";

    case "complete_results":
      return "Final Results Required";
  }
}

function finalDecisionLabel(
  decision: string,
): string {
  switch (decision) {
    case "promote":
      return "Promote";

    case "retain":
      return "Retain";

    case "graduate":
      return "Graduate";

    default:
      return decision;
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
      "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white",

    success:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300",

    danger:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",

    warning:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
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
      "bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-white",

    success:
      "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",

    danger:
      "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",

    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
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

  const automaticResult =
    calculation.systemDecision ===
    "graduate"
      ? "Graduation Recommended"
      : resultLabel(
          calculation.systemResult,
        );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Administrative Review
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {reviewRow.student.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {reviewRow.currentClass.name}
              </p>
            </div>

            <button
              type="button"
              onClick={closeReview}
              disabled={saving}
              aria-label="Close review"
              className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Final Results
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Result
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {automaticResult}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  System Recommendation
                </p>

                <p
                  className={`mt-1 font-semibold ${
                    calculation.systemDecision ===
                    "retain"
                      ? "text-red-700 dark:text-red-300"
                      : calculation.systemDecision ===
                          "complete_results"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {systemDecisionLabel(
                    calculation.systemDecision,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Percentage
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {
                    calculation.percentage
                  }
                  %
                </p>
              </div>
            </div>
          </div>

          {calculation
            .coreSubjectFailures
            .length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300">
                Core Subject Failures
              </p>

              <div className="mt-3 space-y-2">
                {calculation.coreSubjectFailures.map(
                  (failure) => (
                    <div
                      key={
                        failure.subjectId
                      }
                      className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm dark:bg-slate-900"
                    >
                      <span className="text-red-700 dark:text-red-300">
                        {getSubjectName(
                          failure.subjectId,
                        )}
                      </span>

                      <span className="font-semibold text-red-800 dark:text-red-300">
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

          <div>
            <label
              htmlFor="final-decision"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Final Administrative Decision
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              <option value="promote">
                Promote
              </option>

              <option value="retain">
                Retain
              </option>

              <option value="graduate">
                Graduate
              </option>
            </select>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              The Principal/Deputy makes the
              final administrative decision.
            </p>
          </div>

          {finalDecision ===
            "promote" && (
            <div>
              <label
                htmlFor="destination-class"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="">
                  Select destination class
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
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                  No class exists at
                  the next grade
                  level.
                </p>
              )}
            </div>
          )}

          {finalDecision ===
            "graduate" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/60 dark:bg-green-950/30">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Graduation
              </p>

              <p className="mt-1 text-xs leading-5 text-green-700 dark:text-green-400">
                No new enrollment will be
                created for this student
                when the academic year is
                closed with a final decision
                of Graduate.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="reason"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
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
              placeholder="Reason for administrative decision..."
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-700">
          <button
            type="button"
            onClick={closeReview}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={saveDecision}
            disabled={
              saving ||
              calculation.systemResult ===
                "incomplete"
            }
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {saving
              ? "Saving..."
              : "Save Final Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Final Results Blocking Overlay
|--------------------------------------------------------------------------
*/

function FinalResultsBlockingOverlay({
  open,
  issues,
  onClose,
}: {
  open: boolean;
  issues: FinalResultIssue[];
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="final-results-incomplete-title"
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-5 dark:border-red-900/60 dark:bg-red-950/40 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
              !
            </div>

            <div className="min-w-0">
              <h2
                id="final-results-incomplete-title"
                className="text-lg font-bold text-red-900 dark:text-red-200"
              >
                Final Results Incomplete
              </h2>

              <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-300">
                The academic year cannot proceed
                to promotion review or closing
                until all required final exams
                and final results are complete.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Issues requiring attention
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {issues.length} missing final
                result issue
                {issues.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-900/50 dark:text-red-300">
              Blocked
            </span>
          </div>

          <div className="space-y-3">
            {issues.map(
              (issue, index) => {
                const missingExam =
                  issue.reason ===
                  "missing_exam";

                return (
                  <article
                    key={`${issue.studentId}-${issue.subjectId}-${issue.examId ?? "no-exam"}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              missingExam
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                            }`}
                          >
                            {missingExam
                              ? "Final Exam Missing"
                              : "Final Result Missing"}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <IssueField
                            label="Student"
                            value={
                              issue.studentName
                            }
                          />

                          <IssueField
                            label="Class"
                            value={
                              issue.className
                            }
                          />

                          <IssueField
                            label="Subject"
                            value={
                              issue.subjectName
                            }
                          />
                        </div>

                        <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                          <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {issue.message}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {missingExam ? (
                          <a
                            href="/exams"
                            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:w-auto"
                          >
                            Review Final Exams
                            <span className="ml-2">
                              →
                            </span>
                          </a>
                        ) : issue.examId ? (
                          <a
                            href={`/grades?assessmentId=${encodeURIComponent(
                              issue.examId,
                            )}&type=exam`}
                            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 lg:w-auto"
                          >
                            Enter Final Result
                            <span className="ml-2">
                              →
                            </span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Promotion and academic-year closing
              remain blocked while these issues
              exist.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:w-auto"
            >
              Review Final Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Issue Field
|--------------------------------------------------------------------------
*/

function IssueField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 wrap-break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Close Academic Year Modal
|--------------------------------------------------------------------------
*/

function CloseAcademicYearModal({
  academicYearName,
  closing,
  onCancel,
  onConfirm,
}: {
  academicYearName: string;
  closing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Final Confirmation
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            Close Academic Year
          </h2>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            You are about to close{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {academicYearName}
            </span>
            .
          </p>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              This will perform the academic
              rollover.
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">
              Promoted and retained students
              will receive next-year enrollments
              according to their final decisions.
              Graduated students will not receive
              a new enrollment.
            </p>
          </div>

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            The final administrative decisions
            have already been completed and the
            server will validate them again before
            closing the year.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={closing}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={closing}
            className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {closing
              ? "Closing..."
              : "Confirm & Close Year"}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Feedback Toast
|--------------------------------------------------------------------------
*/

function FeedbackToast({
  error,
  success,
}: {
  error: string;
  success: string;
}) {
  if (!error && !success) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-lg">
      {error && (
        <div
          role="alert"
          className="pointer-events-auto rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-xl dark:border-red-900/60 dark:bg-red-950/70 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {success && !error && (
        <div
          role="status"
          className="pointer-events-auto rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-xl dark:border-green-900/60 dark:bg-green-950/70 dark:text-green-300"
        >
          {success}
        </div>
      )}
    </div>
  );
}

