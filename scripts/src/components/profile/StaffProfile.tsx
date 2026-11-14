
"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Pencil } from "lucide-react"

import { useLanguage } from "@/components/providers/LanguageProvider"

type StaffUser = {
    id: string
    name?: string | null
    email?: string | null
    role?: string | null
    emailVerified?: boolean | null
    createdAt?: Date | string | null
}

type StaffProfileData = {
    phone?: string | null
    profileImage?: string | null
    dateOfBirth?: string | null
    gender?: string | null
    nationality?: string | null
    nationalId?: string | null
    address?: string | null
    city?: string | null

    employeeId?: string | null
    position?: string | null
    department?: {
        id: string
        name: string
    } | null
    qualification?: string | null
    employmentDate?: string | null
    specialization?: string | null

    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
}

type RoleAssignment =
    | {
          type: "head_of_class"
          academicYear?: string | null
          className?: string | null
          gradeLevel?: string | number | null
          studentCount?: number | null
          status?: string | null
      }
    | {
          type: "teacher"
          academicYear?: string | null
          subjects?: string[]
          classes?: string[]
          assignmentCount?: number
      }
    | {
          type: "head_of_department"
          academicYear?: string | null
          departmentName?: string | null
          status?: string | null
      }
    | null

type Props = {
    user: StaffUser
    profile: StaffProfileData | null
    roleAssignment?: RoleAssignment
}

function displayValue(
    value: string | number | null | undefined,
    notProvided: string,
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return notProvided
    }

    return String(value)
}


function formatRole(
    role: string | null | undefined,
    labels: {
        staff: string
        roles: Record<string, string>
    },
) {
    if (!role) {
        return labels.staff
    }

    if (labels.roles[role]) {
        return labels.roles[role]
    }

    return role
        .split("_")
        .map(
            (part) =>
                part.charAt(0).toUpperCase() +
                part.slice(1),
        )
        .join(" ")
}


function formatDate(
    value: string | Date | null | undefined,
    locale: "en" | "ar" | "fr",
    notProvided: string,
) {
    if (!value) {
        return notProvided
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return String(value)
    }

    return new Intl.DateTimeFormat(
        locale === "ar"
            ? "ar"
            : locale === "fr"
              ? "fr-FR"
              : "en",
        {
            dateStyle: "medium",
        },
    ).format(date)
}

