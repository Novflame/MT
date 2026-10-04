import { headers } from "next/headers"

import { requirePermission } from "@/auth/session"
import TeacherAssignmentsManager from "@/components/teacher-assignments/TeacherAssignmentsManager"
import { auth } from "@/auth/auth"

import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"


import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"

import {
    teacherAssignments,
    subjects as subjectsTable,
    schoolClases,
} from "@/db/schema"

import { eq } from "drizzle-orm"

export default async function TeacherAssignmentsPage() {

    // =========================
    // Permission
    // =========================

    await requirePermission("assignments.read")


    // =========================
    // Session
    // =========================

  

    const session = await auth.api.getSession({
    headers: await headers(),
})
 if (!session) {
        return null
    }




   

    const schoolId = session.user.schoolId


    // =========================
    // School database
    // =========================

    const db = await getSchoolDB()


    // =========================
    // Active academic year
    // =========================

    const academicYear =
        await getActiveAcademicYear()


    // =========================
    // Teachers
    // =========================

    const teachers =
        await centralDb
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
            })
            .from(user)
            .where(
                eq(user.schoolId, schoolId),
            )


    // =========================
    // Subjects
    // =========================

    const subjects =
        await db.query.subjects.findMany({
            orderBy: (subjects, { asc }) =>
                asc(subjects.name),
        })


    // =========================
    // Classes
    // =========================

    const classes =
        await db.query.schoolClases.findMany({
            orderBy: (schoolClases, { asc }) =>
                asc(schoolClases.gradeLevel),
        })


    // =========================
    // Assignments
    // =========================

    const assignments =
        await db
            .select({
                teacherId:
                    teacherAssignments.teacherId,

                subjectId:
                    teacherAssignments.subjectId,

                subjectName:
                    subjectsTable.name,

                classId:
                    teacherAssignments.classId,

                className:
                    schoolClases.name,

                gradeLevel:
                    schoolClases.gradeLevel,
            })
            .from(teacherAssignments)
            .innerJoin(
                subjectsTable,
                eq(
                    teacherAssignments.subjectId,
                    subjectsTable.id,
                ),
            )
            .innerJoin(
                schoolClases,
                eq(
                    teacherAssignments.classId,
                    schoolClases.id,
                ),
            )
            .where(
                eq(
                    teacherAssignments.academicYearId,
                    academicYear.id,
                ),
            )


    // =========================
    // Combine teacher information
    // =========================

    const initialAssignments =
        assignments.map(
            (assignment) => {

                const teacher =
                    teachers.find(
                        (teacher) =>
                            teacher.id ===
                            assignment.teacherId,
                    )

                return {
                    ...assignment,

                    teacher: teacher
                        ? {
                            id: teacher.id,
                            name: teacher.name,
                            email: teacher.email,
                        }
                        : null,
                }
            },
        )


    // =========================
    // Render
    // =========================

    // return (
    //     <main className="min-h-screen bg-gray-100 p-8">

    //         <div className="mx-auto max-w-6xl">

    //             <h1 className="text-3xl font-bold">
    //                 Teacher Assignments
    //             </h1>

    //             <p className="mt-2 text-gray-600">
    //                 Assign teachers to subjects
    //                 and classes.
    //             </p>

    //             <div className="mt-8">

    //                 <TeacherAssignmentsManager
    //                     teachers={teachers}
    //                     subjects={subjects}
    //                     classes={classes}
    //                     initialAssignments={
    //                         initialAssignments
    //                     }
    //                 />

    //             </div>

    //         </div>

    //     </main>
    // )


    
return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-7xl">

            {/* Page Header */}

            <div className="mb-6">

                <div className="flex items-center gap-3">

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">

                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-6 w-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                            />

                            <circle
                                cx="9"
                                cy="7"
                                r="4"
                            />

                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                            />
                        </svg>

                    </div>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Teacher Assignments
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Assign teachers to subjects and classes.
                        </p>
                    </div>

                </div>

            </div>


            <TeacherAssignmentsManager
                teachers={teachers}
                subjects={subjects}
                classes={classes}
                initialAssignments={initialAssignments}
            />

        </div>

    </main>
)


}

