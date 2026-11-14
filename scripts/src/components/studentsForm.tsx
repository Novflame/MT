"use client"
import { useState } from "react";

interface StudentsFormProps {
    classes: {
        id: string
        name: string
        gradeLevel: number

    }[]

}


export default function StudentsForm({ classes }: StudentsFormProps) {
    const [name, setName] = useState("")
    const [parentPhone, setParentPhone] = useState("")
    const [classId, setClassId] = useState("")
    const [loding, setLoding] = useState(false)



    const handleSubmit = async function (e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!classId) {
            alert("set classes first")
            return
        }


        setLoding(true)

        const response = await fetch("/api/students", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, parentPhone, classId })
        })
        if (response.ok) {
            alert("student saved")
            setName("")
            setClassId("")
            setParentPhone("")
            setLoding(false)
            window.location.reload()



        } else {
            alert("some kind error happend")
            setLoding(false)
        }

    }



    return (
        <form onSubmit={handleSubmit} className="bg-gray-500 p-6 rounded border space-y-4">
            <h2 className="text-lg font-bold text-gray-900">+ (client component & state)</h2>

            
            <label className="block text-xs text-gray-50 mb-1"> student name</label>
            <input type="text" placeholder="student Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-2 border rounded" />

            <input type="text" placeholder="parent Phone"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                className="w-full p-2 border rounded" />


            <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full p-2 border rounded"
            >
                <option value="">... class ...</option>

                {classes.map(c => (
                    <option key={c.id} value={c.id} className="bg-gray-500">
                        {c.name} {c.gradeLevel}
                    </option>
                ))}
            </select>



            <button type="submit" disabled={loding}
                className="w-full bg-blue-600 text-white p-2 rounded">
                {loding ? "saving..." : "save "}
            </button>


        </form>
    )
}
