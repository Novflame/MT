import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { getSchoolDB } from "@/db"
import { academicYears, classTimetables, classTimetableSlots, classTimetableAuditLogs, schoolClases, subjects, teacherAssignments } from "@/db/schema"
import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"
import { assertTimetableEnabled, canAccessTimetableClass } from "@/lib/timetable/access"


function normalizeId(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
}

function normalizeInteger(value: unknown): number | null {
    if (typeof value !== "number" && typeof value !== "string") return null
    if (typeof value === "string" && !value.trim()) return null
    const parsed = Number(value)
    return Number.isInteger(parsed) ? parsed : null
}

/** Accept browser time values in HH:mm or HH:mm:ss format and store HH:mm. */
function normalizeSlotTime(value: unknown): string | null {
    if (typeof value !== "string") return null
    const normalized = value.trim()
    const match = /^(?:([01]\d|2[0-3])):([0-5]\d)(?::([0-5]\d))?$/.exec(normalized)
    if (!match || (match[3] !== undefined && match[3] !== "00")) return null
    return `${match[1]}:${match[2]}`
}

function fail(error: unknown) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = error instanceof ApiAuthorizationError ? error.status : message === "TIMETABLE_DISABLED" ? 403 : message === "SCHOOL_NOT_FOUND" ? 404 : 400
    return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request) {
    try {
        const session = await requireApiPermission(request, "timetable.read")
        await assertTimetableEnabled(session.user.id)
        const db = await getSchoolDB()
        const { searchParams } = new URL(request.url)
        const academicYearId = searchParams.get("academicYearId")
        const classId = searchParams.get("classId")
        if (!academicYearId) return NextResponse.json({ error: "academicYearId is required" }, { status: 400 })
        if (classId && !(await canAccessTimetableClass({ id: session.user.id, role: session.user.schoolRole as import("@/auth/permissions").Role }, classId, academicYearId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        const rows = await db.select({ timetable: classTimetables, slot: classTimetableSlots, className: schoolClases.name, subjectName: subjects.name })
            .from(classTimetables).innerJoin(classTimetableSlots, eq(classTimetableSlots.timetableId, classTimetables.id))
            .innerJoin(schoolClases, eq(schoolClases.id, classTimetableSlots.classId)).innerJoin(subjects, eq(subjects.id, classTimetableSlots.subjectId))
            .where(classId ? and(eq(classTimetables.academicYearId, academicYearId), eq(classTimetableSlots.classId, classId), eq(classTimetables.isActive, true), eq(classTimetableSlots.isActive, true)) : and(eq(classTimetables.academicYearId, academicYearId), eq(classTimetables.isActive, true), eq(classTimetableSlots.isActive, true)))
        const role = session.user.schoolRole
        const filtered = role === "principal" || role === "deputy" ? rows : await Promise.all(rows.map(async row => ({ row, allowed: await canAccessTimetableClass({ id: session.user.id, role: role as import("@/auth/permissions").Role }, row.slot.classId, academicYearId, row.slot.subjectId) }))).then(items => items.filter(x => x.allowed).map(x => x.row))
        return NextResponse.json({ slots: filtered })
    } catch (error) { return fail(error) }
}

export async function POST(request: Request) {
    try {
        const session = await requireApiPermission(request, "timetable.manage")
        await assertTimetableEnabled(session.user.id)
        const body = await request.json()
        const name = typeof body?.name === "string" ? body.name : "Main timetable"
        const academicYearId = normalizeId(body?.academicYearId)
        const classId = normalizeId(body?.classId)
        const subjectId = normalizeId(body?.subjectId)
        const teacherId = normalizeId(body?.teacherId)
        const dayOfWeek = normalizeInteger(body?.dayOfWeek)
        const periodNumber = normalizeInteger(body?.periodNumber)
        const startTime = normalizeSlotTime(body?.startTime)
        const endTime = normalizeSlotTime(body?.endTime)
        const invalidFields = [
            !academicYearId && "academicYearId",
            !classId && "classId",
            !subjectId && "subjectId",
            !teacherId && "teacherId",
            (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) && "dayOfWeek",
            (periodNumber === null || periodNumber < 1) && "periodNumber",
            !startTime && "startTime",
            !endTime && "endTime",
            startTime && endTime && startTime >= endTime && "timeRange",
        ].filter(Boolean)
        if (invalidFields.length) return NextResponse.json({ error: "Invalid timetable slot data", invalidFields }, { status: 400 })
        const validSlot = {
            academicYearId: academicYearId as string,
            classId: classId as string,
            subjectId: subjectId as string,
            teacherId: teacherId as string,
            dayOfWeek: dayOfWeek as number,
            periodNumber: periodNumber as number,
            startTime: startTime as string,
            endTime: endTime as string,
        }
        const db = await getSchoolDB()
        const [year] = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, validSlot.academicYearId)).limit(1)
        const [assignment] = await db.select({ teacherId: teacherAssignments.teacherId }).from(teacherAssignments).where(and(eq(teacherAssignments.academicYearId, validSlot.academicYearId), eq(teacherAssignments.classId, validSlot.classId), eq(teacherAssignments.subjectId, validSlot.subjectId), eq(teacherAssignments.teacherId, validSlot.teacherId))).limit(1)
        if (!year || !assignment) return NextResponse.json({ error: "Invalid academic year or teacher assignment" }, { status: 400 })
        const [existing] = await db.select({ id: classTimetables.id }).from(classTimetables).where(and(eq(classTimetables.academicYearId, validSlot.academicYearId), eq(classTimetables.classId, validSlot.classId), eq(classTimetables.isActive, true))).limit(1)
        const now = new Date().toISOString()
        const timetableId = existing?.id ?? randomUUID()
        const slots = await db.select().from(classTimetableSlots).where(eq(classTimetableSlots.academicYearId, validSlot.academicYearId))
        const overlap = slots.find(slot => slot.isActive && slot.academicYearId === validSlot.academicYearId && slot.dayOfWeek === validSlot.dayOfWeek && slot.startTime < validSlot.endTime && validSlot.startTime < slot.endTime && (slot.classId === validSlot.classId || slot.teacherId === validSlot.teacherId))
        if (overlap) return NextResponse.json({ error: overlap.classId === validSlot.classId ? "CLASS_TIME_CONFLICT" : "TEACHER_TIME_CONFLICT" }, { status: 409 })
        if (!existing) await db.insert(classTimetables).values({ id: timetableId, academicYearId: validSlot.academicYearId, classId: validSlot.classId, name: String(name).slice(0, 100), createdBy: session.user.id, createdAt: now, updatedAt: now })
        const inactiveSlot = slots.find(slot => slot.timetableId === timetableId && slot.dayOfWeek === validSlot.dayOfWeek && slot.periodNumber === validSlot.periodNumber && !slot.isActive)
        const slotId = inactiveSlot?.id ?? randomUUID()
        const slot = { id: slotId, timetableId, academicYearId: validSlot.academicYearId, classId: validSlot.classId, subjectId: validSlot.subjectId, teacherId: validSlot.teacherId, dayOfWeek: validSlot.dayOfWeek, periodNumber: validSlot.periodNumber, startTime: validSlot.startTime, endTime: validSlot.endTime, isActive: true, createdAt: inactiveSlot?.createdAt ?? now }
        if (inactiveSlot) await db.update(classTimetableSlots).set({ subjectId: validSlot.subjectId, teacherId: validSlot.teacherId, startTime: validSlot.startTime, endTime: validSlot.endTime, isActive: true }).where(eq(classTimetableSlots.id, slotId))
        else await db.insert(classTimetableSlots).values(slot)
        await db.insert(classTimetableAuditLogs).values({ id: randomUUID(), timetableId, slotId, actorUserId: session.user.id, action: inactiveSlot ? "slot_reactivated" : "slot_created", details: JSON.stringify({ dayOfWeek: validSlot.dayOfWeek, periodNumber: validSlot.periodNumber, startTime: validSlot.startTime, endTime: validSlot.endTime, subjectId: validSlot.subjectId, teacherId: validSlot.teacherId }), createdAt: now })
        return NextResponse.json({ slot }, { status: 201 })
    } catch (error) { return fail(error) }
}


export async function PATCH(request: Request) {
    try {
        const session = await requireApiPermission(request, "timetable.manage")
        await assertTimetableEnabled(session.user.id)
        const body = await request.json()
        const slotId = typeof body.slotId === "string" ? body.slotId : ""
        if (!slotId) return NextResponse.json({ error: "slotId is required" }, { status: 400 })
        const db = await getSchoolDB()
        const [current] = await db.select().from(classTimetableSlots).where(eq(classTimetableSlots.id, slotId)).limit(1)
        if (!current) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
        const next = {
            subjectId: body.subjectId === undefined ? current.subjectId : normalizeId(body.subjectId),
            teacherId: body.teacherId === undefined ? current.teacherId : normalizeId(body.teacherId),
            dayOfWeek: body.dayOfWeek === undefined ? current.dayOfWeek : normalizeInteger(body.dayOfWeek),
            periodNumber: body.periodNumber === undefined ? current.periodNumber : normalizeInteger(body.periodNumber),
            startTime: body.startTime === undefined ? current.startTime : normalizeSlotTime(body.startTime),
            endTime: body.endTime === undefined ? current.endTime : normalizeSlotTime(body.endTime),
        }
        const invalidFields = [
            !next.subjectId && "subjectId",
            !next.teacherId && "teacherId",
            (next.dayOfWeek === null || next.dayOfWeek < 0 || next.dayOfWeek > 6) && "dayOfWeek",
            (next.periodNumber === null || next.periodNumber < 1) && "periodNumber",
            !next.startTime && "startTime",
            !next.endTime && "endTime",
            next.startTime && next.endTime && next.startTime >= next.endTime && "timeRange",
        ].filter(Boolean)
        if (invalidFields.length) return NextResponse.json({ error: "Invalid timetable slot data", invalidFields }, { status: 400 })
        const validNext = next as {
            subjectId: string
            teacherId: string
            dayOfWeek: number
            periodNumber: number
            startTime: string
            endTime: string
        }
        const [assignment] = await db.select({ teacherId: teacherAssignments.teacherId }).from(teacherAssignments).where(and(eq(teacherAssignments.academicYearId, current.academicYearId), eq(teacherAssignments.classId, current.classId), eq(teacherAssignments.subjectId, validNext.subjectId), eq(teacherAssignments.teacherId, validNext.teacherId))).limit(1)
        if (!assignment) return NextResponse.json({ error: "Invalid teacher assignment" }, { status: 400 })
        const allSlots = await db.select().from(classTimetableSlots).where(eq(classTimetableSlots.academicYearId, current.academicYearId))
        const conflict = allSlots.find(item => item.isActive && item.id !== slotId && item.dayOfWeek === validNext.dayOfWeek && item.startTime < validNext.endTime && validNext.startTime < item.endTime && (item.classId === current.classId || item.teacherId === validNext.teacherId))
        if (conflict) return NextResponse.json({ error: conflict.classId === current.classId ? "CLASS_TIME_CONFLICT" : "TEACHER_TIME_CONFLICT" }, { status: 409 })
        await db.update(classTimetableSlots).set(validNext).where(eq(classTimetableSlots.id, slotId))
        const now = new Date().toISOString()
        await db.insert(classTimetableAuditLogs).values({ id: randomUUID(), timetableId: current.timetableId, slotId, actorUserId: session.user.id, action: "slot_updated", details: JSON.stringify({ before: current, after: next }), createdAt: now })
        return NextResponse.json({ success: true })
    } catch (error) { return fail(error) }
}

export async function DELETE(request: Request) {
    try {
        const session = await requireApiPermission(request, "timetable.manage")
        await assertTimetableEnabled(session.user.id)
        const slotId = new URL(request.url).searchParams.get("slotId")
        if (!slotId) return NextResponse.json({ error: "slotId is required" }, { status: 400 })
        const db = await getSchoolDB()
        const [slot] = await db.select().from(classTimetableSlots).where(eq(classTimetableSlots.id, slotId)).limit(1)
        if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
        const now = new Date().toISOString()
        const { classSessions } = await import("@/db/schema")
        const [used] = await db.select({ id: classSessions.id }).from(classSessions).where(eq(classSessions.timetableSlotId, slotId)).limit(1)
        await db.insert(classTimetableAuditLogs).values({ id: randomUUID(), timetableId: slot.timetableId, slotId, actorUserId: session.user.id, action: "slot_deactivated", details: JSON.stringify(slot), createdAt: now })
        if (used) await db.update(classTimetableSlots).set({ isActive: false }).where(eq(classTimetableSlots.id, slotId))
        else await db.delete(classTimetableSlots).where(eq(classTimetableSlots.id, slotId))
        return NextResponse.json({ success: true, preservedForHistory: Boolean(used) })
    } catch (error) { return fail(error) }
}
