
"use client"

import { useState } from "react"

type AssessmentEnrollment = {
    id: string

    student: {
        name: string
    }
}

type Assessment = {
    id: string
    name: string
    maxScore: number
    subjectId: string
    classId: string

    kind:
        | "test"
        | "exam"

    pendingEnrollments:
        AssessmentEnrollment[]
}

type Subject = {
    id: string
    name: string
}

type Props = {
    assessments: Assessment[]
    subjects: Subject[]
}

export default function GradesManager({
    assessments,
    subjects,
}: Props) {
    const [
        assessment,
        setAssessment,
    ] = useState("")

    const [
        scores,
        setScores,
    ] = useState<Record<string, string>>({})

    const [
        saving,
        setSaving,
    ] = useState(false)

    // =========================================================
    // Selected assessment
    // =========================================================

    const selected =
        assessments.find(
            (item) =>
                `${item.kind}-${item.id}` ===
                assessment,
        )

    // =========================================================
    // Subject name
    // =========================================================

    function getSubjectName(
        subjectId: string,
    ) {
        return (
            subjects.find(
                (subject) =>
                    subject.id ===
                    subjectId,
            )?.name ??
            "Unknown subject"
        )
    }

    // =========================================================
    // Save grades
    // =========================================================

    async function save() {
        if (!selected) {
            return
        }

        setSaving(true)

        try {
            const studentsToSave =
                selected.pendingEnrollments

            for (
                const enrollment
                of studentsToSave
            ) {
                const score =
                    scores[
                        enrollment.id
                    ]

                if (
                    score === undefined ||
                    score === ""
                ) {
                    continue
                }

                const numericScore =
                    Number(score)

                if (
                    !Number.isFinite(
                        numericScore,
                    ) ||
                    numericScore < 0 ||
                    numericScore >
                        selected.maxScore
                ) {
                    throw new Error(
                        `Invalid score for ${enrollment.student.name}`,
                    )
                }

                const response =
                    await fetch(
                        "/api/grades",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body:
                                JSON.stringify({
                                    studentEnrollmentId:
                                        enrollment.id,

                                    score:
                                        numericScore,

                                    ...(selected.kind ===
                                    "test"
                                        ? {
                                            testId:
                                                selected.id,
                                        }
                                        : {
                                            examId:
                                                selected.id,
                                        }),
                                }),
                        },
                    )

                if (
                    !response.ok
                ) {
                    const data =
                        await response.json()

                    throw new Error(
                        data.error ??
                            "Failed to save grade",
                    )
                }
            }

            /*
             * Reload the page.
             *
             * The Server Component will query the database
             * again and remove students who now have grades.
             */

            window.location.reload()
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to save grades",
            )
        } finally {
            setSaving(false)
        }
    }

    // =========================================================
    // Empty state
    // =========================================================

    if (
        assessments.length === 0
    ) {
        return (
            <section className="min-w-0 rounded-lg border bg-white p-4 sm:p-6">
                <h2 className="text-xl font-semibold">
                    Enter Grades
                </h2>

                <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
                    <p className="font-medium text-green-800">
                        All assessments are completed.
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                        There are no students with
                        missing grades for this class.
                    </p>
                </div>
            </section>
        )
    }

    // =========================================================
    // Render
    // =========================================================

    return (
        <section className="min-w-0 rounded-lg border bg-white p-4 sm:p-6">

            <h2 className="text-xl font-semibold">
                Enter Grades
            </h2>

            <p className="mt-1 text-sm text-gray-500">
                Only students who still need a grade
                are shown.
            </p>

            {/* Assessment selector */}

            <select
                className="mt-4 w-full rounded border px-3 py-2"
                value={assessment}
                onChange={(event) => {
                    setAssessment(
                        event.target.value,
                    )

                    setScores({})
                }}
            >
                <option value="">
                    Select assessment
                </option>

                {assessments.map(
                    (item) => (
                        <option
                            key={`${item.kind}-${item.id}`}
                            value={`${item.kind}-${item.id}`}
                        >
                            {getSubjectName(
                                item.subjectId,
                            )}

                            {" · "}

                            {item.name}

                            {" · "}

                            {item.kind.toUpperCase()}

                            {" · max "}

                            {item.maxScore}

                            {" · "}

                            {
                                item
                                    .pendingEnrollments
                                    .length
                            }

                            {" students pending"}
                        </option>
                    ),
                )}
            </select>

            {/* Selected assessment */}

            {selected && (
                <div className="mt-5">

                    {/* Assessment information */}

                    <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-900">
                            {
                                getSubjectName(
                                    selected.subjectId,
                                )
                            }

                            {" · "}

                            {
                                selected.name
                            }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                            {
                                selected.kind.toUpperCase()
                            }

                            {" · Maximum score: "}

                            {
                                selected.maxScore
                            }

                            {" · Students remaining: "}

                            {
                                selected
                                    .pendingEnrollments
                                    .length
                            }
                        </p>
                    </div>

                    {/* Students */}

                    <div className="mt-4 space-y-2">
                        {selected.pendingEnrollments.map(
                            (
                                enrollment,
                            ) => (
                                <div
                                    key={
                                        enrollment.id
                                    }
                                    className="flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <span className="font-medium">
                                        {
                                            enrollment
                                                .student
                                                .name
                                        }
                                    </span>

                                    <input
                                        className="w-full rounded border px-3 py-2 sm:w-32"
                                        type="number"
                                        min="0"
                                        max={
                                            selected.maxScore
                                        }
                                        value={
                                            scores[
                                                enrollment.id
                                            ] ??
                                            ""
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setScores(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,

                                                    [enrollment.id]:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        placeholder={`/${selected.maxScore}`}
                                    />
                                </div>
                            ),
                        )}
                    </div>

                    {/* Save */}

                    <button
                        type="button"
                        disabled={
                            saving
                        }
                        onClick={
                            save
                        }
                        className="mt-4 w-full rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {saving
                            ? "Saving..."
                            : "Save grades"}
                    </button>
                </div>
            )}
        </section>
    )
}
