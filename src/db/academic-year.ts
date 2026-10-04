import { eq } from "drizzle-orm"
import { getSchoolDB } from "@/db"
import { academicYears } from "@/db/schema"

export async function getActiveAcademicYear() {
    const db = await getSchoolDB()

    const [academicYear] = await db
        .select()
        .from(academicYears)
        .where(eq(academicYears.isActive, true))
        .limit(1)

    if (!academicYear) {
        throw new Error(
            "No active academic year found",
        )
    }

    return academicYear
}