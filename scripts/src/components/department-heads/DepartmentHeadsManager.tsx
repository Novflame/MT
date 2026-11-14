
"use client"

import { useState } from "react"

export default function DepartmentHeadsManager({
    departments,
    staff,
}: {
    departments: {
        id: string
        name: string
    }[]
    staff: {
        id: string
        name: string
        email: string
        role: string
    }[]
}) {
    const [departmentId, setDepartmentId] =
        useState("")

    const [userId, setUserId] =
        useState("")

    const [saving, setSaving] =
        useState(false)

    async function save() {
        setSaving(true)

        try {
            const r = await fetch(
                "/api/department-heads",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        departmentId,
                        userId,
                    }),
                },
            )

            const d = await r.json()

            if (!r.ok) {
                throw Error(d.error)
            }

            alert(
                "Head of Department assigned",
            )
        } catch (e) {
            alert(
                e instanceof Error
                    ? e.message
                    : "Failed",
            )
        } finally {
            setSaving(false)
        }
    }

    const eligibleStaff = staff.filter(
        (s) =>
            s.role === "head_of_department" ||
            s.role === "teacher",
    )

    return (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            {/* Header */}
            <div className="border-b border-slate-200 px-4 py-5 sm:px-6 dark:border-slate-800">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">
                            Assign Head of
                            Department
                        </h2>

                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Assign an eligible staff
                            member to manage a
                            department.
                        </p>
                    </div>

                    <div className="mt-3 inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:mt-0">
                        {eligibleStaff.length}{" "}
                        eligible{" "}
                        {eligibleStaff.length === 1
                            ? "member"
                            : "members"}
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="p-4 sm:p-6">
                <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">

                    {/* Department */}
                    <div className="min-w-0">
                        <label
                            htmlFor="department"
                            className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                            Department
                        </label>

                        <select
                            id="department"
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
                            value={departmentId}
                            onChange={(e) =>
                                setDepartmentId(
                                    e.target.value,
                                )
                            }
                        >
                            <option value="">
                                Select department
                            </option>

                            {departments.map(
                                (department) => (
                                    <option
                                        key={
                                            department.id
                                        }
                                        value={
                                            department.id
                                        }
                                    >
                                        {
                                            department.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    {/* Staff */}
                    <div className="min-w-0">
                        <label
                            htmlFor="staff-member"
                            className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                            Staff Member
                        </label>

                        <select
                            id="staff-member"
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
                            value={userId}
                            onChange={(e) =>
                                setUserId(
                                    e.target.value,
                                )
                            }
                        >
                            <option value="">
                                Select staff member
                            </option>

                            {eligibleStaff.map(
                                (member) => (
                                    <option
                                        key={member.id}
                                        value={member.id}
                                    >
                                        {member.name}{" "}
                                        ·{" "}
                                        {member.email}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </div>

                {/* Action */}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Select a department and an
                        eligible staff member to
                        continue.
                    </p>

                    <button
                        type="button"
                        onClick={save}
                        disabled={
                            saving ||
                            !departmentId ||
                            !userId
                        }
                        className="w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                        {saving
                            ? "Saving..."
                            : "Assign Head"}
                    </button>
                </div>
            </div>
        </section>
    )
}

