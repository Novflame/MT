// "use client"

// import { useState } from "react"

// type Teacher = {
//     id: string
//     name: string | null
//     email: string | null
// }

// type Subject = {
//     id: string
//     name: string
//     departmentId: string | null
// }

// type SchoolClass = {
//     id: string
//     name: string
//     gradeLevel: number
// }

// type Assignment = {
//     teacherId: string
//     subjectId: string
//     subjectName: string
//     classId: string
//     className: string
//     gradeLevel: number

//     teacher: {
//         id: string
//         name: string | null
//         email: string | null
//     } | null
// }

// type Props = {
//     teachers: Teacher[]
//     subjects: Subject[]
//     classes: SchoolClass[]
//     initialAssignments: Assignment[]
// }

// export default function TeacherAssignmentsManager({
//     teachers,
//     subjects,
//     classes,
//     initialAssignments,
    
// }: Props) {

//     const [teacherId, setTeacherId] = useState("")
//     const [subjectId, setSubjectId] = useState("")
//     const [classId, setClassId] = useState("")

//     const [assignments, setAssignments] =
//         useState<Assignment[]>(initialAssignments)

//     const [loading, setLoading] = useState(false)
//     const [loadingAssignments, setLoadingAssignments] =
//         useState(false)

//     const [error, setError] = useState("")
//     const [success, setSuccess] = useState("")


//     // =========================
//     // Reload assignments
//     // =========================

//     async function loadAssignments() {
//         try {
//             setLoadingAssignments(true)
//             setError("")

//             const response =
//                 await fetch(
//                     "/api/teacher-assignments",
//                     {
//                         cache: "no-store",
//                     },
//                 )

//             const data =
//                 await response.json()

//             if (!response.ok) {
//                 throw new Error(
//                     data.error ??
//                         "Failed to load assignments",
//                 )
//             }

//             setAssignments(
//                 data.assignments ?? [],
//             )

//         } catch (error) {
//             console.error(error)

//             setError(
//                 error instanceof Error
//                     ? error.message
//                     : "Failed to load assignments",
//             )

//         } finally {
//             setLoadingAssignments(false)
//         }
//     }


//     // =========================
//     // Create assignment
//     // =========================

//     async function handleSubmit(
//         event: React.FormEvent<HTMLFormElement>,
//     ) {
//         event.preventDefault()

//         setError("")
//         setSuccess("")

//         if (
//             !teacherId ||
//             !subjectId ||
//             !classId
//         ) {
//             setError(
//                 "Please select a teacher, subject and class.",
//             )

//             return
//         }

//         try {
//             setLoading(true)

//             const response =
//                 await fetch(
//                     "/api/teacher-assignments",
//                     {
//                         method: "POST",

//                         headers: {
//                             "Content-Type":
//                                 "application/json",
//                         },

//                         body: JSON.stringify({
//                             teacherId,
//                             subjectId,
//                             classId,
//                         }),
//                     },
//                 )

//             const data =
//                 await response.json()

//             if (!response.ok) {
//                 throw new Error(
//                     data.error ??
//                         "Failed to create assignment",
//                 )
//             }

//             setSuccess(
//                 "Teacher assignment created successfully.",
//             )

//             setTeacherId("")
//             setSubjectId("")
//             setClassId("")

//             await loadAssignments()

//         } catch (error) {
//             console.error(error)

//             setError(
//                 error instanceof Error
//                     ? error.message
//                     : "Failed to create assignment",
//             )

//         } finally {
//             setLoading(false)
//         }
//     }


//     return (
//         <div className="space-y-8">

//             {/* ========================= */}
//             {/* Create assignment */}
//             {/* ========================= */}

//             <section className="rounded-lg bg-gray-500 p-6 shadow">

//                 <h2 className="text-xl font-semibold">
//                     Assign Teacher
//                 </h2>

//                 <p className="mt-1 text-sm text-gray-600">
//                     Assign a teacher to a subject
//                     and class.
//                 </p>

