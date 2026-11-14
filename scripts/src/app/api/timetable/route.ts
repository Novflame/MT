import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { getSchoolDB } from "@/db"
import { academicYears, classTimetables, classTimetableSlots, classTimetableAuditLogs, schoolClases, subjects, teacherAssignments } from "@/db/schema"
import { requireApiPermission, ApiAuthorizationError } from "@/auth/api-authorization"
import { assertTimetableEnabled, canAccessTimetableClass, isValidTime } from "@/lib/timetable/access"

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
        const { academicYearId, classId, subjectId, teacherId, dayOfWeek, periodNumber, startTime, endTime, name = "Main timetable" } = body
        if (![academicYearId, classId, subjectId, teacherId].every(v => typeof v === "string" && v.trim()) || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(periodNumber) || periodNumber < 1 || !isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) return NextResponse.json({ error: "Invalid timetable slot data" }, { status: 400 })
        const db = await getSchoolDB()
        const [year] = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1)
        const [assignment] = await db.select({ teacherId: teacherAssignments.teacherId }).from(teacherAssignments).where(and(eq(teacherAssignments.academicYearId, academicYearId), eq(teacherAssignments.classId, classId), eq(teacherAssignments.subjectId, subjectId), eq(teacherAssignments.teacherId, teacherId))).limit(1)
        if (!year || !assignment) return NextResponse.json({ error: "Invalid academic year or teacher assignment" }, { status: 400 })
        const [existing] = await db.select({ id: classTimetables.id }).from(classTimetables).where(and(eq(classTimetables.academicYearId, academicYearId), eq(classTimetables.classId, classId), eq(classTimetables.isActive, true))).limit(1)
        const now = new Date().toISOString()
        const timetableId = existing?.id ?? randomUUID()
        const slots = await db.select().from(classTimetableSlots).where(eq(classTimetableSlots.academicYearId, academicYearId))
        const overlap = slots.find(slot => slot.isActive && slot.academicYearId === academicYearId && slot.dayOfWeek === dayOfWeek && slot.startTime < endTime && startTime < slot.endTime && (slot.classId === classId || slot.teacherId === teacherId))
        if (overlap) return NextResponse.json({ error: overlap.classId === classId ? "CLASS_TIME_CONFLICT" : "TEACHER_TIME_CONFLICT" }, { status: 409 })
        if (!existing) await db.insert(classTimetables).values({ id: timetableId, academicYearId, classId, name: String(name).slice(0, 100), createdBy: session.user.id, createdAt: now, updatedAt: now })
        const inactiveSlot = slots.find(slot => slot.timetableId === timetableId && slot.dayOfWeek === dayOfWeek && slot.periodNumber === periodNumber && !slot.isActive)
        const slotId = inactiveSlot?.id ?? randomUUID()
        const slot = { id: slotId, timetableId, academicYearId, classId, subjectId, teacherId, dayOfWeek, periodNumber, startTime, endTime, isActive: true, createdAt: inactiveSlot?.createdAt ?? now }
        if (inactiveSlot) await db.update(classTimetableSlots).set({ subjectId, teacherId, startTime, endTime, isActive: true }).where(eq(classTimetableSlots.id, slotId))
        else await db.insert(classTimetableSlots).values(slot)
        await db.insert(classTimetableAuditLogs).values({ id: randomUUID(), timetableId, slotId, actorUserId: session.user.id, action: inactiveSlot ? "slot_reactivated" : "slot_created", details: JSON.stringify({ dayOfWeek, periodNumber, startTime, endTime, subjectId, teacherId }), createdAt: now })
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
            subjectId: body.subjectId ?? current.subjectId,
            teacherId: body.teacherId ?? current.teacherId,
            dayOfWeek: body.dayOfWeek ?? current.dayOfWeek,
            periodNumber: body.periodNumber ?? current.periodNumber,
            startTime: body.startTime ?? current.startTime,
            endTime: body.endTime ?? current.endTime,
        }
        if (typeof next.subjectId !== "string" || typeof next.teacherId !== "string" || !Number.isInteger(next.dayOfWeek) || next.dayOfWeek < 0 || next.dayOfWeek > 6 || !Number.isInteger(next.periodNumber) || next.periodNumber < 1 || !isValidTime(next.startTime) || !isValidTime(next.endTime) || next.startTime >= next.endTime) return NextResponse.json({ error: "Invalid timetable slot data" }, { status: 400 })
        const [assignment] = await db.select({ teacherId: teacherAssignments.teacherId }).from(teacherAssignments).where(and(eq(teacherAssignments.academicYearId, current.academicYearId), eq(teacherAssignments.classId, current.classId), eq(teacherAssignments.subjectId, next.subjectId), eq(teacherAssignments.teacherId, next.teacherId))).limit(1)
        if (!assignment) return NextResponse.json({ error: "Invalid teacher assignment" }, { status: 400 })
        const allSlots = await db.select().from(classTimetableSlots).where(eq(classTimetableSlots.academicYearId, current.academicYearId))
        const conflict = allSlots.find(item => item.isActive && item.id !== slotId && item.dayOfWeek === next.dayOfWeek && item.startTime < next.endTime && next.startTime < item.endTime && (item.classId === current.classId || item.teacherId === next.teacherId))
        if (conflict) return NextResponse.json({ error: conflict.classId === current.classId ? "CLASS_TIME_CONFLICT" : "TEACHER_TIME_CONFLICT" }, { status: 409 })
        await db.update(classTimetableSlots).set(next).where(eq(classTimetableSlots.id, slotId))
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
