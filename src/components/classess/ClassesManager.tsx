
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
        <section className="rounded-lg border bg-gray-400 p-5  shadow-sm">

            <h2 className="text-xl font-semibold">
                Classes
            </h2>

            <div className="mt-4 flex gap-2 ">

                <input
                    value={name}
                    onChange={(e) =>
                        setName(e.target.value)
                    }
                    placeholder="Class name"
                    className="rounded border px-3 py-2"
                />

                <input
                    type="number"
                    min="1"
                    value={gradeLevel}
                    onChange={(e) =>
                        setGradeLevel(
                            e.target.value,
                        )
                    }
                    placeholder="Grade level"
                    className="w-32 rounded border px-3 py-2"
                />

                <button
                    onClick={createClass}
                    disabled={loading}
                    className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                    {loading
                        ? "Creating..."
                        : "Add"}
                </button>

            </div>

            <div className="mt-6 space-y-2 bg-blue-300">

                {classes.map((schoolClass) => (
                    <div
                        key={schoolClass.id}
                        className="bg-gray-500 flex items-center justify-between rounded border px-3 py-2"
                    >
                        <span className="">
                            {schoolClass.name}
                        </span>

                        <span className="text-sm text-gray-500">
                            Grade{" "}
                            {schoolClass.gradeLevel}
                        </span>
                    </div>
                ))}

            </div>

        </section>
    )
}