//                 <form
//                     onSubmit={handleSubmit}
//                     className="mt-6 space-y-4"
//                 >

//                     {/* Teacher */}

//                     <div>
//                         <label
//                             htmlFor="teacher"
//                             className="mb-1 block text-sm font-medium"
//                         >
//                             Teacher
//                         </label>

//                         <select
//                             id="teacher"
//                             value={teacherId}
//                             onChange={(event) =>
//                                 setTeacherId(
//                                     event.target.value,
//                                 )
//                             }
//                             className="w-full rounded border p-2"
//                         >
//                             <option value="">
//                                 Select teacher
//                             </option>

//                             {teachers.map(
//                                 (teacher) => (
//                                     <option
//                                         key={teacher.id}
//                                         value={teacher.id}
//                                     >
//                                         {teacher.name ??
//                                             teacher.email ??
//                                             "Unknown teacher"}
//                                     </option>
//                                 ),
//                             )}
//                         </select>
//                     </div>


//                     {/* Subject */}

//                     <div>
//                         <label
//                             htmlFor="subject"
//                             className="mb-1 block text-sm font-medium"
//                         >
//                             Subject
//                         </label>

//                         <select
//                             id="subject"
//                             value={subjectId}
//                             onChange={(event) =>
//                                 setSubjectId(
//                                     event.target.value,
//                                 )
//                             }
//                             className="w-full rounded border p-2"
//                         >
//                             <option value="">
//                                 Select subject
//                             </option>

//                             {subjects.map(
//                                 (subject) => (
//                                     <option
//                                         key={subject.id}
//                                         value={subject.id}
//                                     >
//                                         {subject.name}
//                                     </option>
//                                 ),
//                             )}
//                         </select>
//                     </div>


//                     {/* Class */}

//                     <div>
//                         <label
//                             htmlFor="school-class"
//                             className="mb-1 block text-sm font-medium"
//                         >
//                             Class
//                         </label>

//                         <select
//                             id="school-class"
//                             value={classId}
//                             onChange={(event) =>
//                                 setClassId(
//                                     event.target.value,
//                                 )
//                             }
//                             className="w-full rounded border p-2"
//                         >
//                             <option value="">
//                                 Select class
//                             </option>

//                             {classes.map(
//                                 (schoolClass) => (
//                                     <option
//                                         key={schoolClass.id}
//                                         value={schoolClass.id}
//                                     >
//                                         {schoolClass.name}
//                                         {" - "}
//                                         Grade{" "}
//                                         {schoolClass.gradeLevel}
//                                     </option>
//                                 ),
//                             )}
//                         </select>
//                     </div>


//                     {/* Error */}

//                     {error && (
//                         <p className="rounded bg-red-100 p-3 text-sm text-red-700">
//                             {error}
//                         </p>
//                     )}


//                     {/* Success */}

//                     {success && (
//                         <p className="rounded bg-green-100 p-3 text-sm text-green-700">
//                             {success}
//                         </p>
//                     )}


//                     {/* Submit */}

//                     <button
//                         type="submit"
//                         disabled={loading}
//                         className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
//                     >
//                         {loading
//                             ? "Creating..."
//                             : "Assign Teacher"}
//                     </button>

//                 </form>

//             </section>


//             {/* ========================= */}
//             {/* Current assignments */}
//             {/* ========================= */}

//             <section className="rounded-lg bg-blue-500 p-6 shadow">

//                 <div className="flex items-center justify-between">

//                     <div>
//                         <h2 className="text-xl font-semibold">
//                             Teacher Assignments
//                         </h2>

//                         <p className="mt-1 text-sm text-gray-600">
//                             Current teacher assignments
//                             for this academic year.
//                         </p>
//                     </div>

