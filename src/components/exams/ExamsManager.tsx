
"use client"

import { useEffect, useMemo, useState } from "react"
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    FileText,
    Loader2,
    Moon,
    Sun,
} from "lucide-react"

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

type ExamType =
    | "QUIZ"
    | "MONTHLY"
    | "MIDTERM"
    | "FINAL"

type Language = "en" | "ar" | "fr"

type Translation = {
    eyebrow: string
    title: string
    description: string

    department: string
    subject: string
    className: string
    examType: string
    examDate: string
    maximumScore: string

    selectDepartment: string
    selectSubject: string
    selectClass: string
    selectExamType: string

    quiz: string
    monthly: string
    midterm: string
    final: string

    createExam: string
    creating: string
    requiredFields: string
    invalidScore: string
    success: string
    genericError: string

    formHint: string
    serverGeneratedName: string

    lightMode: string
    darkMode: string
}

const translations: Record<Language, Translation> = {
    en: {
        eyebrow: "Academic Assessment",
        title: "Create Exam",
        description:
            "Create a scheduled assessment for a subject and class. The official exam name is generated automatically.",

        department: "Department",
        subject: "Subject",
        className: "Class",
        examType: "Exam type",
        examDate: "Exam date",
        maximumScore: "Maximum score",

        selectDepartment: "Select department",
        selectSubject: "Select subject",
        selectClass: "Select class",
        selectExamType: "Select exam type",

        quiz: "Quiz",
        monthly: "Monthly",
        midterm: "Midterm",
        final: "Final",

        createExam: "Create exam",
        creating: "Creating exam...",
        requiredFields:
            "Please complete all required fields.",
        invalidScore:
            "Maximum score must be a positive whole number.",
        success: "Exam created successfully.",
        genericError:
            "Unable to create the exam. Please try again.",

        formHint:
            "The exam name, sequence number, and academic year are managed automatically by the system.",
        serverGeneratedName:
            "Automatic exam naming",
        lightMode: "Light mode",
        darkMode: "Dark mode",
    },

    ar: {
        eyebrow: "التقييم الأكاديمي",
        title: "إنشاء امتحان",
        description:
            "أنشئ تقييمًا محددًا لمادة وفصل دراسي. يتم إنشاء الاسم الرسمي للامتحان تلقائيًا.",

        department: "القسم",
        subject: "المادة",
        className: "الفصل",
        examType: "نوع الامتحان",
        examDate: "تاريخ الامتحان",
        maximumScore: "الدرجة القصوى",

        selectDepartment: "اختر القسم",
        selectSubject: "اختر المادة",
        selectClass: "اختر الفصل",
        selectExamType: "اختر نوع الامتحان",

        quiz: "اختبار قصير",
        monthly: "شهري",
        midterm: "منتصف الفصل",
        final: "نهائي",

        createExam: "إنشاء الامتحان",
        creating: "جارٍ إنشاء الامتحان...",
        requiredFields:
            "يرجى إكمال جميع الحقول المطلوبة.",
        invalidScore:
            "يجب أن تكون الدرجة القصوى رقمًا صحيحًا موجبًا.",
        success: "تم إنشاء الامتحان بنجاح.",
        genericError:
            "تعذر إنشاء الامتحان. يرجى المحاولة مرة أخرى.",

        formHint:
            "يتم إنشاء اسم الامتحان ورقمه التسلسلي والسنة الأكاديمية تلقائيًا بواسطة النظام.",
        serverGeneratedName:
            "اسم الامتحان تلقائي",
        lightMode: "الوضع النهاري",
        darkMode: "الوضع الليلي",
    },

    fr: {
        eyebrow: "Évaluation académique",
        title: "Créer un examen",
        description:
            "Créez une évaluation planifiée pour une matière et une classe. Le nom officiel est généré automatiquement.",

        department: "Département",
        subject: "Matière",
        className: "Classe",
        examType: "Type d'examen",
        examDate: "Date de l'examen",
        maximumScore: "Note maximale",

        selectDepartment: "Sélectionner un département",
        selectSubject: "Sélectionner une matière",
        selectClass: "Sélectionner une classe",
        selectExamType: "Sélectionner le type",

        quiz: "Quiz",
        monthly: "Mensuel",
        midterm: "Mi-semestre",
        final: "Final",

        createExam: "Créer l'examen",
        creating: "Création en cours...",
        requiredFields:
            "Veuillez remplir tous les champs obligatoires.",
        invalidScore:
            "La note maximale doit être un nombre entier positif.",
        success: "Examen créé avec succès.",
        genericError:
            "Impossible de créer l'examen. Veuillez réessayer.",

        formHint:
            "Le nom, le numéro de séquence et l'année académique sont gérés automatiquement par le système.",
        serverGeneratedName:
            "Nom automatique de l'examen",
        lightMode: "Mode clair",
        darkMode: "Mode sombre",
    },
}

