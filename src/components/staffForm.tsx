
"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/components/providers/LanguageProvider"

type StaffRole =
    | "principal"
    | "deputy"
    | "head_of_class"
    | "head_of_department"
    | "teacher"

type Staff = {
    id: string
    name: string
    email: string
    role: StaffRole
    schoolId: number
}

type Subject = {
    id: string
    name: string
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
}

type ClassHead = {
    userId: string
    classId: string
    className: string
    academicYearId: string
    head: {
        id: string
        name: string
        email: string
        role: StaffRole
    } | null
}

type Labels = {
    addStaff: string
    fullName: string
    email: string
    password: string
    selectRole: string
    teacher: string
    headOfClass: string
    headOfDepartment: string
    deputy: string
    principal: string
    creating: string
    createStaff: string
    schoolStaff: string
    staffDescription: string
    searchPlaceholder: string
    allRoles: string
    loadingStaff: string
    noStaff: string
    noStaffDescription: string
    role: string
    class: string
    notAssigned: string
    manage: string
    close: string
    assignClass: string
    closeClassAssignment: string
    assignClassTitle: string
    assignClassDescription: string
    selectClass: string
    assigning: string
    assign: string
    teachingAssignments: string
    teachingAssignmentsDescription: string
    currentAssignments: string
    noAssignments: string
    addAssignment: string
    selectSubject: string
    grade: string
    somethingWentWrong: string
    roles: Record<StaffRole, string>
}

function getLabels(
    locale: "en" | "ar" | "fr",
): Labels {
    if (locale === "ar") {
        return {
            addStaff: "إضافة موظف",
            fullName: "الاسم الكامل",
            email: "البريد الإلكتروني",
            password: "كلمة المرور",
            selectRole: "اختر الدور",
            teacher: "معلم",
            headOfClass: "رئيس الفصل",
            headOfDepartment: "رئيس القسم",
            deputy: "نائب المدير",
            principal: "المدير",
            creating: "جارٍ الإنشاء...",
            createStaff: "إنشاء حساب الموظف",
            schoolStaff: "موظفو المدرسة",
            staffDescription:
                "إدارة موظفي المدرسة والتكليفات التدريسية.",
            searchPlaceholder:
                "البحث بالاسم أو البريد الإلكتروني...",
            allRoles: "جميع الأدوار",
            loadingStaff: "جارٍ تحميل الموظفين...",
            noStaff: "لم يتم العثور على موظفين.",
            noStaffDescription:
                "حاول تغيير البحث أو فلتر الدور.",
            role: "الدور",
            class: "الفصل",
            notAssigned: "غير معيّن",
            manage: "إدارة",
            close: "إغلاق",
            assignClass: "تعيين الفصل",
            closeClassAssignment:
                "إغلاق تعيين الفصل",
            assignClassTitle: "تعيين الفصل",
            assignClassDescription:
                "اختر الفصل لهذا المسؤول عن الفصل.",
            selectClass: "اختر الفصل",
            assigning: "جارٍ التعيين...",
            assign: "تعيين",
            teachingAssignments: "التكليفات التدريسية",
            teachingAssignmentsDescription:
                "قم بتعيين هذا الموظف للمواد والفصول.",
            currentAssignments: "التكليفات الحالية",
            noAssignments: "لا توجد تكليفات حتى الآن.",
            addAssignment: "إضافة تكليف",
            selectSubject: "اختر المادة",
            grade: "الصف",
            somethingWentWrong: "حدث خطأ ما.",
            roles: {
                principal: "المدير",
                deputy: "نائب المدير",
                head_of_class: "رئيس الفصل",
                head_of_department: "رئيس القسم",
                teacher: "معلم",
            },
        }
    }

    if (locale === "fr") {
        return {
            addStaff: "Ajouter un membre",
            fullName: "Nom complet",
            email: "E-mail",
            password: "Mot de passe",
            selectRole: "Sélectionner le rôle",
            teacher: "Enseignant",
            headOfClass: "Responsable de classe",
            headOfDepartment: "Chef de département",
            deputy: "Directeur adjoint",
            principal: "Directeur",
            creating: "Création...",
            createStaff: "Créer le compte",
            schoolStaff: "Personnel de l'école",
            staffDescription:
                "Gérez le personnel et les affectations d'enseignement.",
            searchPlaceholder:
                "Rechercher par nom ou e-mail...",
            allRoles: "Tous les rôles",
            loadingStaff: "Chargement du personnel...",
            noStaff: "Aucun membre du personnel trouvé.",
            noStaffDescription:
                "Essayez de modifier votre recherche ou le filtre de rôle.",
            role: "Rôle",
            class: "Classe",
            notAssigned: "Non affecté",
            manage: "Gérer",
            close: "Fermer",
            assignClass: "Affecter une classe",
            closeClassAssignment:
                "Fermer l'affectation",
            assignClassTitle: "Affecter une classe",
            assignClassDescription:
                "Sélectionnez la classe pour ce responsable.",
            selectClass: "Sélectionner une classe",
            assigning: "Affectation...",
            assign: "Affecter",
            teachingAssignments: "Affectations d'enseignement",
            teachingAssignmentsDescription:
                "Affectez ce membre du personnel aux matières et aux classes.",
            currentAssignments: "Affectations actuelles",
            noAssignments: "Aucune affectation pour le moment.",
            addAssignment: "Ajouter une affectation",
            selectSubject: "Sélectionner une matière",
            grade: "Niveau",
            somethingWentWrong: "Une erreur s'est produite.",
            roles: {
                principal: "Directeur",
                deputy: "Directeur adjoint",
                head_of_class: "Responsable de classe",
                head_of_department: "Chef de département",
                teacher: "Enseignant",
            },
        }
    }

    return {
        addStaff: "Add Staff Member",
        fullName: "Full name",
        email: "Email",
        password: "Password",
        selectRole: "Select role",
        teacher: "Teacher",
        headOfClass: "Head of Class",
        headOfDepartment: "Head of Department",
        deputy: "Deputy",
        principal: "Principal",
        creating: "Creating...",
        createStaff: "Create Staff",
        schoolStaff: "School Staff",
        staffDescription:
            "Manage school staff and teaching assignments.",
        searchPlaceholder:
            "Search by name or email...",
        allRoles: "All roles",
        loadingStaff: "Loading staff...",
        noStaff: "No staff members found.",
        noStaffDescription:
            "Try changing your search or role filter.",
        role: "Role",
        class: "Class",
        notAssigned: "Not assigned",
        manage: "Manage",
        close: "Close",
        assignClass: "Assign Class",
        closeClassAssignment:
            "Close Class Assignment",
        assignClassTitle: "Assign Class",
        assignClassDescription:
            "Select the class for this Head of Class.",
        selectClass: "Select class",
        assigning: "Assigning...",
        assign: "Assign",
        teachingAssignments: "Teaching Assignments",
        teachingAssignmentsDescription:
            "Assign this staff member to subjects and classes.",
        currentAssignments: "Current assignments",
        noAssignments: "No assignments yet.",
        addAssignment: "Add assignment",
        selectSubject: "Select subject",
        grade: "Grade",
        somethingWentWrong: "Something went wrong.",
        roles: {
            principal: "Principal",
            deputy: "Deputy",
            head_of_class: "Head of Class",
            head_of_department: "Head of Department",
            teacher: "Teacher",
        },
    }
}