//                     <button
//                         type="button"
//                         onClick={loadAssignments}
//                         disabled={loadingAssignments}
//                         className="rounded border px-3 py-2 text-sm disabled:opacity-50"
//                     >
//                         {loadingAssignments
//                             ? "Refreshing..."
//                             : "Refresh"}
//                     </button>

//                 </div>


//                 {loadingAssignments ? (
//                     <p className="mt-6 text-gray-500">
//                         Loading assignments...
//                     </p>
//                 ) : assignments.length === 0 ? (
//                     <p className="mt-6 text-gray-500">
//                         No teacher assignments yet.
//                     </p>
//                 ) : (
//                     <div className="mt-6 overflow-x-auto">

//                         <table className="w-full border-collapse">

//                             <thead>
//                                 <tr className="border-b text-left">

//                                     <th className="p-3">
//                                         Teacher
//                                     </th>

//                                     <th className="p-3">
//                                         Subject
//                                     </th>

//                                     <th className="p-3">
//                                         Class
//                                     </th>

//                                     <th className="p-3">
//                                         Grade
//                                     </th>

//                                 </tr>
//                             </thead>

//                             <tbody>

//                                 {assignments.map(
//                                     (
//                                         assignment,
//                                         index,
//                                     ) => (
//                                         <tr
//                                             key={`${assignment.teacherId}-${assignment.subjectId}-${assignment.classId}-${index}`}
//                                             className="border-b"
//                                         >

//                                             <td className="p-3">
//                                                 {
//                                                     assignment
//                                                         .teacher
//                                                         ?.name ??
//                                                     assignment
//                                                         .teacher
//                                                         ?.email ??
//                                                     "Unknown teacher"
//                                                 }
//                                             </td>

//                                             <td className="p-3">
//                                                 {
//                                                     assignment.subjectName
//                                                 }
//                                             </td>

//                                             <td className="p-3">
//                                                 {
//                                                     assignment.className
//                                                 }
//                                             </td>

//                                             <td className="p-3">
//                                                 {
//                                                     assignment.gradeLevel
//                                                 }
//                                             </td>

//                                         </tr>
//                                     ),
//                                 )}

//                             </tbody>

//                         </table>

//                     </div>
//                 )}

//             </section>

//         </div>
//     )
// }



"use client"

import { useState } from "react"

type Teacher = {
    id: string
    name: string | null
    email: string | null
}

type Subject = {
    id: string
    name: string
    departmentId: string | null
}

type SchoolClass = {
    id: string
    name: string
    gradeLevel: number
}

type Assignment = {
    teacherId: string
    subjectId: string
    subjectName: string
    classId: string
    className: string
    gradeLevel: number

    teacher: {
        id: string
        name: string | null
        email: string | null
    } | null
}

type Props = {
    teachers: Teacher[]
    subjects: Subject[]
    classes: SchoolClass[]
    initialAssignments: Assignment[]
}

