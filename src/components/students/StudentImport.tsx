"use client"

import { useRef, useState } from "react"

type ImportError = {
    row?: number
    field?: string
    message: string
}

type ValidStudent = {
    row: number
    admissionNumber: string
    name: string
    className: string
    parentName: string
}

type ValidationResult = {
    totalRows: number
    validRows: number
    invalidRows: number
    createdParents?: number
    reusedParents?: number
    validStudents?: ValidStudent[]
    errors?: ImportError[]
}

type Props = {
    onClose: () => void
    onImported: () => void
}

export default function StudentImport({
    onClose,
    onImported,
}: Props) {
    const fileInputRef =
        useRef<HTMLInputElement>(null)

    const [file, setFile] =
        useState<File | null>(null)

    const [loading, setLoading] =
        useState(false)

    const [mode, setMode] =
        useState<"select" | "preview" | "success">(
            "select",
        )

    const [result, setResult] =
        useState<ValidationResult | null>(null)

    const [error, setError] =
        useState("")

    // =========================
    // Select file
    // =========================

    function handleFileChange(
        selectedFile?: File,
    ) {
        setError("")
        setResult(null)

        if (!selectedFile) {
            return
        }

        if (
            !selectedFile.name
                .toLowerCase()
                .endsWith(".csv")
        ) {
            setError(
                "Please select a CSV file.",
            )
            return
        }

        setFile(selectedFile)
    }

    // =========================
    // Validate CSV
    // =========================

    async function validateFile() {
        if (!file) {
            setError(
                "Please select a CSV file first.",
            )
            return
        }

        setLoading(true)
        setError("")

        try {
            const formData =
                new FormData()

            formData.append(
                "file",
                file,
            )

            formData.append(
                "mode",
                "validate",
            )

            const response =
                await fetch(
                    "/api/students/import",
                    {
                        method: "POST",
                        body: formData,
                    },
                )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to validate CSV.",
                )
            }

            setResult(data)
            setMode("preview")
        } catch (error) {
            console.error(error)

            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to validate CSV.",
            )
        } finally {
            setLoading(false)
        }
    }

    // =========================
    // Import CSV
    // =========================

    async function importFile() {
        if (!file || !result) {
            return
        }

        if (result.invalidRows > 0) {
            setError(
                "The CSV contains invalid rows. Fix them before importing.",
            )
            return
        }

        setLoading(true)
        setError("")

        try {
            const formData =
                new FormData()

            formData.append(
                "file",
                file,
            )

            formData.append(
                "mode",
                "import",
            )

            const response =
                await fetch(
                    "/api/students/import",
                    {
                        method: "POST",
                        body: formData,
                    },
                )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to import students.",
                )
            }

            setResult((previous) => ({
                ...(previous ?? {
                    totalRows: 0,
                    validRows: 0,
                    invalidRows: 0,
                }),
                ...data,
            }))

            setMode("success")
        } catch (error) {
            console.error(error)

            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to import students.",
            )
        } finally {
            setLoading(false)
        }
    }

    // =========================
    // Reset
    // =========================

    function chooseAnotherFile() {
        setFile(null)
        setResult(null)
        setError("")
        setMode("select")

        if (fileInputRef.current) {
            fileInputRef.current.value =
                ""
        }
    }

    // =========================
    // UI
    // =========================

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">

            <div className="flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl">

                {/* Header */}

                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">

                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Import Students
                        </h2>

                        <p className="mt-0.5 text-sm text-slate-500">
                            Import multiple students from a CSV file.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        ×
                    </button>

                </div>

                {/* Body */}

                <div className="overflow-y-auto px-5 py-5 sm:px-6">

                    {mode === "select" && (
                        <div className="space-y-5">

                            {/* Drop zone */}

                            <button
                                type="button"
                                onClick={() =>
                                    fileInputRef.current?.click()
                                }
                                className="flex min-h-52 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 text-center transition hover:border-blue-300 hover:bg-blue-50/30"
                            >

                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                                    ↑
                                </div>

                                <p className="mt-4 text-sm font-semibold text-slate-900">
                                    Choose a CSV file
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    Click here to browse your files
                                </p>

                                <p className="mt-2 text-xs text-slate-400">
                                    CSV files only · Maximum 5 MB
                                </p>

                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={(e) =>
                                    handleFileChange(
                                        e.target.files?.[0],
                                    )
                                }
                            />

                            {/* Selected file */}

                            {file && (
                                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">

                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600">
                                        CSV
                                    </div>

                                    <div className="min-w-0 flex-1">

                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {file.name}
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {formatFileSize(
                                                file.size,
                                            )}
                                        </p>

                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            chooseAnotherFile
                                        }
                                        className="text-sm font-medium text-slate-500 hover:text-slate-900"
                                    >
                                        Change
                                    </button>

                                </div>
                            )}

                            {/* CSV structure */}

                            <div className="rounded-xl border border-slate-200 bg-white p-4">

                                <p className="text-sm font-semibold text-slate-900">
                                    Required CSV structure
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Your CSV should contain the student, parent and class fields expected by the import API.
                                </p>

                                <div className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3">
                                    <code className="whitespace-nowrap text-xs text-slate-600">
                                        admissionNumber,
                                        firstName,
                                        middleName,
                                        lastName,
                                        dateOfBirth,
                                        gender,
                                        nationality,
                                        nationalId,
                                        photo,
                                        phone,
                                        email,
                                        address,
                                        city,
                                        parentName,
                                        parentPhone,
                                        className,
                                        notes
                                    </code>
                                </div>

                            </div>

                            {error && (
                                <ErrorMessage
                                    message={error}
                                />
                            )}

                        </div>
                    )}

                    {mode === "preview" &&
                        result && (
                            <Preview
                                result={result}
                                onChooseAnother={
                                    chooseAnotherFile
                                }
                            />
                        )}

                    {mode === "success" &&
                        result && (
                            <Success
                                result={result}
                            />
                        )}

                </div>

                {/* Footer */}

                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

                    {mode === "select" && (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    validateFile
                                }
                                disabled={
                                    loading ||
                                    !file
                                }
                                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                                {loading
                                    ? "Validating..."
                                    : "Validate CSV"}
                            </button>
                        </>
                    )}

                    {mode === "preview" &&
                        result && (
                            <>
                                <button
                                    type="button"
                                    onClick={
                                        chooseAnotherFile
                                    }
                                    disabled={
                                        loading
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                                >
                                    Choose another
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        importFile
                                    }
                                    disabled={
                                        loading ||
                                        result.invalidRows >
                                            0 ||
                                        result.validRows ===
                                            0
                                    }
                                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    {loading
                                        ? "Importing..."
                                        : `Import ${result.validRows} Students`}
                                </button>
                            </>
                        )}

                    {mode === "success" && (
                        <button
                            type="button"
                            onClick={() => {
                                onImported()
                            }}
                            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
                        >
                            Done
                        </button>
                    )}

                </div>

            </div>
        </div>
    )
}

