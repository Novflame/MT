"use client"

import { useState } from "react"

type AcademicYear = {
    id: string
    name: string
    startDate: string
    endDate: string
    isActive: boolean
}

type SchoolClass = {
    id: string
    name: string
    gradeLevel: number
}

type Subject = {
    id: string
    name: string
    department?: {
        id: string
        name: string
    } | null
}

type Props = {
    academicYears: AcademicYear[]
    classes: SchoolClass[]
    subjects: Subject[]
    activeYearId: string | null
}

export default function CoreSubjectsForm({
    academicYears,
    classes,
    subjects,
    activeYearId,
}: Props) {

    const [academicYearId, setAcademicYearId] =
        useState(activeYearId ?? "")

    const [classId, setClassId] =
        useState("")

    const [selectedSubjects, setSelectedSubjects] =
        useState<string[]>([])

    const [loading, setLoading] =
        useState(false)

    const [loadingSubjects, setLoadingSubjects] =
        useState(false)

    const [message, setMessage] =
        useState("")

    const [error, setError] =
        useState("")


    // =================================================
    // Load current core subjects when class/year changes
    // =================================================

    async function loadCoreSubjects(
        yearId: string,
        selectedClassId: string,
    ) {
        if (!yearId || !selectedClassId) {
            setSelectedSubjects([])
            return
        }

        setLoadingSubjects(true)
        setError("")
        setMessage("")

        try {
            const response =
                await fetch(
                    `/api/core-subjects?academicYearId=${encodeURIComponent(
                        yearId,
                    )}&classId=${encodeURIComponent(
                        selectedClassId,
                    )}`,
                )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to load core subjects",
                )
            }

            setSelectedSubjects(
                data.subjectIds ?? [],
            )
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load core subjects",
            )
        } finally {
            setLoadingSubjects(false)
        }
    }


    function handleYearChange(
        value: string,
    ) {
        setAcademicYearId(value)
        setSelectedSubjects([])

        if (classId) {
            loadCoreSubjects(
                value,
                classId,
            )
        }
    }


    function handleClassChange(
        value: string,
    ) {
        setClassId(value)

        loadCoreSubjects(
            academicYearId,
            value,
        )
    }


    function toggleSubject(
        subjectId: string,
    ) {
        setSelectedSubjects(
            (current) => {
                if (
                    current.includes(
                        subjectId,
                    )
                ) {
                    return current.filter(
                        (id) =>
                            id !== subjectId,
                    )
                }

                return [
                    ...current,
                    subjectId,
                ]
            },
        )
    }


    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (
            !academicYearId ||
            !classId
        ) {
            setError(
                "اختر السنة الدراسية والصف أولاً",
            )

            return
        }

        setLoading(true)
        setError("")
        setMessage("")

        try {
            const response =
                await fetch(
                    "/api/core-subjects",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            academicYearId,
                            classId,
                            subjectIds:
                                selectedSubjects,
                        }),
                    },
                )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to save core subjects",
                )
            }

            setMessage(
                "تم حفظ المواد الأساسية بنجاح",
            )
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "حدث خطأ أثناء الحفظ",
            )
        } finally {
            setLoading(false)
        }
    }


    // return (
    //     <div>
    //         <h1>
    //             المواد الأساسية
    //         </h1>

    //         <p>
    //             حدد المواد التي تعتبر أساسية
    //             للترقية لهذا الصف والسنة الدراسية.
    //         </p>


    //         <form
    //             onSubmit={
    //                 handleSubmit
    //             }
    //         >

    //             {/* Academic Year */}

    //             <div>
    //                 <label>
    //                     السنة الدراسية
    //                 </label>

    //                 <select
    //                     value={
    //                         academicYearId
    //                     }
    //                     onChange={(event) =>
    //                         handleYearChange(
    //                             event.target.value,
    //                         )
    //                     }
    //                 >
    //                     <option value="">
    //                         اختر السنة
    //                     </option>

    //                     {academicYears.map(
    //                         (year) => (
    //                             <option
    //                                 key={year.id}
    //                                 value={year.id}
    //                             >
    //                                 {year.name}
    //                                 {year.isActive
    //                                     ? " — الحالية"
    //                                     : ""}
    //                             </option>
    //                         ),
    //                     )}
    //                 </select>
    //             </div>


    //             {/* Class */}

    //             <div>
    //                 <label>
    //                     الصف
    //                 </label>

    //                 <select
    //                     value={classId}
    //                     onChange={(event) =>
    //                         handleClassChange(
    //                             event.target.value,
    //                         )
    //                     }
    //                 >
    //                     <option value="">
    //                         اختر الصف
    //                     </option>

    //                     {classes.map(
    //                         (schoolClass) => (
    //                             <option
    //                                 key={
    //                                     schoolClass.id
    //                                 }
    //                                 value={
    //                                     schoolClass.id
    //                                 }
    //                             >
    //                                 {schoolClass.name}
    //                             </option>
    //                         ),
    //                     )}
    //                 </select>
    //             </div>


    //             {/* Subjects */}

    //             {academicYearId &&
    //                 classId && (
    //                     <div>

    //                         <h2>
    //                             المواد
    //                         </h2>

    //                         {loadingSubjects ? (
    //                             <p>
    //                                 جاري تحميل
    //                                 المواد الأساسية...
    //                             </p>
    //                         ) : (
    //                             <div>
    //                                 {subjects.map(
    //                                     (
    //                                         subject,
    //                                     ) => (
    //                                         <label
    //                                             key={
    //                                                 subject.id
    //                                             }
    //                                         >
    //                                             <input
    //                                                 type="checkbox"
    //                                                 checked={selectedSubjects.includes(
    //                                                     subject.id,
    //                                                 )}
    //                                                 onChange={() =>
    //                                                     toggleSubject(
    //                                                         subject.id,
    //                                                     )
    //                                                 }
    //                                             />

    //                                             <span>
    //                                                 {
    //                                                     subject.name
    //                                                 }
    //                                             </span>

    //                                             {subject.department && (
    //                                                 <small>
    //                                                     {" "}
    //                                                     (
    //                                                     {
    //                                                         subject
    //                                                             .department
    //                                                             .name
    //                                                     }
    //                                                     )
    //                                                 </small>
    //                                             )}
    //                                         </label>
    //                                     ),
    //                                 )}
    //                             </div>
    //                         )}

    //                     </div>
    //                 )}



    //             {error && (
    //                 <p>
    //                     {error}
    //                 </p>
    //             )}

    //             {message && (
    //                 <p>
    //                     {message}
    //                 </p>
    //             )}


    //             <button
    //                 type="submit"
    //                 disabled={
    //                     loading ||
    //                     loadingSubjects ||
    //                     !academicYearId ||
    //                     !classId
    //                 }
    //             >
    //                 {loading
    //                     ? "جاري الحفظ..."
    //                     : "حفظ المواد الأساسية"}
    //             </button>

    //         </form>
    //     </div>
    // )
    return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">

            {/* Header */}
            <div className="mb-6 text-center">
                <p className="text-sm font-semibold text-blue-600">
                    School Management
                </p>

                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                    المواد الأساسية
                </h1>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    حدد المواد التي تعتبر أساسية للترقية لهذا الصف
                    والسنة الدراسية.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8"
            >

                {/* Year + Class */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    {/* Academic Year */}
                    <div className="space-y-2">
                        <label
                            htmlFor="academicYear"
                            className="block text-sm font-semibold text-slate-700"
                        >
                            السنة الدراسية
                        </label>

                        <select
                            id="academicYear"
                            value={academicYearId}
                            onChange={(event) =>
                                handleYearChange(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">
                                اختر السنة
                            </option>

                            {academicYears.map((year) => (
                                <option
                                    key={year.id}
                                    value={year.id}
                                >
                                    {year.name}
                                    {year.isActive
                                        ? " — الحالية"
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Class */}
                    <div className="space-y-2">
                        <label
                            htmlFor="class"
                            className="block text-sm font-semibold text-slate-700"
                        >
                            الصف
                        </label>

                        <select
                            id="class"
                            value={classId}
                            onChange={(event) =>
                                handleClassChange(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">
                                اختر الصف
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
                    </div>
                </div>

                {/* Subjects */}
                {academicYearId && classId && (
                    <div className="mt-8 border-t border-slate-100 pt-6">

                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-slate-900">
                                المواد
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                اختر المواد التي يجب اعتبارها أساسية
                                للترقية.
                            </p>
                        </div>

                        {loadingSubjects ? (
                            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-300">
                                <p className="text-sm text-slate-500">
                                    جاري تحميل المواد الأساسية...
                                </p>
                            </div>
                        ) : subjects.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                                <p className="text-sm text-slate-500">
                                    لا توجد مواد متاحة للاختيار.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {subjects.map((subject) => {
                                    const isSelected =
                                        selectedSubjects.includes(
                                            subject.id,
                                        )

                                    return (
                                        <label
                                            key={subject.id}
                                            className={`group cursor-pointer rounded-xl border p-4 transition ${
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">

                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        toggleSubject(
                                                            subject.id,
                                                        )
                                                    }
                                                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />

                                                <div className="min-w-0">
                                                    <p
                                                        className={`truncate text-sm font-semibold ${
                                                            isSelected
                                                                ? "text-blue-700"
                                                                : "text-slate-800"
                                                        }`}
                                                    >
                                                        {subject.name}
                                                    </p>

                                                    {subject.department && (
                                                        <p className="mt-1 truncate text-xs text-slate-500">
                                                            {
                                                                subject
                                                                    .department
                                                                    .name
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Messages */}
                <div className="mt-6 space-y-3">

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            {message}
                        </div>
                    )}

                </div>

                {/* Submit */}
                <div className="mt-6 flex justify-center">
                    <button
                        type="submit"
                        disabled={
                            loading ||
                            loadingSubjects ||
                            !academicYearId ||
                            !classId
                        }
                        className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-56"
                    >
                        {loading
                            ? "جاري الحفظ..."
                            : "حفظ المواد الأساسية"}
                    </button>
                </div>

            </form>
        </div>
    </div>
)
}