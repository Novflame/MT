
"use client"

import { useState } from "react"

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
const [name, setName] = useState("")
const [loading, setLoading] = useState(false)


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
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                }),
            },
        )

        const data = await response.json()

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
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: editingId,
                    name: editingName.trim(),
                }),
            },
        )

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error)
        }

        window.location.reload()
    } catch (error) {
        console.error(error)
    }
}

async function deleteDepartment(id: string) {
    if (!confirm("Delete this department?")) {
        return
    }

    try {
        const response = await fetch("/api/departments", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(
                    "Cannot delete this department because it has subjects.",
                )
            }

            throw new Error(
                data.error || "Failed to delete department",
            )
        }

        window.location.reload()

    } catch (error) {
        alert(
            error instanceof Error
                ? error.message
                : "Failed to delete department",
        )
    }
}
return (
    <section className="rounded-lg border bg-gray-500 p-5 shadow-sm">

        <h2 className="text-xl font-semibold text-blue-800">
            Departments
        </h2>

        <div className="mt-4 flex gap-2">

            <input
                value={name}
                onChange={(e) =>
                    setName(e.target.value)
                }
                placeholder="Department name"
                className="rounded border px-3 py-2"
            />

            <button
                onClick={
                    createDepartment
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

            {departments.map(
                (department) => (

                    <div
                        key={department.id}
                        className="flex items-center justify-between rounded border bg-gray-50 px-3 py-2"
                    >

                        {editingId ===
                        department.id ? (

                            <div className="flex gap-2 bg-gray-600">

                                <input
                                    value={
                                        editingName
                                    }
                                    onChange={(
                                        e,
                                    ) =>
                                        setEditingName(
                                            e.target
                                                .value,
                                        )
                                    }
                                    className="rounded border px-2 py-1"
                                />

                                <button
                                    onClick={
                                        updateDepartment
                                    }
                                    className="rounded bg-black px-3 py-1 text-white"
                                >
                                    Save
                                </button>

                                <button
                                    onClick={() => {
                                        setEditingId(
                                            null,
                                        )

                                        setEditingName(
                                            "",
                                        )
                                    }}
                                    className="rounded border px-3 py-1"
                                >
                                    Cancel
                                </button>

                            </div>

                        ) : (

                            <>
                                <span className="text-blue-800">
                                    {
                                        department.name
                                    }
                                </span>

                                <div className="flex gap-2">

                                    <button
                                        onClick={() => {
                                            setEditingId(
                                                department.id,
                                            )

                                            setEditingName(
                                                department.name,
                                            )
                                        }}
                                        className="rounded border px-3 py-1"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        onClick={() =>
                                            deleteDepartment(
                                                department.id,
                                            )
                                        }
                                        className="rounded border px-3 py-1 text-blue-800"
                                    >
                                        Delete
                                    </button>

                                </div>
                            </>

                        )}

                    </div>
                ),
            )}

        </div>

    </section>
)


}