// =================================
// Preview
// =================================

function Preview({
    result,
    onChooseAnother,
}: {
    result: ValidationResult
    onChooseAnother: () => void
}) {
    return (
        <div className="space-y-5">

            {/* Summary */}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                <Stat
                    label="Total rows"
                    value={result.totalRows}
                />

                <Stat
                    label="Valid"
                    value={result.validRows}
                    positive
                />

                <Stat
                    label="Invalid"
                    value={result.invalidRows}
                    negative
                />

                <Stat
                    label="New parents"
                    value={
                        result.createdParents ??
                        0
                    }
                />

            </div>

            {/* Status */}

            {result.invalidRows > 0 ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">

                    <p className="text-sm font-semibold text-red-700">
                        Import cannot continue
                    </p>

                    <p className="mt-1 text-sm leading-5 text-red-600">
                        Fix the invalid rows in your CSV and validate the file again.
                    </p>

                </div>
            ) : (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

                    <p className="text-sm font-semibold text-blue-700">
                        CSV is ready to import
                    </p>

                    <p className="mt-1 text-sm leading-5 text-blue-600">
                        All rows passed validation.
                    </p>

                </div>
            )}

            {/* Errors */}

            {result.errors &&
                result.errors.length > 0 && (
                    <div>

                        <h3 className="text-sm font-semibold text-slate-900">
                            Validation errors
                        </h3>

                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">

                            <div className="max-h-72 overflow-y-auto">

                                {result.errors.map(
                                    (
                                        item,
                                        index,
                                    ) => (
                                        <div
                                            key={`${item.row ?? "unknown"}-${index}`}
                                            className="border-b border-slate-100 p-3 last:border-0"
                                        >

                                            <div className="flex gap-3">

                                                <span className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                                                    {item.row
                                                        ? `Row ${item.row}`
                                                        : "CSV"}
                                                </span>

                                                <div className="min-w-0">

                                                    {item.field && (
                                                        <p className="text-xs font-semibold text-slate-700">
                                                            {
                                                                item.field
                                                            }
                                                        </p>
                                                    )}

                                                    <p className="mt-0.5 text-sm text-slate-600">
                                                        {
                                                            item.message
                                                        }
                                                    </p>

                                                </div>

                                            </div>

                                        </div>
                                    ),
                                )}

                            </div>

                        </div>

                    </div>
                )}

            {/* Valid rows */}

            {result.validRows > 0 &&
                result.validStudents &&
                result.validStudents.length > 0 && (
                    <div>

                        <div className="flex items-center justify-between">

                            <h3 className="text-sm font-semibold text-slate-900">
                                Valid students
                            </h3>

                            <span className="text-xs text-slate-500">
                                Showing{" "}
                                {
                                    result.validStudents
                                        .length
                                }
                            </span>

                        </div>

                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">

                            <div className="max-h-72 overflow-auto">

                                <table className="w-full border-collapse text-left">

                                    <thead className="sticky top-0 bg-slate-50">

                                        <tr className="border-b border-slate-200">

                                            <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                                                Row
                                            </th>

                                            <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                                                Student
                                            </th>

                                            <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                                                Class
                                            </th>

                                            <th className="px-3 py-3 text-xs font-semibold text-slate-500">
                                                Parent
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {result.validStudents.map(
                                            (
                                                student,
                                            ) => (
                                                <tr
                                                    key={
                                                        student.row
                                                    }
                                                    className="border-b border-slate-100 last:border-0"
                                                >

                                                    <td className="px-3 py-3 text-xs text-slate-500">
                                                        {
                                                            student.row
                                                        }
                                                    </td>

                                                    <td className="px-3 py-3">

                                                        <p className="text-sm font-medium text-slate-900">
                                                            {
                                                                student.name
                                                            }
                                                        </p>

                                                        <p className="text-xs text-slate-500">
                                                            {
                                                                student.admissionNumber
                                                            }
                                                        </p>

                                                    </td>

                                                    <td className="px-3 py-3 text-sm text-slate-700">
                                                        {
                                                            student.className
                                                        }
                                                    </td>

                                                    <td className="px-3 py-3 text-sm text-slate-700">
                                                        {
                                                            student.parentName
                                                        }
                                                    </td>

                                                </tr>
                                            ),
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    </div>
                )}

        </div>
    )
}

// =================================
// Success
// =================================

function Success({
    result,
}: {
    result: ValidationResult
}) {
    return (
        <div className="flex min-h-80 flex-col items-center justify-center text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl font-bold text-blue-600">
                ✓
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
                Import completed
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                The students have been successfully imported into the school system.
            </p>

            <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-2xl font-bold text-slate-900">
                        {result.validRows}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Students imported
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-2xl font-bold text-slate-900">
                        {result.createdParents ??
                            0}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        New parents
                    </p>
                </div>

            </div>

        </div>
    )
}

// =================================
// Stat
// =================================

function Stat({
    label,
    value,
    positive = false,
    negative = false,
}: {
    label: string
    value: number
    positive?: boolean
    negative?: boolean
}) {
    let valueClass =
        "text-slate-900"

    if (positive) {
        valueClass =
            "text-blue-600"
    }

    if (negative) {
        valueClass =
            "text-red-600"
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">

            <p className="text-xs font-medium text-slate-500">
                {label}
            </p>

            <p
                className={`mt-1 text-2xl font-bold ${valueClass}`}
            >
                {value}
            </p>

        </div>
    )
}

// =================================
// Error
// =================================

function ErrorMessage({
    message,
}: {
    message: string
}) {
    return (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
        </div>
    )
}

// =================================
// File size
// =================================

function formatFileSize(
    bytes: number,
) {
    if (bytes < 1024) {
        return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
        return `${(
            bytes / 1024
        ).toFixed(1)} KB`
    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`
}