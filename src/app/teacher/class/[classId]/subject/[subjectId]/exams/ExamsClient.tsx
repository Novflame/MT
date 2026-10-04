"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import {
    getNextSequence,
    formatSequence,
} from "@/lib/sequence"

type Exam = {
    id: string
    name: string
    type: string
    examDate: string
    maxScore: number
    classId: string
    subjectId: string
    academicYearId: string
}

type ExamType =
    | "QUIZ"
    | "MONTHLY"
    | "MIDTERM"
    | "FINAL"

const EXAM_TYPES: {
    value: ExamType
    label: string
}[] = [
    {
        value: "QUIZ",
        label: "Quiz",
    },
    {
        value: "MONTHLY",
        label: "Monthly",
    },
    {
        value: "MIDTERM",
        label: "Midterm",
    },
    {
        value: "FINAL",
        label: "Final",
    },
]

type ExamsClientProps = {
    classId: string
    subjectId: string
    className: string
    gradeNumber: number
    subjectName: string
    initialExams: Exam[]
}

function createSubjectAcronym(subjectName: string) {
    const words = subjectName
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (words.length === 0) {
        return "SUB"
    }

    if (words.length > 1) {
        return words
            .map((word) => word[0])
            .join("")
            .toUpperCase()
    }

    return words[0]
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 4)
        .toUpperCase()
}

function createClassCode(className: string) {
    return className
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .toUpperCase()
}

function createExamName({
    subjectName,
    gradeNumber,
    className,
    type,
    count,
}: {
    subjectName: string
    gradeNumber: string | number
    className: string
    type: ExamType
    count: number
}) {
    const subjectAcronym =
        createSubjectAcronym(subjectName)

    const classCode =
        createClassCode(className)

    const formattedCount =
        formatSequence(count, 2)

    return [
        subjectAcronym,
        String(gradeNumber),
        classCode,
        type,
        formattedCount,
    ].join("-")
}

