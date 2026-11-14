import { eq } from "drizzle-orm"
import { departments, academicYears } from "./schema"
import type { SchoolDB } from "./index"

export const defaultDepartments = [
    "Languages",
    "Mathematics",
    "Science",
    "History & Geography",
    "Social Studies",
    "Religious Studies",
    "Computer Science",
    "Physical Education",
    "Arts",
    "Other",
]

export async function seedDepartments(
    db: SchoolDB,
) {
    for (const name of defaultDepartments) {
        const existing =
            await db
                .select()
                .from(departments)
                .where(
                    eq(departments.name, name),
                )
                .limit(1)

        if (existing.length > 0) {
            continue
        }

        await db
            .insert(departments)
            .values({
                id: crypto.randomUUID(),
                name,
            })
    }
}


export async function seedActiveAcademicYear(db: SchoolDB) {
  const existing = await db.select().from(academicYears).limit(1)
  if (existing.length) return
  const year = new Date().getFullYear()
  await db.insert(academicYears).values({
    id: crypto.randomUUID(),
    name: `${year}/${year + 1}`,
    startDate: `${year}-01-01`,
    endDate: `${year + 1}-12-31`,
    isActive: true,
  })
}
