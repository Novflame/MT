const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")

test("timetable storage is separate from legacy attendance", () => {
    const schema = read("src/db/schema.ts")
    const start = schema.indexOf("export const attendance = sqliteTable(")
    const end = schema.indexOf("export const teacherAssignments", start)
    const legacyAttendance = schema.slice(start, end)
    assert.ok(start >= 0 && end > start)
    assert.match(legacyAttendance, /attendance_enrollment_subject_date_unique/)
    assert.doesNotMatch(legacyAttendance, /classSessionId|class_session_id/)
    assert.match(schema, /session_student_attendance_unique/)
})

test("central timetable feature flag is opt-in per school", () => {
    const schema = read("src/db/centeral-schema.ts")
    assert.match(schema, /export const schoolFeatureFlags = sqliteTable\("school_feature_flags"/)
    assert.match(schema, /timetableEnabled: integer\("timetable_enabled"[\s\S]*?\.default\(false\)/)
    assert.match(schema, /timetableAttendanceGraceMinutes[\s\S]*?\.default\(10\)/)
})

test("teacher session operations and student attendance use separate APIs", () => {
    const teacher = read("src/app/api/timetable/sessions/[sessionId]/teacher-attendance/route.ts")
    const students = read("src/app/api/timetable/sessions/[sessionId]/student-attendance/route.ts")
    assert.match(teacher, /checkedInAt/)
    assert.match(teacher, /checkedOutAt/)
    assert.match(teacher, /lateMinutes/)
    assert.match(students, /sessionStudentAttendance/)
    assert.match(students, /onConflictDoUpdate/)
})

test("daily session generation is idempotent", () => {
    const schema = read("src/db/schema.ts")
    const route = read("src/app/api/timetable/sessions/route.ts")
    assert.match(schema, /class_session_slot_date_unique/)
    assert.match(route, /onConflictDoNothing\(\)/)
})

test("reminder job is secret-protected and deduplicates events", () => {
    const route = read("src/app/api/timetable/cron/route.ts")
    assert.match(route, /TIMETABLE_CRON_SECRET/)
    assert.match(route, /onConflictDoNothing\(\)/)
    assert.match(route, /student_attendance_missing/)
    assert.match(route, /teacher_checkin_missing/)
    assert.match(route, /teacher_checkout_missing/)
})
