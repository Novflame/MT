
"use client"

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"


// ============================================================
// Types
// ============================================================

type ResultSubject = {
    subjectId: string
    subjectName: string

    examId: string | null
    examName: string | null

    score: number | null
    maxScore: number | null

    percentage: number | null
    letter: string | null

    status:
        | "completed"
        | "missing"
}


type ResultStudent = {
    id: string
    name: string
}


type ResultClass = {
    id: string
    name: string
}


type Result = {
    enrollmentId: string
    academicYearId: string

    student: ResultStudent
    class: ResultClass

    status:
        | "complete"
        | "incomplete"

    earned: number
    possible: number
    percentage: number
    letter: string | null

    completedSubjects: number
    totalSubjects: number

    missingSubjects: ResultSubject[]

    subjects: ResultSubject[]
}


type StudentOption = {
    id: string
    name: string
}


type ClassOption = {
    id: string
    name: string
}


type ResultsManagerProps = {
    students?: StudentOption[]
    classes?: ClassOption[]
}


// ============================================================
// Component
// ============================================================

export default function ResultsManager({
    students = [],
    classes = [],
}: ResultsManagerProps) {

    const [results, setResults] =
        useState<Result[]>([])

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState("")

    const [studentId, setStudentId] =
        useState("")

    const [classId, setClassId] =
        useState("")

    const [search, setSearch] =
        useState("")

    const [expanded, setExpanded] =
        useState<string | null>(null)


    // ============================================================
// Load results
// ============================================================

const loadResults = useCallback(async () => {

    const params =
        new URLSearchParams()

    if (studentId) {
        params.set(
            "studentId",
            studentId,
        )
    }

    if (classId) {
        params.set(
            "classId",
            classId,
        )
    }

    const query =
        params.toString()

    const url =
        query
            ? `/api/results?${query}`
            : "/api/results"


    const response =
        await fetch(url, {
            method: "GET",
            cache: "no-store",
        })


    const data =
        await response.json()


    if (!response.ok) {
        throw new Error(
            data?.error ??
            "Failed to load results",
        )
    }


    if (!Array.isArray(data)) {
        throw new Error(
            "Invalid results response",
        )
    }


    return data as Result[]

}, [
    classId,
    studentId,
])


  // ============================================================
// Fetch when filters change
// ============================================================

useEffect(() => {

    let cancelled = false


    async function fetchResults() {

        setLoading(true)
        setError("")


        try {

            const data =
                await loadResults()


            if (cancelled) {
                return
            }


            setResults(data)

        } catch (err) {

            if (cancelled) {
                return
            }


            setResults([])

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load results",
            )

        } finally {

            if (!cancelled) {
                setLoading(false)
            }

        }

    }


    void fetchResults()


    return () => {
        cancelled = true
    }

}, [loadResults])

    // ============================================================
    // Search
    // ============================================================

    const filteredResults =
        useMemo(() => {

            const value =
                search
                    .trim()
                    .toLowerCase()


            if (!value) {
                return results
            }


            return results.filter(
                (result) => {

                    const studentName =
                        result.student.name
                            .toLowerCase()

                    const className =
                        result.class.name
                            .toLowerCase()


                    const subjectMatch =
                        result.subjects.some(
                            (subject) =>
                                subject.subjectName
                                    .toLowerCase()
                                    .includes(value),
                        )


                    return (
                        studentName.includes(value)
                        ||
                        className.includes(value)
                        ||
                        subjectMatch
                    )
                },
            )

        }, [
            results,
            search,
        ])


    // ============================================================
    // Toggle details
    // ============================================================

    function toggleResult(
        enrollmentId: string,
    ) {

        setExpanded(
            (current) =>
                current === enrollmentId
                    ? null
                    : enrollmentId,
        )
    }


    // ============================================================
    // Clear filters
    // ============================================================

    function clearFilters() {

        setStudentId("")
        setClassId("")
        setSearch("")
        setExpanded(null)
    }


    // ============================================================
    // Grade style
    // ============================================================

    function gradeClass(
        grade: string | null,
    ) {

        if (!grade) {
            return "text-gray-500"
        }


        if (
            grade === "A+"
            ||
            grade === "A"
        ) {
            return "font-semibold text-green-700"
        }


        if (
            grade === "B"
            ||
            grade === "C"
        ) {
            return "font-semibold text-blue-700"
        }


        if (grade === "D") {
            return "font-semibold text-yellow-700"
        }


        return "font-semibold text-red-700"
    }


    // ============================================================
    // Status style
    // ============================================================

    function statusClass(
        status: Result["status"],
    ) {

        return status === "complete"
            ? "text-green-700"
            : "text-orange-700"
    }


    // ============================================================
    // Render
    // ============================================================

    return (
        <section className="space-y-6">

            {/* ================================================== */}
            {/* Filters */}
            {/* ================================================== */}

            <div className="rounded-lg border bg-white p-6">

                <div className="flex flex-col gap-4">

                    <div>

                        <h2 className="text-xl font-semibold">
                            Student Results
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Final examination results by student
                            and subject.
                        </p>

                    </div>


                    <div className="grid gap-4 md:grid-cols-3">

                        {/* Search */}

                        <div>

                            <label
                                htmlFor="result-search"
                                className="mb-1 block text-sm font-medium"
                            >
                                Search
                            </label>

                            <input
                                id="result-search"
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="Student, class or subject..."
                                className="w-full rounded border px-3 py-2"
                            />

                        </div>


                        {/* Student */}

                        <div>

                            <label
                                htmlFor="result-student"
                                className="mb-1 block text-sm font-medium"
                            >
                                Student
                            </label>

                            <select
                                id="result-student"
                                value={studentId}
                                onChange={(event) =>
                                    setStudentId(
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded border px-3 py-2"
                            >

                                <option value="">
                                    All students
                                </option>

                                {students.map(
                                    (student) => (
                                        <option
                                            key={student.id}
                                            value={student.id}
                                        >
                                            {student.name}
                                        </option>
                                    ),
                                )}

                            </select>

                        </div>


                        {/* Class */}

                        <div>

                            <label
                                htmlFor="result-class"
                                className="mb-1 block text-sm font-medium"
                            >
                                Class
                            </label>

                            <select
                                id="result-class"
                                value={classId}
                                onChange={(event) =>
                                    setClassId(
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded border px-3 py-2"
                            >

                                <option value="">
                                    All classes
                                </option>

                                {classes.map(
                                    (item) => (
                                        <option
                                            key={item.id}
                                            value={item.id}
                                        >
                                            {item.name}
                                        </option>
                                    ),
                                )}

                            </select>

                        </div>

                    </div>


                    {(studentId ||
                        classId ||
                        search) && (

                        <div>

                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
                            >
                                Clear filters
                            </button>

                        </div>

                    )}

                </div>

            </div>


            {/* ================================================== */}
            {/* Loading */}
            {/* ================================================== */}

            {loading && (

                <div className="rounded-lg border bg-white p-6 text-gray-500">
                    Loading results...
                </div>

            )}


            {/* ================================================== */}
            {/* Error */}
            {/* ================================================== */}

            {!loading && error && (

                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">

                    <p className="font-medium">
                        Unable to load results
                    </p>

                    <p className="mt-1 text-sm">
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            void loadResults()
                        }
                        className="mt-4 rounded bg-red-700 px-4 py-2 text-sm text-white"
                    >
                        Try again
                    </button>

                </div>

            )}


            {/* ================================================== */}
            {/* Results */}
            {/* ================================================== */}

            {!loading && !error && (

                <>

                    {/* ================================================= */}
                    {/* Summary */}
                    {/* ================================================= */}

                    <div className="grid gap-4 md:grid-cols-3">

                        <div className="rounded-lg border bg-white p-5">

                            <p className="text-sm text-gray-500">
                                Students
                            </p>

                            <p className="mt-1 text-2xl font-bold">
                                {
                                    filteredResults.length
                                }
                            </p>

                        </div>


                        <div className="rounded-lg border bg-white p-5">

                            <p className="text-sm text-gray-500">
                                Complete results
                            </p>

                            <p className="mt-1 text-2xl font-bold">

                                {
                                    filteredResults.filter(
                                        (result) =>
                                            result.status ===
                                            "complete",
                                    ).length
                                }

                            </p>

                        </div>


                        <div className="rounded-lg border bg-white p-5">

                            <p className="text-sm text-gray-500">
                                Incomplete results
                            </p>

                            <p className="mt-1 text-2xl font-bold">

                                {
                                    filteredResults.filter(
                                        (result) =>
                                            result.status ===
                                            "incomplete",
                                    ).length
                                }

                            </p>

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* Empty */}
                    {/* ================================================= */}

                    {filteredResults.length === 0 ? (

                        <div className="rounded-lg border bg-white p-6 text-gray-500">
                            No results available.
                        </div>

                    ) : (

                        <div className="space-y-6">

                            {filteredResults.map(
                                (result) => {

                                    const isExpanded =
                                        expanded ===
                                        result.enrollmentId


                                    return (

                                        <article
                                            key={
                                                result.enrollmentId
                                            }
                                            className="rounded-lg border bg-white"
                                        >

                                            {/* ================================================= */}
                                            {/* Header */}
                                            {/* ================================================= */}

                                            <div className="p-6">

                                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                                                    <div>

                                                        <h3 className="text-xl font-semibold">
                                                            {
                                                                result
                                                                    .student
                                                                    .name
                                                            }
                                                        </h3>

                                                        <p className="mt-1 text-gray-500">
                                                            {
                                                                result
                                                                    .class
                                                                    .name
                                                            }
                                                        </p>

                                                    </div>


                                                    <div className="flex items-center gap-6">

                                                        <div className="text-right">

                                                            {result.status ===
                                                            "complete" ? (

                                                                <>
                                                                    <div className="text-2xl font-bold">
                                                                        {
                                                                            result.percentage
                                                                        }
                                                                        %
                                                                    </div>

                                                                    <div
                                                                        className={gradeClass(
                                                                            result.letter,
                                                                        )}
                                                                    >
                                                                        {
                                                                            result.letter
                                                                        }
                                                                    </div>
                                                                </>

                                                            ) : (

                                                                <div className="text-xl font-semibold text-orange-700">
                                                                    Incomplete
                                                                </div>

                                                            )}

                                                        </div>


                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleResult(
                                                                    result.enrollmentId,
                                                                )
                                                            }
                                                            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
                                                        >
                                                            {isExpanded
                                                                ? "Hide details"
                                                                : "View details"}
                                                        </button>

                                                    </div>

                                                </div>


                                                {/* ================================================= */}
                                                {/* Summary */}
                                                {/* ================================================= */}

                                                <div className="mt-6 grid gap-4 border-t pt-5 md:grid-cols-4">

                                                    <div>

                                                        <p className="text-sm text-gray-500">
                                                            Status
                                                        </p>

                                                        <p
                                                            className={`font-semibold ${statusClass(
                                                                result.status,
                                                            )}`}
                                                        >
                                                            {
                                                                result.status ===
                                                                "complete"
                                                                    ? "Complete"
                                                                    : "Incomplete"
                                                            }
                                                        </p>

                                                    </div>


                                                    <div>

                                                        <p className="text-sm text-gray-500">
                                                            Earned
                                                        </p>

                                                        <p className="font-semibold">
                                                            {
                                                                result.earned
                                                            }
                                                        </p>

                                                    </div>


                                                    <div>

                                                        <p className="text-sm text-gray-500">
                                                            Possible
                                                        </p>

                                                        <p className="font-semibold">
                                                            {
                                                                result.possible
                                                            }
                                                        </p>

                                                    </div>


                                                    <div>

                                                        <p className="text-sm text-gray-500">
                                                            Subjects
                                                        </p>

                                                        <p className="font-semibold">

                                                            {
                                                                result.completedSubjects
                                                            }

                                                            {" / "}

                                                            {
                                                                result.totalSubjects
                                                            }

                                                        </p>

                                                    </div>

                                                </div>

                                            </div>


                                            {/* ================================================= */}
                                            {/* Details */}
                                            {/* ================================================= */}

                                            {isExpanded && (

                                                <div className="border-t px-6 pb-6">

                                                    <div className="overflow-x-auto">

                                                        <table className="mt-5 w-full text-sm">

                                                            <thead>

                                                                <tr className="border-b text-left">

                                                                    <th className="py-3 pr-4">
                                                                        Subject
                                                                    </th>

                                                                    <th className="py-3 pr-4">
                                                                        Final Exam
                                                                    </th>

                                                                    <th className="py-3 pr-4">
                                                                        Score
                                                                    </th>

                                                                    <th className="py-3 pr-4">
                                                                        Max
                                                                    </th>

                                                                    <th className="py-3 pr-4">
                                                                        Percentage
                                                                    </th>

                                                                    <th className="py-3">
                                                                        Grade
                                                                    </th>

                                                                </tr>

                                                            </thead>


                                                            <tbody>

                                                                {result.subjects.map(
                                                                    (subject) => (

                                                                        <tr
                                                                            key={
                                                                                subject.subjectId
                                                                            }
                                                                            className="border-b last:border-b-0"
                                                                        >

                                                                            <td className="py-3 pr-4 font-medium">
                                                                                {
                                                                                    subject.subjectName
                                                                                }
                                                                            </td>

                                                                            <td className="py-3 pr-4">

                                                                                {
                                                                                    subject.examName ??
                                                                                    "No final exam"
                                                                                }

                                                                            </td>

                                                                            <td className="py-3 pr-4">

                                                                                {
                                                                                    subject.score ??
                                                                                    "-"
                                                                                }

                                                                            </td>

                                                                            <td className="py-3 pr-4">

                                                                                {
                                                                                    subject.maxScore ??
                                                                                    "-"
                                                                                }

                                                                            </td>

                                                                            <td className="py-3 pr-4">

                                                                                {subject.percentage !==
                                                                                null
                                                                                    ? `${subject.percentage}%`
                                                                                    : "-"}

                                                                            </td>

                                                                            <td
                                                                                className={`py-3 ${gradeClass(
                                                                                    subject.letter,
                                                                                )}`}
                                                                            >

                                                                                {
                                                                                    subject.letter ??
                                                                                    "-"
                                                                                }

                                                                            </td>

                                                                        </tr>

                                                                    ),
                                                                )}

                                                            </tbody>

                                                        </table>

                                                    </div>


                                                    {/* ================================================= */}
                                                    {/* Missing subjects */}
                                                    {/* ================================================= */}

                                                    {result.missingSubjects.length >
                                                        0 && (

                                                        <div className="mt-5 rounded border border-orange-200 bg-orange-50 p-4">

                                                            <p className="font-medium text-orange-800">
                                                                Missing results
                                                            </p>

                                                            <ul className="mt-2 list-disc pl-5 text-sm text-orange-800">

                                                                {result.missingSubjects.map(
                                                                    (
                                                                        subject,
                                                                    ) => (

                                                                        <li
                                                                            key={
                                                                                subject.subjectId
                                                                            }
                                                                        >
                                                                            {
                                                                                subject.subjectName
                                                                            }
                                                                        </li>

                                                                    ),
                                                                )}

                                                            </ul>

                                                        </div>

                                                    )}

                                                </div>

                                            )}

                                        </article>

                                    )
                                },
                            )}

                        </div>

                    )}

                </>

            )}

        </section>
    )
}

