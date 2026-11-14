import { and, eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getActiveAcademicYear } from "@/db/academic-year"
import { getSchoolDB } from "@/db"
import { teacherAssignments } from "@/db/schema"

export default async function TeacherProfilePage() {
    const session = await requireSession()

    if (session.user.schoolRole !== "teacher") {
        redirect("/")
    }

    const academicYear = await getActiveAcademicYear()
    const db = await getSchoolDB()
    const assignments = await db.query.teacherAssignments.findMany({
        where: and(
            eq(teacherAssignments.teacherId, session.user.id),
            eq(teacherAssignments.academicYearId, academicYear.id),
        ),
        with: {
            subject: true,
            class: true,
        },
    })

    const teacherName = session.user.name ?? "Teacher"
    const roleLabel = session.user.schoolRole
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    const initials =
        teacherName
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "T"

    const subjects = Array.from(
        new Map(
            assignments.map((assignment) => [
                assignment.subjectId,
                assignment.subject.name,
            ]),
        ),
        ([id, name]) => ({ id, name }),
    )
    const classes = Array.from(
        new Map(
            assignments.map((assignment) => [
                assignment.classId,
                {
                    id: assignment.classId,
                    name: assignment.class.name,
                    gradeLevel: assignment.class.gradeLevel,
                },
            ]),
        ).values(),
    )

    return (
        <main className="min-h-dvh bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
                <header className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                        Account
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
                        Profile
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                        View your account and teaching information.
                    </p>
                </header>

                <section
                    aria-label="Teacher identity"
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
                >
                    <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                        <div
                            aria-hidden="true"
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-xl font-bold text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200"
                        >
                            {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h2 className="break-words text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">
                                {teacherName}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                                {roleLabel}
                            </p>
                            <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
                                {session.user.email ?? "No email provided"}
                            </p>

                            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800 sm:grid-cols-2">
                                <IdentityDetail label="Academic year" value={academicYear.name} />
                                <IdentityDetail
                                    label="Teaching assignments"
                                    value={String(assignments.length)}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section aria-labelledby="account-information-heading" className="space-y-3">
                    <SectionHeading
                        id="account-information-heading"
                        title="Personal / Account Information"
                        description="Your account details associated with this school."
                    />
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <InfoCard label="Name" value={teacherName} />
                        <InfoCard
                            label="Email"
                            value={session.user.email ?? "No email provided"}
                        />
                    </div>
                </section>

                <section aria-labelledby="professional-information-heading" className="space-y-3">
                    <SectionHeading
                        id="professional-information-heading"
                        title="Professional Information"
                        description="Your role and active teaching assignments for this academic year."
                    />

                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <InfoCard label="Role" value={roleLabel} />
                        <InfoCard label="Academic year" value={academicYear.name} />
                        <InfoCard label="Teaching assignments" value={String(assignments.length)} />
                    </div>

                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                        <ChipGroup
                            title="Subjects"
                            emptyMessage="No subjects assigned"
                            items={subjects.map((subject) => ({
                                id: subject.id,
                                label: subject.name,
                            }))}
                        />
                        <ChipGroup
                            title="Classes"
                            emptyMessage="No classes assigned"
                            items={classes.map((classItem) => ({
                                id: classItem.id,
                                label: `${classItem.name} · Grade ${classItem.gradeLevel}`,
                            }))}
                        />
                    </div>

                    <section
                        aria-labelledby="teaching-assignments-heading"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
                    >
                        <div>
                            <h3
                                id="teaching-assignments-heading"
                                className="text-base font-semibold text-slate-900 dark:text-slate-100"
                            >
                                Teaching Assignments
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Subject and class combinations assigned to you.
                            </p>
                        </div>

                        {assignments.length === 0 ? (
                            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                No teaching assignments for the active academic year.
                            </p>
                        ) : (
                            <ul className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                                {assignments.map((assignment) => (
                                    <li
                                        key={`${assignment.academicYearId}-${assignment.subjectId}-${assignment.classId}`}
                                        className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50"
                                    >
                                        <p className="break-words font-semibold text-slate-900 dark:text-slate-100">
                                            {assignment.subject.name}
                                        </p>
                                        <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
                                            {assignment.class.name} · Grade {assignment.class.gradeLevel}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </section>
            </div>
        </main>
    )
}

function SectionHeading({
    id,
    title,
    description,
}: {
    id: string
    title: string
    description: string
}) {
    return (
        <div>
            <h2 id={id} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </div>
    )
}

function IdentityDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p className="mt-1 break-words font-semibold text-slate-800 dark:text-slate-200">
                {value}
            </p>
        </div>
    )
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p className="mt-2 break-words text-base font-semibold text-slate-900 dark:text-slate-100">
                {value}
            </p>
        </div>
    )
}

function ChipGroup({
    title,
    emptyMessage,
    items,
}: {
    title: string
    emptyMessage: string
    items: { id: string; label: string }[]
}) {
    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {title}
            </h3>
            {items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {emptyMessage}
                </p>
            ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="max-w-full break-words rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                            {item.label}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
