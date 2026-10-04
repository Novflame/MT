"use client"

import { useState } from "react"

type Department = {
    id: string
    name: string
}

type Subject = {
    id: string
    name: string
    departmentId: string | null
}

type Props = {
    departments: Department[]
    subjects: Subject[]
}

export default function SubjectsManager({
    departments,
    subjects,
}: Props) {
    const [name, setName] = useState("")
    const [departmentId, setDepartmentId] =
        useState("")

    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] =
    useState<string | null>(null)

const [editingName, setEditingName] =
    useState("")

const [editingDepartmentId, setEditingDepartmentId] =
    useState("")

    async function createSubject() {
        if (
            !name.trim() ||
            !departmentId
        ) {
            return
        }

        setLoading(true)

        try {
            const response = await fetch(
                "/api/subjects",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        departmentId,
                    }),
                },
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error,
                )
            }

            setName("")
            setDepartmentId("")

            window.location.reload()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }
    async function updateSubject() {
    if (
        !editingId ||
        !editingName.trim() ||
        !editingDepartmentId
    ) {
        return
    }

    setLoading(true)

    try {
        const response = await fetch(
            "/api/subjects",
            {
                method: "PATCH",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    id: editingId,
                    name: editingName.trim(),
                    departmentId:
                        editingDepartmentId,
                }),
            },
        )

        const data =
            await response.json()

        if (!response.ok) {
            throw new Error(
                data.error ||
                    "Failed to update subject",
            )
        }

        setEditingId(null)
        setEditingName("")
        setEditingDepartmentId("")

        window.location.reload()

    } catch (error) {
        alert(
            error instanceof Error
                ? error.message
                : "Failed to update subject",
        )
    } finally {
        setLoading(false)
    }
}

async function deleteSubject(id: string) {
    if (!confirm("Delete this subject?")) {
        return
    }

    try {
        const response = await fetch(
            "/api/subjects",
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
            throw new Error(
                data.error ||
                    "Failed to delete subject",
            )
        }

        window.location.reload()

    } catch (error) {
        alert(
            error instanceof Error
                ? error.message
                : "Failed to delete subject",
        )
    }
}

    return (
        <section className="rounded-lg border bg-gray-500 p-5 shadow-sm">

            <h2 className="text-xl font-semibold">
                Subjects
            </h2>

            <div className="mt-4 flex gap-2">

                <input
                    value={name}
                    onChange={(e) =>
                        setName(
                            e.target.value,
                        )
                    }
                    placeholder="Subject name"
                    className="rounded border px-3 py-2"
                />

                <select
                    value={departmentId}
                    onChange={(e) =>
                        setDepartmentId(
                            e.target.value,
                        )
                    }
                    className="rounded border bg-blue-700 px-3 py-2"
                >
                    <option value="" className="bg-amber-900">
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

                <button
                    onClick={
                        createSubject
                    }
                    disabled={loading}
                    className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                    {loading
                        ? "Creating..."
                        : "Add"}
                </button>

            </div>

            <div className="mt-6 space-y-2">

    {subjects.map((subject) => (

        <div
            key={subject.id}
            className="rounded border bg-gray-50 px-3 py-2"
        >

            {editingId === subject.id ? (

                <div className="flex gap-2">

                    <input
                        value={editingName}
                        onChange={(e) =>
                            setEditingName(
                                e.target.value,
                            )
                        }
                        className="rounded border px-3 py-2"
                    />

                    <select
                        value={editingDepartmentId}
                        onChange={(e) =>
                            setEditingDepartmentId(
                                e.target.value,
                            )
                        }
                        className="rounded border px-3 py-2"
                    >

                        {departments.map(
                            (department) => (
                                <option
                                    key={department.id}
                                    value={department.id}
                                >
                                    {department.name}
                                </option>
                            ),
                        )}

                    </select>

                    <button
                        onClick={updateSubject}
                        disabled={loading}
                        className="rounded bg-black px-3 py-2 text-white"
                    >
                        Save
                    </button>

                    <button
                        onClick={() => {
                            setEditingId(null)
                            setEditingName("")
                            setEditingDepartmentId("")
                        }}
                        className="rounded border px-3 py-2"
                    >
                        Cancel
                    </button>

                </div>

            ) : (

                <div className="flex items-center justify-between bg-gray-500">

                    <span className="pl-2">
                        {subject.name}
                    </span>

                    <div className="flex gap-2 bg-gray-500">

                        <button
                            onClick={() => {
                                setEditingId(
                                    subject.id,
                                )

                                setEditingName(
                                    subject.name,
                                )

                                setEditingDepartmentId(
                                    subject.departmentId ||
                                        "",
                                )
                            }}
                            className="rounded border px-3 py-1 bg-blue-800"
                        >
                            Edit
                        </button>

                        <button
                            onClick={() =>
                                deleteSubject(
                                    subject.id,
                                )
                            }
                            className="rounded border px-3 py-1"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            )}

        </div>

    ))}

</div>

        </section>
    )
}