function getInitials(name?: string | null) {
    if (!name) {
        return "U"
    }

    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (parts.length === 1) {
        return parts[0]
            .slice(0, 2)
            .toUpperCase()
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

type Labels = ReturnType<typeof getLabels>

function getLabels(
    locale: "en" | "ar" | "fr",
) {
    if (locale === "ar") {
        return {
            staff: "موظف",
            manageProfile: "إدارة الملف الشخصي",

            personalInformation: "المعلومات الشخصية",
            professionalInformation: "المعلومات المهنية",
            emergencyContact: "جهة اتصال للطوارئ",
            accountInformation: "معلومات الحساب",

            fullName: "الاسم الكامل",
            email: "البريد الإلكتروني",
            phone: "الهاتف",
            dateOfBirth: "تاريخ الميلاد",
            gender: "الجنس",
            nationality: "الجنسية",
            nationalId: "الرقم الوطني",
            city: "المدينة",
            address: "العنوان",

            employeeId: "الرقم الوظيفي",
            position: "المنصب",
            department: "القسم",
            qualification: "المؤهل",
            specialization: "التخصص",
            employmentDate: "تاريخ التوظيف",

            contactName: "اسم جهة الاتصال",
            contactPhone: "هاتف جهة الاتصال",

            role: "الدور",
            emailVerification: "التحقق من البريد الإلكتروني",
            verified: "تم التحقق",
            notVerified: "لم يتم التحقق",
            accountCreated: "تاريخ إنشاء الحساب",
            accountId: "معرّف الحساب",

            classAssignment: "تكليف الفصل",
            teachingAssignment: "التكليف التدريسي",
            departmentAssignment: "تكليف القسم",

            academicYear: "السنة الدراسية",
            class: "الفصل",
            gradeLevel: "المرحلة الدراسية",
            students: "الطلاب",
            status: "الحالة",
            assignments: "التكليفات",
            subjects: "المواد",
            classes: "الفصول",

            noSubjects: "لا توجد مواد مسجلة",
            noClasses: "لا توجد فصول مسجلة",
            notProvided: "غير متوفر",

            roles: {
                principal: "المدير",
                deputy: "نائب المدير",
                head_of_department: "رئيس القسم",
                head_of_class: "رئيس الفصل",
                teacher: "معلم",
                parent: "ولي أمر",
                student: "طالب",
            },

            statusValues: {
                active: "نشط",
                inactive: "غير نشط",
                pending: "قيد الانتظار",
            },
        }
    }

    if (locale === "fr") {
        return {
            staff: "Personnel",
            manageProfile: "Gérer le profil",

            personalInformation: "Informations personnelles",
            professionalInformation: "Informations professionnelles",
            emergencyContact: "Contact d'urgence",
            accountInformation: "Informations du compte",

            fullName: "Nom complet",
            email: "E-mail",
            phone: "Téléphone",
            dateOfBirth: "Date de naissance",
            gender: "Genre",
            nationality: "Nationalité",
            nationalId: "Identifiant national",
            city: "Ville",
            address: "Adresse",

            employeeId: "Identifiant employé",
            position: "Poste",
            department: "Département",
            qualification: "Qualification",
            specialization: "Spécialisation",
            employmentDate: "Date d'embauche",

            contactName: "Nom du contact",
            contactPhone: "Téléphone du contact",

            role: "Rôle",
            emailVerification: "Vérification de l'e-mail",
            verified: "Vérifié",
            notVerified: "Non vérifié",
            accountCreated: "Compte créé le",
            accountId: "Identifiant du compte",

            classAssignment: "Affectation de classe",
            teachingAssignment: "Affectation d'enseignement",
            departmentAssignment: "Affectation au département",

            academicYear: "Année scolaire",
            class: "Classe",
            gradeLevel: "Niveau",
            students: "Élèves",
            status: "Statut",
            assignments: "Affectations",
            subjects: "Matières",
            classes: "Classes",

            noSubjects: "Aucune matière enregistrée",
            noClasses: "Aucune classe enregistrée",
            notProvided: "Non renseigné",

            roles: {
                principal: "Directeur",
                deputy: "Directeur adjoint",
                head_of_department: "Chef de département",
                head_of_class: "Responsable de classe",
                teacher: "Enseignant",
                parent: "Parent",
                student: "Élève",
            },

            statusValues: {
                active: "Actif",
                inactive: "Inactif",
                pending: "En attente",
            },
        }
    }

    return {
        staff: "Staff",
        manageProfile: "Manage Profile",

        personalInformation: "Personal Information",
        professionalInformation: "Professional Information",
        emergencyContact: "Emergency Contact",
        accountInformation: "Account Information",

        fullName: "Full Name",
        email: "Email",
        phone: "Phone",
        dateOfBirth: "Date of Birth",
        gender: "Gender",
        nationality: "Nationality",
        nationalId: "National ID",
        city: "City",
        address: "Address",

        employeeId: "Employee ID",
        position: "Position",
        department: "Department",
        qualification: "Qualification",
        specialization: "Specialization",
        employmentDate: "Employment Date",

        contactName: "Contact Name",
        contactPhone: "Contact Phone",

        role: "Role",
        emailVerification: "Email Verification",
        verified: "Verified",
        notVerified: "Not verified",
        accountCreated: "Account Created",
        accountId: "Account ID",

        classAssignment: "Class Assignment",
        teachingAssignment: "Teaching Assignment",
        departmentAssignment: "Department Assignment",

        academicYear: "Academic Year",
        class: "Class",
        gradeLevel: "Grade Level",
        students: "Students",
        status: "Status",
        assignments: "Assignments",
        subjects: "Subjects",
        classes: "Classes",

        noSubjects: "No subjects provided",
        noClasses: "No classes provided",
        notProvided: "Not provided",

        roles: {
            principal: "Principal",
            deputy: "Deputy",
            head_of_department: "Head of Department",
            head_of_class: "Head of Class",
            teacher: "Teacher",
            parent: "Parent",
            student: "Student",
        },

        statusValues: {
            active: "Active",
            inactive: "Inactive",
            pending: "Pending",
        },
    }
}

function translateStatus(
    value: string | null | undefined,
    labels: Labels,
) {
    if (!value) {
        return labels.notProvided
    }

    const normalized = value.toLowerCase()

    return (
        labels.statusValues[
            normalized as keyof typeof labels.statusValues
        ] ?? value
    )
}

function Section({
    title,
    children,
}: {
    title: string
    children: ReactNode
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                    {title}
                </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                {children}
            </div>
        </section>
    )
}

function Field({
    label,
    value,
    href,
    notProvided,
}: {
    label: string
    value?: string | number | null
    href?: string
    notProvided: string
}) {
    const empty =
        value === null ||
        value === undefined ||
        value === ""

    return (
        <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
            </p>

            {href && !empty ? (
                <a
                    href={href}
                    className="mt-1.5 block break-words text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                    {displayValue(value, notProvided)}
                </a>
            ) : (
                <p
                    className={[
                        "mt-1.5 break-words text-sm font-medium",
                        empty
                            ? "text-slate-400 dark:text-slate-500"
                            : "text-slate-900 dark:text-slate-100",
                    ].join(" ")}
                >
                    {displayValue(value, notProvided)}
                </p>
            )}
        </div>
    )
}

function AssignmentSection({
    assignment,
    labels,
}: {
    assignment: RoleAssignment
    labels: Labels
}) {
    if (!assignment) {
        return null
    }

    if (assignment.type === "head_of_class") {
        return (
            <Section title={labels.classAssignment}>
                <Field
                    label={labels.academicYear}
                    value={assignment.academicYear}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.class}
                    value={assignment.className}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.gradeLevel}
                    value={assignment.gradeLevel}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.students}
                    value={assignment.studentCount}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.status}
                    value={translateStatus(
                        assignment.status,
                        labels,
                    )}
                    notProvided={labels.notProvided}
                />
            </Section>
        )
    }

    if (assignment.type === "teacher") {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                        {labels.teachingAssignment}
                    </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                    <Field
                        label={labels.academicYear}
                        value={assignment.academicYear}
                        notProvided={labels.notProvided}
                    />

                    <Field
                        label={labels.assignments}
                        value={assignment.assignmentCount}
                        notProvided={labels.notProvided}
                    />

                    <div className="min-w-0 sm:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {labels.subjects}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                            {assignment.subjects?.length ? (
                                assignment.subjects.map(
                                    (subject) => (
                                        <span
                                            key={subject}
                                            className="max-w-full break-words rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
                                        >
                                            {subject}
                                        </span>
                                    ),
                                )
                            ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-500">
                                    {labels.noSubjects}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="min-w-0 sm:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {labels.classes}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                            {assignment.classes?.length ? (
                                assignment.classes.map(
                                    (className) => (
                                        <span
                                            key={className}
                                            className="max-w-full break-words rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
                                        >
                                            {className}
                                        </span>
                                    ),
                                )
                            ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-500">
                                    {labels.noClasses}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <Section title={labels.departmentAssignment}>
            <Field
                label={labels.academicYear}
                value={assignment.academicYear}
                notProvided={labels.notProvided}
            />

            <Field
                label={labels.department}
                value={assignment.departmentName}
                notProvided={labels.notProvided}
            />

            <Field
                label={labels.status}
                value={translateStatus(
                    assignment.status,
                    labels,
                )}
                notProvided={labels.notProvided}
            />
        </Section>
    )
}

