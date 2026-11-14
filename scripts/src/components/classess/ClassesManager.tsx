
"use client"

import { useState } from "react"

type SchoolClass = {
    id: string
    name: string
    gradeLevel: number
}

type Props = {
    classes: SchoolClass[]
}

export default function ClassesManager({
    classes,
}: Props) {
    const [name, setName] = useState("")
    const [gradeLevel, setGradeLevel] =
        useState("")

    const [loading, setLoading] =
        useState(false)

    async function createClass() {
        if (!name.trim() || !gradeLevel) {
            return
        }

        setLoading(true)

        try {
            const response = await fetch(
                "/api/classes",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        gradeLevel:
                            Number(gradeLevel),
                    }),
                },
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Failed to create class",
                )
            }

            setName("")
            setGradeLevel("")

            window.location.reload()
        } catch (error) {
            console.error(error)

            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to create class",
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-blue-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            {/* Header */}
 <div className="border-b border-slate-200 px-4 py-1 sm:px-6 dark:border-slate-800">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">
                            Class Management
                        </h2>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Create and view classes
                            organized by grade.
                        </p>
                    </div>

                    <div className="mt-3 inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:mt-0">
                        {classes.length}{" "}
                        {classes.length === 1
                            ? "class"
                            : "classes"}
                    </div>
                </div>
            </div>

            {/* Create class */}
            <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Add New Class
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Enter the class name and its
                        corresponding grade level.
                    </p>
                </div>

                <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="min-w-0 flex-1">
                        <label
                            htmlFor="class-name"
                            className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                            Class Name
                        </label>

                        <input
                            id="class-name"
                            value={name}
                            onChange={(e) =>
                                setName(
                                    e.target.value,
                                )
                            }
                            placeholder="e.g. Class A"
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                        />
                    </div>

                    <div className="w-full lg:w-40">
                        <label
                            htmlFor="grade-level"
                            className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                            Grade Level
                        </label>

                        <input
                            id="grade-level"
                            type="number"
                            min="1"
                            value={gradeLevel}
                            onChange={(e) =>
                                setGradeLevel(
                                    e.target.value,
                                )
                            }
                            placeholder="Grade"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={createClass}
                        disabled={
                            loading ||
                            !name.trim() ||
                            !gradeLevel
                        }
                        className="w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                        {loading
                            ? "Creating..."
                            : "Add Class"}
                    </button>
                </div>
            </div>

            {/* Classes */}
            <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Existing Classes
                        </h3>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Classes currently registered
                            in your school.
                        </p>
                    </div>
                </div>

                {classes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            No classes found
                        </p>

                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            Add your first class using
                            the form above.
                        </p>
                    </div>
                ) : (
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {classes.map(
                            (schoolClass) => (
                                <div
                                    key={
                                        schoolClass.id
                                    }
                                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                                >
                                    <div className="flex min-w-0 items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                {
                                                    schoolClass.name
                                                }
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                Academic
                                                class
                                            </p>
                                        </div>

                                        <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                            Grade{" "}
                                            {
                                                schoolClass.gradeLevel
                                            }
                                        </span>
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}

