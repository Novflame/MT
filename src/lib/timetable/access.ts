import { and, eq } from "drizzle-orm"
import { centralDb } from "@/db/central"
import { schoolFeatureFlags, user as centralUser } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"
import { teacherAssignments, classHeads } from "@/db/schema"
import type { Role } from "@/auth/permissions"

export async function assertTimetableEnabled(userId: string) {
    try {
        const [account] = await centralDb.select({ schoolId: centralUser.schoolId, enabled: schoolFeatureFlags.timetableEnabled })
            .from(centralUser)
            .leftJoin(schoolFeatureFlags, eq(centralUser.schoolId, schoolFeatureFlags.schoolId))
            .where(eq(centralUser.id, userId)).limit(1)
        if (!account) throw new Error("SCHOOL_NOT_FOUND")
        if (!account.enabled) throw new Error("TIMETABLE_DISABLED")
    } catch (error) {
        if (error instanceof Error && (error.message === "SCHOOL_NOT_FOUND" || error.message === "TIMETABLE_DISABLED")) throw error
        throw new Error("TIMETABLE_DISABLED")
    }
}

export async function canAccessTimetableClass(
    user: { id: string; role: Role },
    classId: string,
    academicYearId: string,
    subjectId?: string,
) {
    if (user.role === "principal" || user.role === "deputy") return true
    const db = await getSchoolDB()
    if (user.role === "teacher") {
        const conditions = [
            eq(teacherAssignments.teacherId, user.id),
            eq(teacherAssignments.classId, classId),
            eq(teacherAssignments.academicYearId, academicYearId),
        ]
        if (subjectId) conditions.push(eq(teacherAssignments.subjectId, subjectId))
        const [assignment] = await db.select({ teacherId: teacherAssignments.teacherId })
            .from(teacherAssignments).where(and(...conditions)).limit(1)
        return Boolean(assignment)
    }
    if (user.role === "head_of_class") {
        const [assignment] = await db.select({ userId: classHeads.userId }).from(classHeads)
            .where(and(eq(classHeads.userId, user.id), eq(classHeads.classId, classId), eq(classHeads.academicYearId, academicYearId))).limit(1)
        return Boolean(assignment)
    }
    return false
}

export function isValidTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) }
export function dateWeekday(date: string) { return new Date(`${date}T12:00:00Z`).getUTCDay() }

const timetableTimeZone = process.env.TIMETABLE_TIME_ZONE || "Africa/Khartoum"

export function getTimetableLocalParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timetableTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}`,
    }
}

/** Converts a school-local date/time to an absolute instant for lateness/deadline checks. */
export function schoolLocalDateTimeToDate(date: string, time: string) {
    const [year, month, day] = date.split("-").map(Number)
    const [hour, minute] = time.split(":").map(Number)
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute)
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timetableTimeZone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(targetAsUtc))
    const values = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]))
    const displayedAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute)
    return new Date(targetAsUtc + targetAsUtc - displayedAsUtc)
}