const examTypes: ExamType[] = [
    "QUIZ",
    "MONTHLY",
    "MIDTERM",
    "FINAL",
]

function getStoredLanguage(): Language {
    if (typeof window === "undefined") {
        return "en"
    }

    const value =
        window.localStorage.getItem(
            "school-language",
        )

    if (
        value === "en" ||
        value === "ar" ||
        value === "fr"
    ) {
        return value
    }

    return "en"
}

function getStoredTheme(): "light" | "dark" {
    if (typeof window === "undefined") {
        return "light"
    }

    const value =
        window.localStorage.getItem(
            "school-theme",
        )

    if (value === "dark" || value === "light") {
        return value
    }

    return window.matchMedia(
        "(prefers-color-scheme: dark)",
    ).matches
        ? "dark"
        : "light"
}

function getExamTypeLabel(
    type: ExamType,
    t: Translation,
) {
    switch (type) {
        case "QUIZ":
            return t.quiz

        case "MONTHLY":
            return t.monthly

        case "MIDTERM":
            return t.midterm

        case "FINAL":
            return t.final
    }
}

export default function ExamsManager({
    departments,
    classes,
}: Props) {
    const [departmentId, setDepartmentId] =
        useState("")
    const [subjectId, setSubjectId] =
        useState("")
    const [classId, setClassId] =
        useState("")
    const [type, setType] =
        useState<ExamType | "">("")
    const [examDate, setExamDate] =
        useState("")
    const [maxScore, setMaxScore] =
        useState("")

    const [loading, setLoading] =
        useState(false)

    const [language, setLanguage] =
        useState<Language>("en")

    const [theme, setTheme] =
        useState<"light" | "dark">("light")

    const [error, setError] =
        useState("")

    const [success, setSuccess] =
        useState("")

    useEffect(() => {
        const storedLanguage =
            getStoredLanguage()

        const storedTheme =
            getStoredTheme()

        setLanguage(storedLanguage)
        setTheme(storedTheme)

        document.documentElement.classList.toggle(
            "dark",
            storedTheme === "dark",
        )

        document.documentElement.lang =
            storedLanguage

        document.documentElement.dir =
            storedLanguage === "ar"
                ? "rtl"
                : "ltr"
    }, [])

    const t =
        translations[language]

    const selectedDepartment =
        useMemo(
            () =>
                departments.find(
                    (department) =>
                        department.id ===
                        departmentId,
                ),
            [departments, departmentId],
        )

    const availableSubjects =
        selectedDepartment?.subjects ?? []

    function handleDepartmentChange(
        value: string,
    ) {
        setDepartmentId(value)
        setSubjectId("")
        setError("")
        setSuccess("")
    }

    function handleThemeToggle() {
        const nextTheme =
            theme === "light"
                ? "dark"
                : "light"

        setTheme(nextTheme)

        document.documentElement.classList.toggle(
            "dark",
            nextTheme === "dark",
        )

        window.localStorage.setItem(
            "school-theme",
            nextTheme,
        )
    }

    async function createExam() {
        setError("")
        setSuccess("")

        if (
            !departmentId ||
            !subjectId ||
            !classId ||
            !type ||
            !examDate ||
            !maxScore
        ) {
            setError(t.requiredFields)
            return
        }

        const numericMaxScore =
            Number(maxScore)

        if (
            !Number.isInteger(
                numericMaxScore,
            ) ||
            numericMaxScore <= 0
        ) {
            setError(t.invalidScore)
            return
        }

        setLoading(true)

        try {
            const response =
                await fetch(
                    "/api/exams",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            subjectId,
                            classId,
                            type,
                            examDate,
                            maxScore:
                                numericMaxScore,
                        }),
                    },
                )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                        t.genericError,
                )
            }

            setDepartmentId("")
            setSubjectId("")
            setClassId("")
            setType("")
            setExamDate("")
            setMaxScore("")

            setSuccess(t.success)
        } catch (caughtError) {
            console.error(
                "Failed to create exam:",
                caughtError,
            )

            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : t.genericError,
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section
            dir={
                language === "ar"
                    ? "rtl"
                    : "ltr"
            }
            className="
                min-h-dvh
                w-full
                bg-slate-50
                px-3 py-5
                text-slate-900
                dark:bg-slate-950
                dark:text-slate-100
                sm:px-5
                lg:px-6
            "
        >
            <div className="mx-auto w-full max-w-5xl">
                <div
                    className="
                        overflow-hidden
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        shadow-sm
                        dark:border-slate-800
                        dark:bg-slate-900
                    "
                >
                    {/* Header */}
                    <div
                        className="
                            border-b
                            border-slate-200
                            px-4 py-5
                            dark:border-slate-800
                            sm:px-6 sm:py-6
                        "
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                    <span
                                        className="
                                            flex h-9 w-9
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-blue-50
                                            text-blue-600
                                            dark:bg-blue-950/50
                                            dark:text-blue-400
                                        "
                                    >
                                        <ClipboardList
                                            size={19}
                                        />
                                    </span>

                                    <p
                                        className="
                                            text-xs
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                            text-blue-600
                                            dark:text-blue-400
                                        "
                                    >
                                        {t.eyebrow}
                                    </p>
                                </div>

                                <h1
                                    className="
                                        text-2xl
                                        font-bold
                                        tracking-tight
                                        text-slate-950
                                        dark:text-white
                                        sm:text-3xl
                                    "
                                >
                                    {t.title}
                                </h1>

                                <p
                                    className="
                                        mt-2
                                        max-w-2xl
                                        text-sm
                                        leading-6
                                        text-slate-500
                                        dark:text-slate-400
                                    "
                                >
                                    {t.description}
                                </p>
                            </div>

                            {/* Existing global theme preference */}
                            <button
                                type="button"
                                onClick={
                                    handleThemeToggle
                                }
                                className="
                                    inline-flex
                                    min-h-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-slate-50
                                    px-3
                                    text-sm
                                    font-medium
                                    text-slate-700
                                    transition
                                    hover:border-slate-300
                                    hover:bg-slate-100
                                    dark:border-slate-700
                                    dark:bg-slate-800
                                    dark:text-slate-200
                                    dark:hover:bg-slate-700
                                "
                                aria-label={
                                    theme ===
                                    "light"
                                        ? t.darkMode
                                        : t.lightMode
                                }
                            >
                                {theme ===
                                "light" ? (
                                    <Moon
                                        size={17}
                                    />
                                ) : (
                                    <Sun
                                        size={17}
                                    />
                                )}

                                <span className="hidden sm:inline">
                                    {theme ===
                                    "light"
                                        ? t.darkMode
                                        : t.lightMode}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Status messages */}
                    {(error || success) && (
                        <div className="px-4 pt-4 sm:px-6">
                            {error && (
                                <div
                                    role="alert"
                                    className="
                                        flex
                                        items-start
                                        gap-3
                                        rounded-xl
                                        border
                                        border-red-200
                                        bg-red-50
                                        px-4 py-3
                                        text-sm
                                        text-red-800
                                        dark:border-red-900/70
                                        dark:bg-red-950/40
                                        dark:text-red-200
                                    "
                                >
                                    <AlertCircle
                                        size={19}
                                        className="mt-0.5 shrink-0"
                                    />

                                    <span className="min-w-0">
                                        {error}
                                    </span>
                                </div>
                            )}

                            {success && (
                                <div
                                    role="status"
                                    className="
                                        flex
                                        items-start
                                        gap-3
                                        rounded-xl
                                        border
                                        border-emerald-200
                                        bg-emerald-50
                                        px-4 py-3
                                        text-sm
                                        text-emerald-800
                                        dark:border-emerald-900/70
                                        dark:bg-emerald-950/40
                                        dark:text-emerald-200
                                    "
                                >
                                    <CheckCircle2
                                        size={19}
                                        className="mt-0.5 shrink-0"
                                    />

                                    <span className="min-w-0">
                                        {success}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Form */}
                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Department */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="exam-department"
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-200
                                    "
                                >
                                    {
                                        t.department
                                    }
                                </label>

                                <select
                                    id="exam-department"
                                    value={
                                        departmentId
                                    }
                                    onChange={(e) =>
                                        handleDepartmentChange(
                                            e.target
                                                .value,
                                        )
                                    }
                                    disabled={
                                        loading
                                    }
                                    className="
                                        h-11
                                        w-full
                                        min-w-0
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-slate-100
                                        dark:focus:border-blue-400
                                    "
                                >
                                    <option value="">
                                        {
                                            t.selectDepartment
                                        }
                                    </option>

                                    {departments.map(
                                        (
                                            department,
                                        ) => (
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

                            {/* Subject */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="exam-subject"
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-200
                                    "
                                >
                                    {t.subject}
                                </label>

                                <select
                                    id="exam-subject"
                                    value={
                                        subjectId
                                    }
                                    onChange={(e) =>
                                        setSubjectId(
                                            e.target
                                                .value,
                                        )
                                    }
                                    disabled={
                                        !departmentId ||
                                        loading
                                    }
                                    className="
                                        h-11
                                        w-full
                                        min-w-0
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-slate-100
                                        dark:focus:border-blue-400
                                    "
                                >
                                    <option value="">
                                        {
                                            t.selectSubject
                                        }
                                    </option>

                                    {availableSubjects.map(
                                        (
                                            subject,
                                        ) => (
                                            <option
                                                key={
                                                    subject.id
                                                }
                                                value={
                                                    subject.id
                                                }
                                            >
                                                {
                                                    subject.name
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            {/* Class */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="exam-class"
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-200
                                    "
                                >
                                    {
                                        t.className
                                    }
                                </label>

                                <select
                                    id="exam-class"
                                    value={
                                        classId
                                    }
                                    onChange={(e) =>
                                        setClassId(
                                            e.target
                                                .value,
                                        )
                                    }
                                    disabled={
                                        loading
                                    }
                                    className="
                                        h-11
                                        w-full
                                        min-w-0
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-slate-100
                                        dark:focus:border-blue-400
                                    "
                                >
                                    <option value="">
                                        {
                                            t.selectClass
                                        }
                                    </option>

                                    {classes.map(
                                        (
                                            schoolClass,
                                        ) => (
                                            <option
                                                key={
                                                    schoolClass.id
                                                }
                                                value={
                                                    schoolClass.id
                                                }
                                            >
                                                {
                                                    schoolClass.name
                                                }{" "}
                                                ·{" "}
                                                {
                                                    schoolClass.gradeLevel
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            {/* Exam type */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="exam-type"
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-200
                                    "
                                >
                                    {
                                        t.examType
                                    }
                                </label>

                                <select
                                    id="exam-type"
                                    value={type}
                                    onChange={(e) =>
                                        setType(
                                            e.target
                                                .value as
                                                | ExamType
                                                | "",
                                        )
                                    }
                                    disabled={
                                        loading
                                    }
                                    className="
                                        h-11
                                        w-full
                                        min-w-0
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-slate-100
                                        dark:focus:border-blue-400
                                    "
                                >
                                    <option value="">
                                        {
                                            t.selectExamType
                                        }
                                    </option>

                                    {examTypes.map(
                                        (
                                            examType,
                                        ) => (
                                            <option
                                                key={
                                                    examType
                                                }
                                                value={
                                                    examType
                                                }
                                            >
                                                {getExamTypeLabel(
                                                    examType,
                                                    t,
                                                )}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            {/* Date */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="exam-date"
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-200
                                    "
                                >
                                    {
                                        t.examDate
                                    }
                                </label>

                                <div className="relative">
                                    <CalendarDays
                                        size={18}
                                        className="
                                            pointer-events-none
                                            absolute
                                            start-3
                                            top-1/2
                                            -translate-y-1/2
                                            text-slate-400
                                        "
                                    />

                                    <input
                                        id="exam-date"
                                        type="date"
                                        value={
                                            examDate
                                        }
                                        onChange={(
                                            e,
                                        ) =>
                                            setExamDate(
                                                e
                                                    .target
                                                    .value,
                                            )
                                        }
                                        disabled={
                                            loading
                                        }
                                        className="
                                            h-11
                                            w-full
                                            min-w-0
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            ps-10
                                            pe-3
                                            text-sm
                                            text-slate-900
                                            outline-none
                                            transition
                                            focus:border-blue-500
                                            focus:ring-4
                                            focus:ring-blue-500/10
                                            disabled:cursor-not-allowed
                                            disabled:opacity-60
                                            dark:border-slate-700
                                            dark:bg-slate-950
                                            dark:text-slate-100
                                            dark:focus:border-blue-400
                                        "
                                    />
                                </div>
                            </div>

                            {/* Maximum score */}
                            <div className="min-w-0">
                                <label
                                    htmlFor="exam-max-score"
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        dark:text-slate-200
                                    "
                                >
                                    {
                                        t.maximumScore
                                    }
                                </label>

                                <input
                                    id="exam-max-score"
                                    type="number"
                                    min="1"
                                    step="1"
                                    inputMode="numeric"
                                    value={
                                        maxScore
                                    }
                                    onChange={(e) =>
                                        setMaxScore(
                                            e.target
                                                .value,
                                        )
                                    }
                                    disabled={
                                        loading
                                    }
                                    placeholder="100"
                                    className="
                                        h-11
                                        w-full
                                        min-w-0
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                        dark:border-slate-700
                                        dark:bg-slate-950
                                        dark:text-slate-100
                                        dark:focus:border-blue-400
                                    "
                                />
                            </div>
                        </div>

                        {/* Automatic naming information */}
                        <div
                            className="
                                mt-5
                                flex
                                items-start
                                gap-3
                                rounded-xl
                                border
                                border-blue-100
                                bg-blue-50
                                px-4 py-3
                                dark:border-blue-900/60
                                dark:bg-blue-950/30
                            "
                        >
                            <FileText
                                size={18}
                                className="
                                    mt-0.5
                                    shrink-0
                                    text-blue-600
                                    dark:text-blue-400
                                "
                            />

                            <div className="min-w-0">
                                <p
                                    className="
                                        text-sm
                                        font-semibold
                                        text-blue-900
                                        dark:text-blue-200
                                    "
                                >
                                    {
                                        t.serverGeneratedName
                                    }
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        leading-5
                                        text-blue-700
                                        dark:text-blue-300
                                    "
                                >
                                    {t.formHint}
                                </p>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p
                                className="
                                    text-xs
                                    leading-5
                                    text-slate-500
                                    dark:text-slate-400
                                "
                            >
                                {type
                                    ? getExamTypeLabel(
                                          type,
                                          t,
                                      )
                                    : t.selectExamType}
                            </p>

                            <button
                                type="button"
                                onClick={
                                    createExam
                                }
                                disabled={
                                    loading
                                }
                                className="
                                    inline-flex
                                    min-h-11
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-blue-600
                                    px-5
                                    text-sm
                                    font-semibold
                                    text-white
                                    shadow-sm
                                    transition
                                    hover:bg-blue-700
                                    focus:outline-none
                                    focus:ring-4
                                    focus:ring-blue-500/20
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                    sm:w-auto
                                    dark:bg-blue-500
                                    dark:hover:bg-blue-600
                                "
                            >
                                {loading ? (
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <CheckCircle2
                                        size={18}
                                    />
                                )}

                                <span>
                                    {loading
                                        ? t.creating
                                        : t.createExam}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

