import { getSchoolDB } from "@/db"
import { academicYears, schoolClases, subjects } from "@/db/schema"
import { requirePermission } from "@/auth/session"
import CoreSubjectsForm from "@/components/core-subjects/CoreSubjectsForm"

export default async function CoreSubjectsPage() {


await requirePermission("subjects.read")

const db = await getSchoolDB()

const [
    years,
    classes,
    loadedSubjects,
] = await Promise.all([
    db.select().from(academicYears),

    db.select().from(schoolClases),

    db.select().from(subjects),
])

const activeYear =
    years.find((year) => year.isActive) ?? null
console.log("years:", years)
console.log("classes:", classes)
console.log("subjects:", loadedSubjects)
return (
    <CoreSubjectsForm
        academicYears={years}
        classes={classes}
        subjects={loadedSubjects}
        activeYearId={activeYear?.id ?? null}
    />
)


}