export default function StaffProfile({
    user,
    profile,
    roleAssignment = null,
}: Props) {
    const { locale, direction } = useLanguage()

    const labels = getLabels(locale)

    const name = displayValue(
        user.name,
        labels.notProvided,
    )

    const role = formatRole(
        user.role,
        labels,
    )

    return (
        <div
            className="space-y-4 sm:space-y-6"
            dir={direction}
        >
            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white sm:p-6 lg:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="shrink-0">
                            {profile?.profileImage ? (
                                <Image
                                    src={profile.profileImage}
                                    alt={name}
                                    width={80}
                                    height={80}
                                    className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/30 sm:h-24 sm:w-24"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-2 ring-white/20 sm:h-24 sm:w-24 sm:text-2xl">
                                    {getInitials(
                                        user.name,
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
                                {name}
                            </h1>

                            <p className="mt-1 text-sm font-semibold text-blue-100">
                                {role}
                            </p>

                            <p className="mt-1 break-all text-sm text-blue-100">
                                {displayValue(
                                    user.email,
                                    labels.notProvided,
                                )}
                            </p>
                        </div>

                        <Link
                            href="/dashboard/profile/manage"
                            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.99] sm:w-auto"
                        >
                            <Pencil className="size-4" />
                            {labels.manageProfile}
                        </Link>
                    </div>
                </div>
            </section>

            <Section
                title={labels.personalInformation}
            >
                <Field
                    label={labels.fullName}
                    value={user.name}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.email}
                    value={user.email}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.phone}
                    value={profile?.phone}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.dateOfBirth}
                    value={formatDate(
                        profile?.dateOfBirth,
                        locale,
                        labels.notProvided,
                    )}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.gender}
                    value={profile?.gender}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.nationality}
                    value={profile?.nationality}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.nationalId}
                    value={profile?.nationalId}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.city}
                    value={profile?.city}
                    notProvided={labels.notProvided}
                />

                <div className="min-w-0 sm:col-span-2">
                    <Field
                        label={labels.address}
                        value={profile?.address}
                        notProvided={labels.notProvided}
                    />
                </div>
            </Section>

            <Section
                title={labels.professionalInformation}
            >
                <Field
                    label={labels.employeeId}
                    value={profile?.employeeId}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.position}
                    value={
                        profile?.position ??
                        role
                    }
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.department}
                    value={
                        profile?.department?.name
                    }
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.qualification}
                    value={
                        profile?.qualification
                    }
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.specialization}
                    value={
                        profile?.specialization
                    }
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.employmentDate}
                    value={formatDate(
                        profile?.employmentDate,
                        locale,
                        labels.notProvided,
                    )}
                    notProvided={labels.notProvided}
                />
            </Section>

            <Section
                title={labels.emergencyContact}
            >
                <Field
                    label={labels.contactName}
                    value={
                        profile?.emergencyContactName
                    }
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.contactPhone}
                    value={
                        profile?.emergencyContactPhone
                    }
                    notProvided={labels.notProvided}
                />
            </Section>

            <Section
                title={labels.accountInformation}
            >
                <Field
                    label={labels.role}
                    value={role}
                    notProvided={labels.notProvided}
                />

                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {labels.emailVerification}
                    </p>

                    <div className="mt-1.5">
                        {user.emailVerified === true ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                {labels.verified}
                            </span>
                        ) : user.emailVerified === false ? (
                            <span className="inline-flex rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                                {labels.notVerified}
                            </span>
                        ) : (
                            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                                {labels.notProvided}
                            </span>
                        )}
                    </div>
                </div>

                <Field
                    label={labels.accountCreated}
                    value={formatDate(
                        user.createdAt,
                        locale,
                        labels.notProvided,
                    )}
                    notProvided={labels.notProvided}
                />

                <Field
                    label={labels.accountId}
                    value={user.id}
                    notProvided={labels.notProvided}
                />
            </Section>

            <AssignmentSection
                assignment={roleAssignment}
                labels={labels}
            />
        </div>
    )
}