export default function TeacherAssignmentsManager({
    teachers,
    subjects,
    classes,
    initialAssignments,
}: Props) {
    const [teacherId, setTeacherId] = useState("")
    const [subjectId, setSubjectId] = useState("")
    const [classId, setClassId] = useState("")

    const [assignments, setAssignments] =
        useState<Assignment[]>(initialAssignments)

    const [loading, setLoading] = useState(false)
    const [loadingAssignments, setLoadingAssignments] =
        useState(false)

    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    async function loadAssignments() {
        try {
            setLoadingAssignments(true)
            setError("")

            const response = await fetch(
                "/api/teacher-assignments",
                {
                    cache: "no-store",
                },
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to load assignments",
                )
            }

            setAssignments(
                data.assignments ?? [],
            )
        } catch (error) {
            console.error(error)

            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load assignments",
            )
        } finally {
            setLoadingAssignments(false)
        }
    }

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        setError("")
        setSuccess("")

        if (!teacherId || !subjectId || !classId) {
            setError(
                "Please select a teacher, subject and class.",
            )

            return
        }

        try {
            setLoading(true)

            const response = await fetch(
                "/api/teacher-assignments",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        teacherId,
                        subjectId,
                        classId,
                    }),
                },
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to create assignment",
                )
            }

            setSuccess(
                "Teacher assignment created successfully.",
            )

            setTeacherId("")
            setSubjectId("")
            setClassId("")

            await loadAssignments()
        } catch (error) {
            console.error(error)

            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to create assignment",
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">

            {/* ================================================= */}
            {/* ASSIGN TEACHER */}
            {/* ================================================= */}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                {/* Header */}

                <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8">

                    <div className="flex items-start gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">

                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3.5 21a8.5 8.5 0 0 1 17 0"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 8v5M16.5 10.5h5"
                                />
                            </svg>

                        </div>

                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                Assign Teacher
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Assign a teacher to a subject
                                and class.
                            </p>
                        </div>

                    </div>

                </div>


                {/* Form */}

                <form
                    onSubmit={handleSubmit}
                    className="p-6 sm:p-8"
                >

                    <div className="grid gap-5 md:grid-cols-3">

                        {/* Teacher */}

                        <div>
                            <label
                                htmlFor="teacher"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Teacher
                            </label>

                            <select
                                id="teacher"
                                value={teacherId}
                                onChange={(event) =>
                                    setTeacherId(
                                        event.target.value,
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                            >
                                <option value="">
                                    Select teacher
                                </option>

                                {teachers.map(
                                    (teacher) => (
                                        <option
                                            key={teacher.id}
                                            value={teacher.id}
                                        >
                                            {teacher.name ??
                                                teacher.email ??
                                                "Unknown teacher"}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>


                        {/* Subject */}

                        <div>
                            <label
                                htmlFor="subject"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Subject
                            </label>

                            <select
                                id="subject"
                                value={subjectId}
                                onChange={(event) =>
                                    setSubjectId(
                                        event.target.value,
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                            >
                                <option value="">
                                    Select subject
                                </option>

                                {subjects.map(
                                    (subject) => (
                                        <option
                                            key={subject.id}
                                            value={subject.id}
                                        >
                                            {subject.name}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>


                        {/* Class */}

                        <div>
                            <label
                                htmlFor="school-class"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Class
                            </label>

                            <select
                                id="school-class"
                                value={classId}
                                onChange={(event) =>
                                    setClassId(
                                        event.target.value,
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                            >
                                <option value="">
                                    Select class
                                </option>

                                {classes.map(
                                    (schoolClass) => (
                                        <option
                                            key={schoolClass.id}
                                            value={schoolClass.id}
                                        >
                                            {schoolClass.name}
                                            {" — "}
                                            Grade{" "}
                                            {
                                                schoolClass.gradeLevel
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>

                    </div>


                    {/* Messages */}

                    <div className="mt-5 space-y-3">

                        {error && (
                            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="mt-0.5 h-5 w-5 shrink-0"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        d="M12 8v4M12 16h.01"
                                    />
                                </svg>

                                <span>{error}</span>

                            </div>
                        )}

                        {success && (
                            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">

                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="mt-0.5 h-5 w-5 shrink-0"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m8 12 2.5 2.5L16 9"
                                    />
                                </svg>

                                <span>{success}</span>

                            </div>
                        )}

                    </div>


                    {/* Submit */}

                    <div className="mt-6 flex justify-end">

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >

                            {loading ? (
                                <>
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="9"
                                            stroke="currentColor"
                                            strokeOpacity=".25"
                                            strokeWidth="3"
                                        />

                                        <path
                                            d="M21 12a9 9 0 0 0-9-9"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />
                                    </svg>

                                    Creating...
                                </>
                            ) : (
                                <>
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        className="h-4 w-4"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            d="M12 5v14M5 12h14"
                                        />
                                    </svg>

                                    Assign Teacher
                                </>
                            )}

                        </button>

                    </div>

                </form>

            </section>


            {/* ================================================= */}
            {/* CURRENT ASSIGNMENTS */}
            {/* ================================================= */}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                {/* Header */}

                <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">

                    <div className="flex items-start gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">

                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>

                        </div>

                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                Teacher Assignments
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Current assignments for this
                                academic year.
                            </p>
                        </div>

                    </div>


                    <button
                        type="button"
                        onClick={loadAssignments}
                        disabled={loadingAssignments}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className={`h-4 w-4 ${
                                loadingAssignments
                                    ? "animate-spin"
                                    : ""
                            }`}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20 11a8.1 8.1 0 0 0-14.9-4M4 5v4h4M4 13a8.1 8.1 0 0 0 14.9 4M20 19v-4h-4"
                            />
                        </svg>

                        {loadingAssignments
                            ? "Refreshing..."
                            : "Refresh"}

                    </button>

                </div>


                {/* Content */}

                {loadingAssignments ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">

                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

                        <p className="mt-4 text-sm font-medium text-slate-600">
                            Loading assignments...
                        </p>

                    </div>
                ) : assignments.length === 0 ? (
                    <div className="px-6 py-16 text-center">

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                className="h-7 w-7"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 7h8M8 12h8M8 17h5"
                                />

                                <rect
                                    x="4"
                                    y="3"
                                    width="16"
                                    height="18"
                                    rx="2"
                                />
                            </svg>

                        </div>

                        <h3 className="mt-4 text-sm font-semibold text-slate-800">
                            No teacher assignments yet
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            Assign a teacher to a subject
                            and class above.
                        </p>

                    </div>
                ) : (
                    <div className="overflow-x-auto">

<table className="w-full min-w-[720px] border-collapse">

                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/60 text-left">

                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Teacher
                                    </th>

                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Subject
                                    </th>

                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Class
                                    </th>

                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Grade
                                    </th>

                                </tr>
                            </thead>


                            <tbody className="divide-y divide-slate-100">

                                {assignments.map(
                                    (
                                        assignment,
                                        index,
                                    ) => (
                                        <tr
                                            key={`${assignment.teacherId}-${assignment.subjectId}-${assignment.classId}-${index}`}
                                            className="transition hover:bg-slate-50"
                                        >

                                            {/* Teacher */}

                                            <td className="px-6 py-4">

                                                <div className="flex items-center gap-3">

                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                                                        {(
                                                            assignment
                                                                .teacher
                                                                ?.name ??
                                                            assignment
                                                                .teacher
                                                                ?.email ??
                                                            "?"
                                                        )
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <div className="min-w-0">

                                                        <p className="truncate text-sm font-semibold text-slate-800">
                                                            {
                                                                assignment
                                                                    .teacher
                                                                    ?.name ??
                                                                assignment
                                                                    .teacher
                                                                    ?.email ??
                                                                "Unknown teacher"
                                                            }
                                                        </p>

                                                        {assignment
                                                            .teacher
                                                            ?.email &&
                                                            assignment
                                                                .teacher
                                                                ?.name && (
                                                                <p className="truncate text-xs text-slate-400">
                                                                    {
                                                                        assignment
                                                                            .teacher
                                                                            .email
                                                                    }
                                                                </p>
                                                            )}

                                                    </div>

                                                </div>

                                            </td>


                                            {/* Subject */}

                                            <td className="px-6 py-4">

                                                <span className="text-sm font-medium text-slate-700">
                                                    {
                                                        assignment.subjectName
                                                    }
                                                </span>

                                            </td>


                                            {/* Class */}

                                            <td className="px-6 py-4">

                                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                    {
                                                        assignment.className
                                                    }
                                                </span>

                                            </td>


                                            {/* Grade */}

                                            <td className="px-6 py-4">

                                                <span className="inline-flex items-center rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                                                    Grade{" "}
                                                    {
                                                        assignment.gradeLevel
                                                    }
                                                </span>

                                            </td>

                                        </tr>
                                    ),
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </section>

        </div>
    )
}
