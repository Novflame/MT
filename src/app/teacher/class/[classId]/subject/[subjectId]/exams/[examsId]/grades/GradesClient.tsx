

"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"

type Grade = {
    id: string
    score: number
    note: string | null
}

type Student = {
    enrollmentId: string
    studentId: string
    firstName: string
    middleName: string
    lastName: string
    grade: Grade | null
}

type GradesClientProps = {
    classId: string
    subjectId: string
    examId: string
    className: string
    subjectName: string
    teacherName: string
    exam: {
        id: string
        name: string
        type: string
        examDate: string
        maxScore: number
    }
    initialStudents: Student[]
}

type ScoreValues = Record<string, string>

type Feedback = {
    type: "success" | "error" | "missing"
    studentId: string
    message: string
}

function getStudentName(student: Student) {
    return [
        student.firstName,
        student.middleName,
        student.lastName,
    ]
        .filter(Boolean)
        .join(" ")
}

export default function GradesClient({
    classId,
    subjectId,
    examId,
    className,
    subjectName,
    teacherName,
    exam,
    initialStudents,
}: GradesClientProps) {
    const router = useRouter()

    const [scores, setScores] = useState<ScoreValues>(() => {
        const values: ScoreValues = {}

        for (const student of initialStudents) {
            values[student.enrollmentId] =
                student.grade !== null
                    ? String(student.grade.score)
                    : ""
        }

        return values
    })

    

    const [search, setSearch] = useState("")
    const [savingId, setSavingId] = useState<string | null>(null)
    const [savedIds, setSavedIds] = useState<Set<string>>(
        new Set(),
    )

    const [feedback, setFeedback] =
        useState<Feedback | null>(null)

    const filteredStudents = useMemo(() => {
        const value = search.trim().toLowerCase()

        if (!value) {
            return initialStudents
        }

        return initialStudents.filter((student) =>
            getStudentName(student)
                .toLowerCase()
                .includes(value),
        )
    }, [initialStudents, search])

    const gradedCount = initialStudents.filter(
        (student) => {
            const score = scores[student.enrollmentId]

            return score !== undefined && score !== ""
        },
    ).length

    const remainingCount =
        initialStudents.length - gradedCount

    function showFeedback(
        nextFeedback: Feedback,
    ) {
        setFeedback(nextFeedback)

        window.setTimeout(() => {
            setFeedback((current) => {
                if (
                    current?.studentId ===
                        nextFeedback.studentId &&
                    current?.message ===
                        nextFeedback.message
                ) {
                    return null
                }

                return current
            })
        }, 1000)
    }

    function updateScore(
        enrollmentId: string,
        value: string,
    ) {
        if (value === "") {
            setScores((current) => ({
                ...current,
                [enrollmentId]: "",
            }))

            setSavedIds((current) => {
                const next = new Set(current)
                next.delete(enrollmentId)
                return next
            })

            return
        }

        if (!/^\d*$/.test(value)) {
            return
        }

        const numericValue = Number(value)

        if (numericValue > exam.maxScore) {
            return
        }

        setScores((current) => ({
            ...current,
            [enrollmentId]: value,
        }))

        setSavedIds((current) => {
            const next = new Set(current)
            next.delete(enrollmentId)
            return next
        })
    }

 
    async function saveGrade(student: Student) {
        const enrollmentId = student.enrollmentId
        const studentName = getStudentName(student)
        const rawScore =
            scores[enrollmentId] ?? ""

        if (rawScore === "") {
            showFeedback({
                type: "missing",
                studentId: enrollmentId,
                message: "Grade is required",
            })

            return
        }

        const score = Number(rawScore)

        if (
            !Number.isInteger(score) ||
            score < 0 ||
            score > exam.maxScore
        ) {
            showFeedback({
                type: "error",
                studentId: enrollmentId,
                message: `Score must be between 0 and ${exam.maxScore}`,
            })

            return
        }

        setSavingId(enrollmentId)

        try {
            const response = await fetch(
                "/api/grades",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        studentEnrollmentId:
                            enrollmentId,
                        examId,
                        score,
                       
                    }),
                },
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                        "Failed to save grade.",
                )
            }

            setSavedIds((current) => {
                const next = new Set(current)
                next.add(enrollmentId)
                return next
            })

            showFeedback({
                type: "success",
                studentId: enrollmentId,
                message: `Saved — ${studentName}`,
            })

            router.refresh()
        } catch (error) {
            showFeedback({
                type: "error",
                studentId: enrollmentId,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to save grade.",
            })
        } finally {
            setSavingId(null)
        }
    }

    function goBack() {
        router.push(
            `/teacher/class/${classId}/subject/${subjectId}/exams`,
        )
    }

    return (
        <div className="flex h-[calc(100dvh-2rem)] min-h-0 flex-col gap-3">
            {/* HEADER */}
            <header className="shrink-0 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">
                                Teacher:
                            </span>

                            <span className="`max-w- 45` truncate font-semibold text-slate-900 sm:max-w-none">
                                {teacherName}
                            </span>

                            <span className="hidden text-slate-300 sm:inline">
                                /
                            </span>

                            <span className="hidden sm:inline">
                                {className}
                            </span>

                            <span className="hidden text-slate-300 sm:inline">
                                /
                            </span>

                            <span className="hidden sm:inline">
                                {subjectName}
                            </span>
                        </div>

                        <div className="mt-1.5 flex min-w-0 items-center gap-3">
                            <h1 className="min-w-0 truncate text-base font-bold text-slate-900 sm:text-lg">
                                {exam.name}
                            </h1>

                            <span className="shrink-0 text-xs text-slate-500">
                                {exam.examDate}
                            </span>
                        </div>

                        <div className="mt-1 text-[11px] text-slate-400 sm:hidden">
                            {className} / {subjectName}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={goBack}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm"
                    >
                        ← Back
                    </button>
                </div>
            </header>

            {/* SUMMARY */}
            <section className="grid shrink-0 grid-cols-4 gap-2 sm:gap-3">
                <Summary
                    label="Students"
                    value={initialStudents.length}
                />

                <Summary
                    label="Graded"
                    value={gradedCount}
                    valueClass="text-emerald-600"
                />

                <Summary
                    label="Remaining"
                    value={remainingCount}
                    valueClass={
                        remainingCount
                            ? "text-amber-600"
                            : "text-emerald-600"
                    }
                />

                <Summary
                    label="Max"
                    value={exam.maxScore}
                />
            </section>

            {/* MAIN PANEL */}
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                {/* PANEL TOOLBAR */}
                <div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                                Student Grades
                            </h2>

                            <p className="hidden text-xs text-slate-500 sm:block">
                                Enter each students score out of{" "}
                                {exam.maxScore}.
                            </p>
                        </div>

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Search..."
                            className="w-32 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 sm:w-56 sm:text-sm"
                        />
                    </div>
                </div>

                {/* SCROLL AREA */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {/* DESKTOP */}
                    <div className="hidden sm:block">
                        <div className="sticky top-0 z-20 grid grid-cols-[50px_minmax(0,1fr)_210px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            <div>#</div>
                            <div>Student</div>
                            <div>Score</div>
                        </div>

                        {filteredStudents.map(
                            (student, index) => (
                                <StudentRow
                                    key={
                                        student.enrollmentId
                                    }
                                    student={student}
                                    index={index}
                                    score={
                                        scores[
                                            student
                                                .enrollmentId
                                        ] ?? ""
                                    }
                                    saving={
                                        savingId ===
                                        student.enrollmentId
                                    }
                                    saved={savedIds.has(
                                        student.enrollmentId,
                                    )}
                                    maxScore={
                                        exam.maxScore
                                    }
                                    onScoreChange={
                                        updateScore
                                    }
                                    onSave={
                                        saveGrade
                                    }
                                />
                            ),
                        )}
                    </div>

                    {/* MOBILE */}
                    <div className="sm:hidden">
                        <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            <div className="grid grid-cols-[28px_minmax(0,1fr)_145px] gap-2">
                                <span>#</span>
                                <span>Student</span>
                                <span>Score</span>
                            </div>
                        </div>

                        {filteredStudents.map(
                            (student, index) => (
                                <MobileStudentRow
                                    key={
                                        student.enrollmentId
                                    }
                                    student={student}
                                    index={index}
                                    score={
                                        scores[
                                            student
                                                .enrollmentId
                                        ] ?? ""
                                    }
                                    saving={
                                        savingId ===
                                        student.enrollmentId
                                    }
                                    saved={savedIds.has(
                                        student.enrollmentId,
                                    )}
                                    maxScore={
                                        exam.maxScore
                                    }
                                    onScoreChange={
                                        updateScore
                                    }
                                    onSave={
                                        saveGrade
                                    }
                                />
                            ),
                        )}
                    </div>

                    {filteredStudents.length === 0 && (
                        <div className="px-5 py-12 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                No students found
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Try another search.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* FEEDBACK */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 15,
                            scale: 0.96,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                        }}
                        exit={{
                            opacity: 0,
                            y: 10,
                            scale: 0.96,
                        }}
                        transition={{
                            duration: 0.18,
                        }}
                        className={`fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg sm:text-sm ${
                            feedback.type ===
                            "success"
                                ? "bg-emerald-600 text-white"
                                : feedback.type ===
                                    "missing"
                                  ? "bg-amber-500 text-white"
                                  : "bg-red-600 text-white"
                        }`}
                    >
                        <motion.span
                            initial={{
                                scale: 0,
                            }}
                            animate={{
                                scale: 1,
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"
                        >
                            {feedback.type ===
                                "success" && "✓"}

                            {feedback.type ===
                                "missing" && "!"}

                            {feedback.type ===
                                "error" && "×"}
                        </motion.span>

                        {feedback.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ---------------------------------- */
/* DESKTOP ROW */
/* ---------------------------------- */

function StudentRow({
    student,
    index,
    score,
    saving,
    saved,
    maxScore,
    onScoreChange,
    onSave,
}: {
    student: Student
    index: number
    score: string
    saving: boolean
    saved: boolean
    maxScore: number
    onScoreChange: (
        enrollmentId: string,
        value: string,
    ) => void
    onSave: (student: Student) => void
}) {
    const missing = score === ""

    return (
        <div
            className={`grid grid-cols-[50px_minmax(0,1fr)_210px] items-center gap-4 border-b px-5 py-3 transition ${
                missing
                    ? "border-slate-100"
                    : "border-emerald-100/70"
            } hover:bg-slate-50`}
        >
            <span className="text-xs font-semibold text-slate-400">
                {index + 1}
            </span>

            <div className="flex min-w-0 items-center gap-3">
                <Avatar student={student} />

                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                        {getStudentName(student)}
                    </p>

                    <p className="truncate text-[11px] text-slate-400">
                        {student.studentId}
                    </p>
                </div>
            </div>

            <ScoreControls
                student={student}
                score={score}
                saving={saving}
                saved={saved}
                missing={missing}
                maxScore={maxScore}
                onScoreChange={onScoreChange}
                onSave={onSave}
            />
        </div>
    )
}

/* ---------------------------------- */
/* MOBILE ROW */
/* ---------------------------------- */

function MobileStudentRow({
    student,
    index,
    score,
    saving,
    saved,
    maxScore,
    onScoreChange,
    onSave,
}: {
    student: Student
    index: number
    score: string
    saving: boolean
    saved: boolean
    maxScore: number
    onScoreChange: (
        enrollmentId: string,
        value: string,
    ) => void
    onSave: (student: Student) => void
}) {
    const missing = score === ""

    return (
        <motion.div
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: 1,
            }}
            className={`border-b px-3 py-3 ${
                missing
                    ? "border-slate-100"
                    : "border-emerald-100/70"
            }`}
        >
            <div className="grid grid-cols-[28px_minmax(0,1fr)_145px] items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400">
                    {index + 1}
                </span>

                <div className="flex min-w-0 items-center gap-2">
                    <Avatar
                        student={student}
                        small
                    />

                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">
                            {getStudentName(student)}
                        </p>

                        <p className="truncate text-[10px] text-slate-400">
                            {student.studentId}
                        </p>
                    </div>
                </div>

                <ScoreControls
                    student={student}
                    score={score}
                    saving={saving}
                    saved={saved}
                    missing={missing}
                    maxScore={maxScore}
                    mobile
                    onScoreChange={onScoreChange}
                    onSave={onSave}
                />
            </div>
        </motion.div>
    )
}

/* ---------------------------------- */
/* SCORE CONTROLS */
/* ---------------------------------- */

function ScoreControls({
    student,
    score,
    saving,
    saved,
    missing,
    maxScore,
    mobile = false,
    onScoreChange,
    onSave,
}: {
    student: Student
    score: string
    saving: boolean
    saved: boolean
    missing: boolean
    maxScore: number
    mobile?: boolean
    onScoreChange: (
        enrollmentId: string,
        value: string,
    ) => void
    onSave: (student: Student) => void
}) {
    return (
        <div
            className={`flex items-center ${
                mobile
                    ? "gap-1.5"
                    : "gap-2"
            }`}
        >
            <motion.div
                animate={
                    missing
                        ? {
                              borderColor: [
                                  "rgb(226 232 240)",
                                  "rgb(251 191 36)",
                                  "rgb(226 232 240)",
                              ],
                          }
                        : {}
                }
                transition={{
                    duration: 0.8,
                }}
                className={`flex shrink-0 items-center rounded-lg border bg-white ${
                    mobile
                        ? "h-9"
                        : "h-10"
                } ${
                    missing
                        ? "border-amber-300"
                        : "border-slate-200"
                }`}
            >
                <input
                    type="number"
                    min="0"
                    max={maxScore}
                    step="1"
                    value={score}
                    onChange={(event) =>
                        onScoreChange(
                            student.enrollmentId,
                            event.target.value,
                        )
                    }
                    placeholder="—"
                    className={`bg-transparent text-center font-bold text-slate-900 outline-none ${
                        mobile
                            ? "w-12 text-xs"
                            : "w-16 text-sm"
                    }`}
                />

                <span
                    className={`pr-2 font-semibold text-slate-400 ${
                        mobile
                            ? "text-[9px]"
                            : "text-[10px]"
                    }`}
                >
                    /{maxScore}
                </span>
            </motion.div>

            <motion.button
                type="button"
                disabled={saving}
                onClick={() => onSave(student)}
                whileTap={{
                    scale: 0.95,
                }}
                className={`shrink-0 rounded-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    mobile
                        ? "px-2.5 py-2 text-[10px]"
                        : "px-3.5 py-2.5 text-xs"
                } ${
                    saved
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-slate-900 hover:bg-slate-800"
                }`}
            >
                {saving
                    ? "..."
                    : saved
                      ? "✓"
                      : "Save"}
            </motion.button>
        </div>
    )
}

/* ---------------------------------- */
/* AVATAR */
/* ---------------------------------- */

function Avatar({
    student,
    small = false,
}: {
    student: Student
    small?: boolean
}) {
    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 ${
                small
                    ? "h-7 w-7 text-[10px]"
                    : "h-9 w-9 text-xs"
            }`}
        >
            {student.firstName
                .charAt(0)
                .toUpperCase()}
        </div>
    )
}

/* ---------------------------------- */
/* SUMMARY */
/* ---------------------------------- */

function Summary({
    label,
    value,
    valueClass = "text-slate-900",
}: {
    label: string
    value: number
    valueClass?: string
}) {
    return (
        <div className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200 sm:px-4 sm:py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                {label}
            </p>

            <p
                className={`mt-0.5 text-base font-bold sm:text-lg ${valueClass}`}
            >
                {value}
            </p>
        </div>
    )
}

