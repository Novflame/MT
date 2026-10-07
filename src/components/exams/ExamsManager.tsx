"use client"

import { useState } from "react"

type Subject = {
    id: string
    name: string
    departmentId: string | null
}

type Department = {
    id: string
    name: string
    subjects: Subject[]
}

type SchoolClass = {
    id: string
    name: string
    gradeLevel: number
}

type Props = {
    departments: Department[]
    classes: SchoolClass[]
}

export default function ExamsManager({
    departments,
    classes,
}: Props) {
    const [name, setName] = useState("")
    const [departmentId, setDepartmentId] =
        useState("")
    const [subjectId, setSubjectId] =
        useState("")
    const [classId, setClassId] =
        useState("")
    const [type, setType] =
        useState("")
    const [examDate, setExamDate] =
        useState("")
    const [maxScore, setMaxScore] =
        useState("")

    const [loading, setLoading] =
        useState(false)


        const selectedDepartment =
    departments.find(
        (department) =>
            department.id === departmentId,
    )

const availableSubjects =
    selectedDepartment?.subjects ?? []






    // Conect Form With API 
    async function createExam() {
    if (
        !name.trim() ||
        !departmentId ||
        !subjectId ||
        !classId ||
        !type ||
        !examDate ||
        !maxScore
    ) {
        return
    }

    setLoading(true)

    try {
        const response = await fetch(
            "/api/exams",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    subjectId,
                    classId,
                    type,
                    examDate,
                    maxScore,
                }),
            },
        )

        const data =
            await response.json()

        if (!response.ok) {
            throw new Error(data.error)
        }

        setName("")
        setDepartmentId("")
        setSubjectId("")
        setClassId("")
        setType("")
        setExamDate("")
        setMaxScore("")

        window.location.reload()
    } catch (error) {
        console.error(error)
    } finally {
        setLoading(false)
    }
}

    return (
       <section className="min-w-0 rounded-lg border bg-white p-4 shadow-sm sm:p-6">

    <h2 className="text-xl font-semibold text-blue-600">
        Create Exam
    </h2>

    <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">

        <input
            value={name}
            onChange={(e) =>
                setName(e.target.value)
            }
            placeholder="Exam name"
            className="w-full min-w-0 rounded border px-3 py-2 bg-gray-500 sm:col-span-2"
        />

        <select
            value={departmentId}
            onChange={(e) => {
                setDepartmentId(e.target.value)
                setSubjectId("")
            }}
            className="w-full min-w-0 rounded border px-3 py-2 bg-gray-500"
        >
            <option value="">
                Select department
            </option>

            {departments.map((department) => (
                <option
                    key={department.id}
                    value={department.id}
                >
                    {department.name}
                </option>
            ))}
        </select>

        {/* SUBJECTS  */}

        <select
            value={subjectId}
            onChange={(e) =>
                setSubjectId(e.target.value)
            }
            disabled={!departmentId}
            className="w-full min-w-0 rounded border px-3 py-2 bg-gray-500"
        >
            <option value="">
                Select subject
            </option>

            {availableSubjects.map((subject) => (
                <option
                    key={subject.id}
                    value={subject.id}
                >
                    {subject.name}
                </option>
            ))}
        </select>



{/* CLASSESS  */}
        <select
    value={classId}
    onChange={(e) =>
        setClassId(e.target.value)
    }
    className="w-full min-w-0 rounded border px-3 py-2 bg-gray-500"
>
    <option value="">
        Select class
    </option>

    {classes.map((schoolClass) => (
        <option
            key={schoolClass.id}
            value={schoolClass.id}
        >
            {schoolClass.name}
        </option>
    ))}
</select>


{/* Exam TYPE  */}

<select
    value={type}
    onChange={(e) =>
        setType(e.target.value)
    }
    className="w-full min-w-0 rounded border px-3 py-2 bg-gray-500"
>
    <option value="">
        Select exam type
    </option>

    <option value="monthly">
        Monthly
    </option>

    <option value="midyear">
        Midyear
    </option>

    <option value="final">
        Final
    </option>
</select>
 

 {/* scores and exam date INPUTS  */}



 {/* Exams Date */}
<input
    type="date"
    value={examDate}
    onChange={(e) =>
        setExamDate(e.target.value)
    }
    className="w-full min-w-0 rounded border px-3 py-2 bg-gray-500"
/>

 {/* MAXIMUM score */}
<input
    type="number"
    min="1"
    value={maxScore}
    onChange={(e) =>
        setMaxScore(e.target.value)
    }
    placeholder="Maximum score"
    className="w-full rounded border px-3 py-2 bg-gray-500"
/>


{/* Create Exams BUTTON  */}
<button
    onClick={createExam}
    disabled={loading}
    className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50 sm:col-span-2 sm:w-auto"
>
    {loading
        ? "Creating..."
        : "Create Exam"}
</button>
    </div>



</section>


    )
}