
"use client"

import { useState } from "react"

import { useLanguage } from "@/components/providers/LanguageProvider"

type Department = {
    id: string
    name: string
}

type Props = {
    departments: Department[]
}

export default function DepartmentsManager({
    departments,
}: Props) {
    const {
        t,
    } = useLanguage()

    const [name, setName] = useState("")
    const [loading, setLoading] =
        useState(false)

    const [editingId, setEditingId] =
        useState<string | null>(null)

    const [editingName, setEditingName] =
        useState("")

    async function createDepartment() {
        if (!name.trim()) {
            return
        }

        setLoading(true)

        try {
            const response = await fetch(
                "/api/departments",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                    }),
                },
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            setName("")
            window.location.reload()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function updateDepartment() {
        if (
            !editingId ||
            !editingName.trim()
        ) {
            return
        }

        try {
            const response = await fetch(
                "/api/departments",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        id: editingId,
                        name: editingName.trim(),
                    }),
                },
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            window.location.reload()
        } catch (error) {
            console.error(error)
        }
    }

    async function deleteDepartment(
        id: string,
    ) {
        if (
            !confirm(
                t.departments.deleteConfirm,
            )
        ) {
            return
        }

        try {
            const response = await fetch(
                "/api/departments",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        id,
                    }),
                },
            )

            const data =
                await response.json()

            if (!response.ok) {
                if (response.status === 409) {
                    throw new Error(
                        t.departments
                            .deleteWithSubjects,
                    )
                }

                throw new Error(
                    data.error ||
                        t.departments
                            .deleteFailed,
                )
            }

            window.location.reload()
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : t.departments
                          .deleteFailed,
            )
        }
    }

    return (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="border-b border-slate-200 px-4 py-5 sm:px-6 dark:border-slate-800">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                            {
                                t.departments
                                    .title
                            }
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {
                                t.departments
                                    .description
                            }
                        </p>
                    </div>

                    <div className="mt-3 inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:mt-0">
                        {departments.length}{" "}
                        {departments.length === 1
                            ? t.departments
                                  .count.slice(
                                      0,
                                      -1,
                                  )
                            : t.departments
                                  .count}
                    </div>
                </div>
            </div>

            {/* Create department */}
            <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {
                            t.departments
                                .addTitle
                        }
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {
                            t.departments
                                .addDescription
                        }
                    </p>
                </div>

                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                        <label
                            htmlFor="department-name"
                            className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                            {
                                t.departments
                                    .name
                            }
                        </label>

                        <input
                            id="department-name"
                            value={name}
                            onChange={(e) =>
                                setName(
                                    e.target.value,
                                )
                            }
                            placeholder={
                                t.departments
                                    .placeholder
                            }
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={
                            createDepartment
                        }
                        disabled={
                            loading ||
                            !name.trim()
                        }
                        className="w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                        {loading
                            ? t.departments
                                  .creating
                            : t.departments
                                  .addDepartment}
                    </button>
                </div>
            </div>

            {/* Department list */}
            <div className="p-4 sm:p-6">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {
                            t.departments
                                .existingTitle
                        }
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {
                            t.departments
                                .existingDescription
                        }
                    </p>
                </div>

                {departments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {
                                t.departments
                                    .emptyTitle
                            }
                        </p>

                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            {
                                t.departments
                                    .emptyDescription
                            }
                        </p>
                    </div>
                ) : (
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                        {departments.map(
                            (department) => (
                                <div
                                    key={
                                        department.id
                                    }
                                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                                >
                                    {editingId ===
                                    department.id ? (
                                        <div className="flex min-w-0 flex-col gap-3">
                                            <div>
                                                <label
                                                    htmlFor={`edit-department-${department.id}`}
                                                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                                                >
                                                    {
                                                        t
                                                            .departments
                                                            .name
                                                    }
                                                </label>

                                                <input
                                                    id={`edit-department-${department.id}`}
                                                    value={
                                                        editingName
                                                    }
                                                    onChange={(
                                                        e,
                                                    ) =>
                                                        setEditingName(
                                                            e
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <button
                                                    type="button"
                                                    onClick={
                                                        updateDepartment
                                                    }
                                                    disabled={
                                                        !editingName.trim()
                                                    }
                                                    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                                                >
                                                    {
                                                        t
                                                            .common
                                                            .save
                                                    }
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingId(
                                                            null,
                                                        )

                                                        setEditingName(
                                                            "",
                                                        )
                                                    }}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    {
                                                        t
                                                            .common
                                                            .cancel
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex min-w-0 flex-col gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                    {
                                                        department.name
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {
                                                        t
                                                            .departments
                                                            .department
                                                    }
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingId(
                                                            department.id,
                                                        )

                                                        setEditingName(
                                                            department.name,
                                                        )
                                                    }}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    {
                                                        t
                                                            .common
                                                            .edit
                                                    }
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        deleteDepartment(
                                                            department.id,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:w-auto dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                                                >
                                                    {
                                                        t
                                                            .common
                                                            .delete
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ),
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}

