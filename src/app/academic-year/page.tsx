import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"

import AcademicYearsManager from "@/components/academic-years/AcademicYearsManager"

export default async function AcademicYearsPage() {

    await requirePermission(
        "academicYears.read",
    )

    const db = await getSchoolDB()

    const academicYears =
        await db.query.academicYears.findMany({
            orderBy: (academicYears, { asc }) =>
                asc(academicYears.startDate),
        })

    return (
        <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">

            <div className="mx-auto max-w-5xl">

                <h1 className="text-3xl font-bold">
                    Academic Years
                </h1>

                <p className="mt-2 text-gray-600">
                    Register and manage your
                    schools academic years
                </p>

                <div className="mt-8">

                    <AcademicYearsManager
                        initialAcademicYears={
                            academicYears
                        }
                    />

                </div>

            </div>

        </main>
    )
}