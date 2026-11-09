
"use client";

import { useState } from "react";

type Assessment = {
  id: string;
  assessment: string;
  type: string;
  score: number;
  maxScore: number;
};

type Student = {
  id: string;
  name: string;
  assessments: Assessment[];
  earned: number;
  possible: number;
  percentage: number;
};

type SchoolClass = {
  id: string;
  name: string;
  students: Student[];
  studentCount: number;
  average: number;
  assessedCount: number;
};

export default function ReportCardsClasses({
  classes,
}: {
  classes: SchoolClass[];
}) {
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  return (
    <section className="mt-8 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((schoolClass) => {
          const expanded = expandedClass === schoolClass.id;

          return (
            <button
              key={schoolClass.id}
              type="button"
              onClick={() =>
                setExpandedClass(expanded ? null : schoolClass.id)
              }
              aria-expanded={expanded}
              className={`min-w-0 rounded-xl border bg-white p-5 text-left shadow-sm transition-colors dark:bg-gray-900 ${
                expanded
                  ? "border-blue-500 ring-1 ring-blue-500"
                  : "border-gray-200 hover:border-blue-300 dark:border-gray-800 dark:hover:border-blue-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Class
                  </p>

                  <h2 className="mt-1 break-words text-xl font-bold">
                    {schoolClass.name}
                  </h2>
                </div>

                <span
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    expanded
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  {expanded ? "Open" : "View"}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Students
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {schoolClass.studentCount}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Class Average
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {schoolClass.assessedCount
                      ? `${schoolClass.average}%`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {schoolClass.assessedCount} students with recorded grades
                </span>

                <span aria-hidden="true">
                  {expanded ? "−" : "+"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {expandedClass && (
        <div className="space-y-5 pt-2">
          {classes
            .filter((schoolClass) => schoolClass.id === expandedClass)
            .map((schoolClass) => (
              <section key={schoolClass.id} aria-label={schoolClass.name}>
                <div className="flex flex-col gap-2 border-b border-gray-200 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {schoolClass.name} — Student Report Cards
                    </h2>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {schoolClass.studentCount} students
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedClass(null)}
                    className="w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    Close Class
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {schoolClass.students.map((student) => (
                    <article
                      key={student.id}
                      className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-semibold">
                            {student.name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {student.assessments.length} assessments
                          </p>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          <p className="text-2xl font-bold">
                            {student.possible
                              ? `${student.percentage}%`
                              : "—"}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Overall performance
                          </p>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5">
                        {student.assessments.length === 0 ? (
                          <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            No grades recorded for this student.
                          </p>
                        ) : (
                          <div className="max-w-full overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                                  <th className="py-3 pr-3 font-medium">
                                    Assessment
                                  </th>

                                  <th className="px-3 py-3 font-medium">
                                    Type
                                  </th>

                                  <th className="py-3 pl-3 text-right font-medium">
                                    Score
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {student.assessments.map((assessment) => (
                                  <tr
                                    key={assessment.id}
                                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                                  >
                                    <td className="break-words py-3 pr-3">
                                      {assessment.assessment}
                                    </td>

                                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                                      {assessment.type}
                                    </td>

                                    <td className="whitespace-nowrap py-3 pl-3 text-right font-medium tabular-nums">
                                      {assessment.score}/{assessment.maxScore}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {student.possible > 0 && (
                          <div className="mt-4">
                            <div
                              className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                              role="progressbar"
                              aria-label={`${student.name} overall performance`}
                              aria-valuenow={Math.min(
                                100,
                                Math.max(0, student.percentage),
                              )}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className={`h-full rounded-full ${
                                  student.percentage >= 50
                                    ? "bg-green-500"
                                    : "bg-amber-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, student.percentage),
                                  )}%`,
                                }}
                              />
                            </div>

                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Total score: {student.earned}/{student.possible}
                            </p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </section>
  );
}