export default function StaffForm() {
    const { locale, direction } = useLanguage()
    const labels = getLabels(locale)

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] =
        useState<StaffRole>("teacher")

    const [staff, setStaff] = useState<Staff[]>([])

    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)
    const [loadingStaff, setLoadingStaff] =
        useState(true)

    const [subjects, setSubjects] =
        useState<Subject[]>([])

    const [classes, setClasses] =
        useState<SchoolClass[]>([])

    const [assignments, setAssignments] =
        useState<Assignment[]>([])

    const [selectedTeacher, setSelectedTeacher] =
        useState<string | null>(null)

    const [selectedSubject, setSelectedSubject] =
        useState("")

    const [selectedClass, setSelectedClass] =
        useState("")

    const [assignmentLoading, setAssignmentLoading] =
        useState<string | null>(null)

    const [search, setSearch] = useState("")

    const [filterRole, setFilterRole] =
        useState<StaffRole | "all">("all")

    const [classHeads, setClassHeads] =
        useState<ClassHead[]>([])

    const [selectedHeadClass, setSelectedHeadClass] =
        useState("")

    async function loadStaff() {
        try {
            setLoadingStaff(true)

            const response =
                await fetch("/api/staff")

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to load staff",
                )
            }

            setStaff(data.staff)
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load staff",
            )
        } finally {
            setLoadingStaff(false)
        }
    }

    async function loadAssignmentData() {
        try {
            const [
                subjectsResponse,
                classesResponse,
                assignmentsResponse,
            ] = await Promise.all([
                fetch("/api/subjects"),
                fetch("/api/classes"),
                fetch("/api/teacher-assignments"),
            ])

            const subjectsData =
                await subjectsResponse.json()

            const classesData =
                await classesResponse.json()

            const assignmentsData =
                await assignmentsResponse.json()

            if (!subjectsResponse.ok) {
                throw new Error(
                    subjectsData.error ??
                        "Failed to load subjects",
                )
            }

            if (!classesResponse.ok) {
                throw new Error(
                    classesData.error ??
                        "Failed to load classes",
                )
            }

            if (!assignmentsResponse.ok) {
                throw new Error(
                    assignmentsData.error ??
                        "Failed to load assignments",
                )
            }

            setSubjects(subjectsData)
            setClasses(classesData)
            setAssignments(
                assignmentsData.assignments,
            )
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load assignment data",
            )
        }
    }

    async function createAssignment(
        teacherId: string,
    ) {
        if (!selectedSubject || !selectedClass) {
            setError(
                locale === "ar"
                    ? "اختر المادة والفصل"
                    : locale === "fr"
                      ? "Sélectionnez une matière et une classe"
                      : "Select subject and class",
            )
            return
        }

        setAssignmentLoading(teacherId)
        setError("")
        setSuccess("")

        try {
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
                        subjectId: selectedSubject,
                        classId: selectedClass,
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
                locale === "ar"
                    ? "تم إنشاء تكليف المعلم"
                    : locale === "fr"
                      ? "Affectation créée avec succès"
                      : "Teacher assignment created",
            )

            setSelectedSubject("")
            setSelectedClass("")
            setSelectedTeacher(null)

            await loadAssignmentData()
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to create assignment",
            )
        } finally {
            setAssignmentLoading(null)
        }
    }

    async function loadClassHeads() {
        try {
            const response =
                await fetch("/api/class-heads")

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to load class heads",
                )
            }

            setClassHeads(data.assignments)
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load class heads",
            )
        }
    }

    async function assignClassHead(
        userId: string,
    ) {
        if (!selectedHeadClass) {
            setError(
                locale === "ar"
                    ? "اختر فصلاً"
                    : locale === "fr"
                      ? "Sélectionnez une classe"
                      : "Select a class",
            )
            return
        }

        setError("")
        setSuccess("")

        try {
            const response = await fetch(
                "/api/class-heads",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        userId,
                        classId: selectedHeadClass,
                    }),
                },
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Failed to assign class head",
                )
            }

            setSuccess(
                locale === "ar"
                    ? "تم تعيين رئيس الفصل بنجاح"
                    : locale === "fr"
                      ? "Responsable de classe affecté avec succès"
                      : "Head of Class assigned successfully",
            )

            setSelectedHeadClass("")

            await loadClassHeads()
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to assign class head",
            )
        }
    }

    useEffect(() => {
        async function loadData() {
            await loadStaff()
            await loadAssignmentData()
            await loadClassHeads()
        }

        loadData()
    }, [])

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        setError("")
        setSuccess("")
        setName("")
        setEmail("")
        setPassword("")

        setLoading(true)

        try {
            const response = await fetch(
                "/api/staff",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        role,
                    }),
                },
            )

            const data = await response.json()

            if (!response.ok) {
                setError(
                    data.error ??
                        "Failed to create staff",
                )
                return
            }

            setSuccess(
                `${locale === "ar" ? "تم إنشاء حساب الموظف" : locale === "fr" ? "Compte créé" : "Staff account created"}: ${data.staff.email}`,
            )

            setName("")
            setEmail("")
            setPassword("")
            setRole("teacher")

            await loadStaff()
        } catch {
            setError(labels.somethingWentWrong)
        } finally {
            setLoading(false)
        }
    }

    const teachableRoles: StaffRole[] = [
        "principal",
        "deputy",
        "head_of_class",
        "head_of_department",
        "teacher",
    ]

    const filteredStaff = staff.filter(
        (member) => {
            const searchValue =
                search.toLowerCase()

            const matchesSearch =
                member.name
                    .toLowerCase()
                    .includes(searchValue) ||
                member.email
                    .toLowerCase()
                    .includes(searchValue)

            const matchesRole =
                filterRole === "all" ||
                member.role === filterRole

            return (
                matchesSearch &&
                matchesRole
            )
        },
    )

    return (
        <div
            className="space-y-4 sm:space-y-6"
            dir={direction}
        >
            {/* CREATE STAFF */}

            <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
            >
                <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                        {labels.addStaff}
                    </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <input
                        value={name}
                        onChange={(event) =>
                            setName(
                                event.target.value,
                            )
                        }
                        placeholder={labels.fullName}
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                        required
                    />

                    <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(
                                event.target.value,
                            )
                        }
                        placeholder={labels.email}
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                        required
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(event) =>
                            setPassword(
                                event.target.value,
                            )
                        }
                        placeholder={labels.password}
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                        minLength={8}
                        required
                    />

                    <select
                        value={role}
                        onChange={(event) =>
                            setRole(
                                event.target
                                    .value as StaffRole,
                            )
                        }
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                    >
                        <option value="teacher">
                            {labels.teacher}
                        </option>
                        <option value="head_of_class">
                            {labels.headOfClass}
                        </option>
                        <option value="head_of_department">
                            {labels.headOfDepartment}
                        </option>
                        <option value="deputy">
                            {labels.deputy}
                        </option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    {loading
                        ? labels.creating
                        : labels.createStaff}
                </button>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {success}
                    </div>
                )}
            </form>

            {/* STAFF LIST */}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                        {labels.schoolStaff}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {labels.staffDescription}
                    </p>
                </div>

                {/* SEARCH + FILTER */}

                <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                        placeholder={
                            labels.searchPlaceholder
                        }
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                    />

                    <select
                        value={filterRole}
                        onChange={(event) =>
                            setFilterRole(
                                event.target
                                    .value as
                                    | StaffRole
                                    | "all",
                            )
                        }
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:min-w-48 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                    >
                        <option value="all">
                            {labels.allRoles}
                        </option>

                        {(
                            [
                                "principal",
                                "deputy",
                                "head_of_class",
                                "head_of_department",
                                "teacher",
                            ] as StaffRole[]
                        ).map(
                            (staffRole) => (
                                <option
                                    key={staffRole}
                                    value={staffRole}
                                >
                                    {
                                        labels.roles[
                                            staffRole
                                        ]
                                    }
                                </option>
                            ),
                        )}
                    </select>
                </div>

                {loadingStaff && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                        {labels.loadingStaff}
                    </div>
                )}

                {!loadingStaff &&
                    filteredStaff.length ===
                        0 && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-950">
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {labels.noStaff}
                            </p>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {
                                    labels.noStaffDescription
                                }
                            </p>
                        </div>
                    )}

                <div className="space-y-3">
                    {!loadingStaff &&
                        filteredStaff.map(
                            (member) => {
                                const isSelected =
                                    selectedTeacher ===
                                    member.id

                                const memberAssignments =
                                    assignments.filter(
                                        (
                                            assignment,
                                        ) =>
                                            assignment.teacherId ===
                                            member.id,
                                    )

                                const classHeadAssignment =
                                    classHeads.find(
                                        (
                                            assignment,
                                        ) =>
                                            assignment.userId ===
                                            member.id,
                                    )

                                return (
                                    <div
                                        key={
                                            member.id
                                        }
                                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                                    >
                                        {/* STAFF ROW */}

                                        <div className="flex flex-col gap-4 p-4 sm:p-5">
                                            <div className="min-w-0">
                                                <p className="break-words text-base font-bold text-slate-900 dark:text-white">
                                                    {
                                                        member.name
                                                    }
                                                </p>

                                                <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                                                    {
                                                        member.email
                                                    }
                                                </p>

                                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                                    {
                                                        labels.role
                                                    }
                                                    {": "}
                                                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                                                        {
                                                            labels
                                                                .roles[
                                                                member
                                                                    .role
                                                            ]
                                                        }
                                                    </span>
                                                </p>

                                                {member.role ===
                                                    "head_of_class" && (
                                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                        {
                                                            labels.class
                                                        }
                                                        {": "}
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {classHeadAssignment
                                                                ? classHeadAssignment.className
                                                                : labels.notAssigned}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="grid gap-2 sm:flex sm:flex-wrap">
                                                {teachableRoles.includes(
                                                    member.role,
                                                ) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (
                                                                isSelected
                                                            ) {
                                                                setSelectedTeacher(
                                                                    null,
                                                                )
                                                                setSelectedSubject(
                                                                    "",
                                                                )
                                                                setSelectedClass(
                                                                    "",
                                                                )
                                                            } else {
                                                                setSelectedTeacher(
                                                                    member.id,
                                                                )
                                                                setSelectedSubject(
                                                                    "",
                                                                )
                                                                setSelectedClass(
                                                                    "",
                                                                )
                                                                setError(
                                                                    "",
                                                                )
                                                                setSuccess(
                                                                    "",
                                                                )
                                                            }
                                                        }}
                                                        className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 sm:w-auto"
                                                    >
                                                        {isSelected
                                                            ? labels.close
                                                            : labels.manage}
                                                    </button>
                                                )}

                                                {member.role ===
                                                    "head_of_class" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTeacher(
                                                                selectedTeacher ===
                                                                    member.id
                                                                    ? null
                                                                    : member.id,
                                                            )

                                                            setSelectedHeadClass(
                                                                "",
                                                            )
                                                            setError(
                                                                "",
                                                            )
                                                            setSuccess(
                                                                "",
                                                            )
                                                        }}
                                                        className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 sm:w-auto"
                                                    >
                                                        {selectedTeacher ===
                                                        member.id
                                                            ? labels.closeClassAssignment
                                                            : labels.assignClass}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* CLASS HEAD ASSIGNMENT */}

                                        {selectedTeacher ===
                                            member.id &&
                                            member.role ===
                                                "head_of_class" && (
                                                <div className="border-t border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-5">
                                                    <h3 className="font-bold text-slate-900 dark:text-white">
                                                        {
                                                            labels.assignClassTitle
                                                        }
                                                    </h3>

                                                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                                        {
                                                            labels.assignClassDescription
                                                        }
                                                    </p>

                                                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                                                        <select
                                                            value={
                                                                selectedHeadClass
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                setSelectedHeadClass(
                                                                    event
                                                                        .target
                                                                        .value,
                                                                )
                                                            }
                                                            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                        >
                                                            <option value="">
                                                                {
                                                                    labels.selectClass
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
                                                                        }
                                                                        {" — "}
                                                                        {
                                                                            labels.grade
                                                                        }{" "}
                                                                        {
                                                                            schoolClass.gradeLevel
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                assignClassHead(
                                                                    member.id,
                                                                )
                                                            }
                                                            disabled={
                                                                !selectedHeadClass
                                                            }
                                                            className="min-h-11 w-full rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                                        >
                                                            {
                                                                labels.assign
                                                            }
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                        {/* TEACHING ASSIGNMENTS */}

                                        {isSelected &&
                                            teachableRoles.includes(
                                                member.role,
                                            ) &&
                                            member.role !==
                                                "head_of_class" && (
                                                <div className="border-t border-blue-100 bg-blue-50/50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                                                    <div className="mb-5">
                                                        <h3 className="font-bold text-slate-900 dark:text-white">
                                                            {
                                                                labels.teachingAssignments
                                                            }
                                                        </h3>

                                                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                                            {
                                                                labels.teachingAssignmentsDescription
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="mb-5">
                                                        <p className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
                                                            {
                                                                labels.currentAssignments
                                                            }
                                                        </p>

                                                        {memberAssignments.length ===
                                                        0 ? (
                                                            <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                                                {
                                                                    labels.noAssignments
                                                                }
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {memberAssignments.map(
                                                                    (
                                                                        assignment,
                                                                    ) => (
                                                                        <div
                                                                            key={`${assignment.teacherId}-${assignment.subjectId}-${assignment.classId}`}
                                                                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
                                                                        >
                                                                            <span className="break-words font-semibold text-slate-900 dark:text-white">
                                                                                {
                                                                                    assignment.subjectName
                                                                                }
                                                                            </span>

                                                                            <span className="break-words text-sm text-slate-500 dark:text-slate-400">
                                                                                {
                                                                                    assignment.className
                                                                                }
                                                                                {" — "}
                                                                                {
                                                                                    labels.grade
                                                                                }{" "}
                                                                                {
                                                                                    assignment.gradeLevel
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                                                        <p className="mb-3 font-bold text-slate-900 dark:text-white">
                                                            {
                                                                labels.addAssignment
                                                            }
                                                        </p>

                                                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                                            <select
                                                                value={
                                                                    selectedSubject
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setSelectedSubject(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                            >
                                                                <option value="">
                                                                    {
                                                                        labels.selectSubject
                                                                    }
                                                                </option>

                                                                {subjects.map(
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

                                                            <select
                                                                value={
                                                                    selectedClass
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setSelectedClass(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                            >
                                                                <option value="">
                                                                    {
                                                                        labels.selectClass
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
                                                                            }
                                                                            {" — "}
                                                                            {
                                                                                labels.grade
                                                                            }{" "}
                                                                            {
                                                                                schoolClass.gradeLevel
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    createAssignment(
                                                                        member.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    assignmentLoading !==
                                                                        null ||
                                                                    !selectedSubject ||
                                                                    !selectedClass
                                                                }
                                                                className="min-h-11 w-full rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                                                            >
                                                                {assignmentLoading ===
                                                                member.id
                                                                    ? labels.assigning
                                                                    : labels.assign}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                )
                            },
                        )}
                </div>
            </section>
        </div>
    )
}

