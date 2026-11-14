import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { getSchoolDB } from "@/db";
import {
  classSessions,
  sessionTeacherAttendance,
  sessionStudentAttendance,
  studentEnrollments,
} from "@/db/schema";
import {
  requireApiPermission,
  ApiAuthorizationError,
} from "@/auth/api-authorization";
import {
  assertTimetableEnabled,
  getTimetableLocalParts,
} from "@/lib/timetable/access";

export async function GET(request: Request) {
  try {
    const session = await requireApiPermission(request, "reports.read");
    await assertTimetableEnabled(session.user.id);
    const role = session.user.schoolRole;
    if (role !== "principal" && role !== "deputy")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const teacherId = searchParams.get("teacherId")
        if (
      (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) ||
      (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))
    )
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 },
      );
    const db = await getSchoolDB();
    const { date: today, time: currentTime } = getTimetableLocalParts();
    const filters = [];
    if (from) filters.push(gte(classSessions.sessionDate, from));
    if (to) filters.push(lte(classSessions.sessionDate, to));
    if (teacherId) filters.push(eq(classSessions.actualTeacherId, teacherId));
    const sessions = await db
      .select()
      .from(classSessions)
      .where(filters.length ? and(...filters) : undefined);
    const teacherIds = Array.from(
      new Set(sessions.map((item) => item.actualTeacherId)),
    );
    const result = [];
    for (const id of teacherIds) {
      const own = sessions.filter((item) => item.actualTeacherId === id);
      const dueSessions = own.filter(
        (item) =>
          item.sessionDate < today ||
          (item.sessionDate === today && item.endTime <= currentTime),
      );
      if (!dueSessions.length) continue;
      const sessionIds = own.map((item) => item.id);
      const teacherRecords = sessionIds.length
        ? await db
            .select()
            .from(sessionTeacherAttendance)
            .where(and(eq(sessionTeacherAttendance.teacherId, id)))
        : [];
      const ownRecords = teacherRecords.filter((record) =>
        sessionIds.includes(record.sessionId),
      );
      const completed = own.filter((item) => item.status === "completed");
      const cancelled = own.filter((item) => item.status === "cancelled");
      const late = ownRecords.filter((record) => record.status === "late");
      const noCheckIn = dueSessions.filter(
        (item) =>
          item.status !== "cancelled" &&
          !ownRecords.some(
            (record) => record.sessionId === item.id && record.checkedInAt,
          ),
      );
      const noCheckOut = dueSessions.filter(
        (item) =>
          item.status !== "cancelled" &&
          ownRecords.some(
            (record) =>
              record.sessionId === item.id &&
              record.checkedInAt &&
              !record.checkedOutAt,
          ),
      );
      let expectedStudents = 0;
      let recordedStudents = 0;
      for (const item of dueSessions.filter(
        (item) => item.status !== "cancelled",
      )) {
        const expected = await db
          .select({ id: studentEnrollments.id })
          .from(studentEnrollments)
          .where(
            and(
              eq(studentEnrollments.classId, item.classId),
              eq(studentEnrollments.academicYearId, item.academicYearId),
            ),
          );
        const recorded = await db
          .select({ id: sessionStudentAttendance.id })
          .from(sessionStudentAttendance)
          .where(eq(sessionStudentAttendance.sessionId, item.id));
        expectedStudents += expected.length;
        recordedStudents += recorded.length;
      }
      result.push({
        teacherId: id,
        totalSessions: dueSessions.length,
        completedSessions: completed.filter((item) =>
          dueSessions.some((due) => due.id === item.id),
        ).length,
        cancelledSessions: cancelled.filter((item) =>
          dueSessions.some((due) => due.id === item.id),
        ).length,
        lateCheckIns: late.length,
        averageLateMinutes: late.length
          ? Math.round(
              late.reduce((sum, item) => sum + item.lateMinutes, 0) /
                late.length,
            )
          : 0,
        missingTeacherCheckIns: noCheckIn.length,
        missingTeacherCheckOuts: noCheckOut.length,
        studentAttendanceCompletionRate: expectedStudents
          ? Math.round((recordedStudents / expectedStudents) * 100)
          : 100,
      });
    }
    return NextResponse.json({ from, to, teachers: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json(
      { error: message },
      {
        status:
          error instanceof ApiAuthorizationError
            ? error.status
            : message === "TIMETABLE_DISABLED"
              ? 403
              : 500,
      },
    );
  }
}