export default function ExamsClient({
    classId,
    subjectId,
    className,
    subjectName,
    gradeNumber,
    initialExams,
}: ExamsClientProps) {
    const router = useRouter()

    const [exams, setExams] = useState(initialExams)

    const [showModal, setShowModal] = useState(false)
    const [editingExam, setEditingExam] =
        useState<Exam | null>(null)

    const [search, setSearch] = useState("")

    const [type, setType] =
        useState<ExamType>("QUIZ")

    const [examDate, setExamDate] = useState("")
    const [maxScore, setMaxScore] = useState("")

    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] =
        useState<string | null>(null)

    const [error, setError] = useState("")

    /*
     * Count the next exam number for the selected type.
     *
     * Example:
     *
     * QUIZ:
     * existing → 01, 02, 03
     * next     → 04
     *
     * MONTHLY:
     * existing → 01
     * next     → 02
     */
  const nextCount = useMemo(() => {
    const typeNumbers = exams
        .filter((exam) => exam.type === type)
        .map((exam) => {
            const match = exam.name.match(/-(\d+)$/)

            return match
                ? Number(match[1])
                : 0
        })
        .filter((number) => number > 0)

    return getNextSequence(typeNumbers)
}, [exams, type])
    const generatedName = useMemo(() => {
        if (editingExam) {
            return editingExam.name
        }

        return createExamName({
            subjectName,
            gradeNumber,
            className,
            type,
            count: nextCount,
        })
    }, [
        editingExam,
        subjectName,
        gradeNumber,
        className,
        type,
        nextCount,
    ])

    const filteredExams = useMemo(() => {
        const query = search.trim().toLowerCase()

        if (!query) {
            return exams
        }

        return exams.filter((exam) => {
            return (
                exam.name
                    .toLowerCase()
                    .includes(query) ||
                exam.type
                    .toLowerCase()
                    .includes(query) ||
                exam.examDate.includes(query)
            )
        })
    }, [exams, search])

    function resetForm() {
        setType("QUIZ")
        setExamDate("")
        setMaxScore("")
        setError("")
    }

    function openCreate() {
        resetForm()
        setEditingExam(null)
        setShowModal(true)
    }

    function openEdit(exam: Exam) {
        setEditingExam(exam)

        setType(
            EXAM_TYPES.some(
                (item) => item.value === exam.type,
            )
                ? (exam.type as ExamType)
                : "QUIZ",
        )

        setExamDate(exam.examDate)
        setMaxScore(String(exam.maxScore))

        setError("")
        setShowModal(true)
    }

    function closeModal() {
        if (saving) return

        setShowModal(false)
        setEditingExam(null)
        resetForm()
    }

    async function saveExam() {
        setError("")

        const trimmedDate = examDate.trim()
        const score = Number(maxScore)

        if (!trimmedDate) {
            setError("Exam date is required.")
            return
        }

        if (!Number.isInteger(score) || score <= 0) {
            setError(
                "Maximum score must be a positive whole number.",
            )
            return
        }

        setSaving(true)

        try {
            if (editingExam) {
                const response = await fetch(
                    "/api/exams",
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            id: editingExam.id,
                            name: editingExam.name,
                            type: editingExam.type,
                            examDate: trimmedDate,
                            maxScore: score,
                        }),
                    },
                )

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(
                        data?.error ||
                            "Failed to update exam.",
                    )
                }

                const updatedExam = data

                setExams((current) =>
                    current.map((exam) =>
                        exam.id === editingExam.id
                            ? {
                                  ...exam,
                                  name: updatedExam.name,
                                  type: updatedExam.type,
                                  examDate:
                                      updatedExam.examDate,
                                  maxScore:
                                      updatedExam.maxScore,
                              }
                            : exam,
                    ),
                )
            } else {
                const response = await fetch(
                    "/api/exams",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            name: generatedName,
                            subjectId,
                            classId,
                            type,
                            examDate: trimmedDate,
                            maxScore: score,
                        }),
                    },
                )

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(
                        data?.error ||
                            "Failed to create exam.",
                    )
                }

                const createdExam = data

                setExams((current) => [
                    {
                        id: createdExam.id,
                        name: createdExam.name,
                        type: createdExam.type,
                        examDate:
                            createdExam.examDate,
                        maxScore:
                            createdExam.maxScore,
                        classId:
                            createdExam.classId,
                        subjectId:
                            createdExam.subjectId,
                        academicYearId:
                            createdExam.academicYearId,
                    },
                    ...current,
                ])
            }

            closeModal()
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong.",
            )
        } finally {
            setSaving(false)
        }
    }

    async function deleteExam(exam: Exam) {
        const confirmed = window.confirm(
            `Delete "${exam.name}"?\n\nThis action cannot be undone.`,
        )

        if (!confirmed) {
            return
        }

        setDeletingId(exam.id)
        setError("")

        try {
            const response = await fetch(
                `/api/exams?id=${encodeURIComponent(
                    exam.id,
                )}`,
                {
                    method: "DELETE",
                },
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                        "Failed to delete exam.",
                )
            }

            setExams((current) =>
                current.filter(
                    (item) => item.id !== exam.id,
                ),
            )
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong.",
            )
        } finally {
            setDeletingId(null)
        }
    }

    function manageGrades(examId: string) {
        router.push(
            `/teacher/class/${classId}/subject/${subjectId}/exams/${examId}/grades`,
        )
    }

    return (
        <>
            <section className="min-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {/* HEADER */}
                <header className="border-b border-slate-200 px-6 py-7 sm:px-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                                <span>Teacher</span>
                                <span>/</span>
                                <span>Exams</span>
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                Exams
                            </h1>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                                    {className}
                                </span>

                                <span className="text-slate-300">
                                    •
                                </span>

                                <span className="text-sm text-slate-500">
                                    {subjectName}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
                        >
                            <span className="text-xl leading-none">
                                +
                            </span>

                            Create Exam
                        </button>
                    </div>
                </header>

                {/* TOOLBAR */}
                <div className="border-b border-slate-200 bg-slate-50/60 px-6 py-4 sm:px-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Search exams..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:max-w-md"
                        />

                        <span className="text-sm text-slate-500">
                            {filteredExams.length}{" "}
                            {filteredExams.length === 1
                                ? "exam"
                                : "exams"}
                        </span>
                    </div>
                </div>

                {/* GLOBAL ERROR */}
                {error && !showModal && (
                    <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-8">
                        {error}
                    </div>
                )}

                {/* CONTENT */}
                <div className="p-6 sm:p-8">
                    {filteredExams.length === 0 ? (
                        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-slate-200">
                                📋
                            </div>

                            <h2 className="text-lg font-bold text-slate-900">
                                {search
                                    ? "No exams found"
                                    : "No exams yet"}
                            </h2>

                            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                                {search
                                    ? "Try another search term."
                                    : "There are no exams for this class and subject yet."}
                            </p>

                            {!search && (
                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                    Create Exam
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <AnimatePresence mode="popLayout">
                                {filteredExams.map(
                                    (exam) => (
                                        <motion.article
                                            key={exam.id}
                                            layout
                                            initial={{
                                                opacity: 0,
                                                y: 12,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                scale: 0.97,
                                            }}
                                            transition={{
                                                duration: 0.2,
                                            }}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                            {
                                                                exam.type
                                                            }
                                                        </span>

                                                        <span className="text-xs text-slate-400">
                                                            {
                                                                exam.examDate
                                                            }
                                                        </span>
                                                    </div>

                                                    <h2 className="truncate text-lg font-bold text-slate-900">
                                                        {
                                                            exam.name
                                                        }
                                                    </h2>

                                                    <p className="mt-2 text-sm text-slate-500">
                                                        Maximum
                                                        score:{" "}
                                                        <strong className="text-slate-700">
                                                            {
                                                                exam.maxScore
                                                            }
                                                        </strong>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-6 grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        manageGrades(
                                                            exam.id,
                                                        )
                                                    }
                                                    className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                >
                                                    Manage
                                                    Grades
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEdit(
                                                            exam,
                                                        )
                                                    }
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={
                                                    deletingId ===
                                                    exam.id
                                                }
                                                onClick={() =>
                                                    deleteExam(
                                                        exam,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {deletingId ===
                                                exam.id
                                                    ? "Deleting..."
                                                    : "Delete Exam"}
                                            </button>
                                        </motion.article>
                                    ),
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </section>

            {/* CREATE / EDIT MODAL */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeModal()
                            }
                        }}
                    >
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 20,
                                scale: 0.98,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                            }}
                            exit={{
                                opacity: 0,
                                y: 10,
                                scale: 0.98,
                            }}
                            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
                        >
                            <div className="border-b border-slate-200 px-6 py-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">
                                            {editingExam
                                                ? "Edit Exam"
                                                : "Create Exam"}
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {className} ·{" "}
                                            {subjectName}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        disabled={saving}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5 px-6 py-6">
                                {error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                {/* GENERATED EXAM NAME */}
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Exam name
                                    </label>

                                    <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-semibold text-slate-700">
                                        {generatedName}
                                    </div>

                                    {!editingExam && (
                                        <p className="mt-2 text-xs text-slate-400">
                                            Automatically generated
                                            from subject, grade,
                                            class, type and count.
                                        </p>
                                    )}
                                </div>

                                {/* EXAM TYPE */}
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Exam type
                                    </label>

                                    <select
                                        value={type}
                                        onChange={(event) =>
                                            setType(
                                                event.target
                                                    .value as ExamType,
                                            )
                                        }
                                        disabled={Boolean(
                                            editingExam,
                                        )}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        {EXAM_TYPES.map(
                                            (examType) => (
                                                <option
                                                    key={
                                                        examType.value
                                                    }
                                                    value={
                                                        examType.value
                                                    }
                                                >
                                                    {
                                                        examType.label
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                {/* COUNT PREVIEW */}
                                {!editingExam && (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">
                                                Exam count
                                            </span>

                                            <span className="font-mono text-sm font-bold text-slate-900">
                                                {formatSequence(
                                                    nextCount,
                                                    2,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Exam date
                                        </label>

                                        <input
                                            type="date"
                                            value={examDate}
                                            onChange={(event) =>
                                                setExamDate(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Maximum score
                                        </label>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={maxScore}
                                            onChange={(event) =>
                                                setMaxScore(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={saveExam}
                                    disabled={saving}
                                    className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingExam
                                          ? "Save Changes"
                                          : "Create Exam"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}