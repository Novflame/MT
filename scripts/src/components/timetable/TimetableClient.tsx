"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Clock3,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Year = { id: string; name: string; isActive: boolean };
type SchoolClass = { id: string; name: string; gradeLevel: number };
type SessionRow = {
  id: string;
  classId: string;
  subjectId: string;
  scheduledTeacherId: string;
  actualTeacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
  recordedStudentCount: number;
};
type RosterRow = {
  enrollmentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  attendance: string | null;
  note: string | null;
};
type Assignment = {
  teacherId: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  teacher?: { id: string; name: string } | null;
};
type SlotRow = {
  slot: {
    id: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: number;
    periodNumber: number;
    startTime: string;
    endTime: string;
  };
  className: string;
  subjectName: string;
};
type TeacherMetric = {
  teacherId: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  lateCheckIns: number;
  averageLateMinutes: number;
  missingTeacherCheckIns: number;
  missingTeacherCheckOuts: number;
  studentAttendanceCompletionRate: number;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";

export default function TimetableClient({ role }: { role: string }) {
  const isAdmin = role === "principal" || role === "deputy";
  const [years, setYears] = useState<Year[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [yearId, setYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [weeklySlots, setWeeklySlots] = useState<SlotRow[]>([]);
  const [teacherMetrics, setTeacherMetrics] = useState<TeacherMetric[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [slot, setSlot] = useState({
    subjectId: "",
    teacherId: "",
    dayOfWeek: "0",
    periodNumber: "1",
    startTime: "08:00",
    endTime: "08:45",
  });
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  const className = useMemo(
    () => classes.find((item) => item.id === classId)?.name ?? "",
    [classes, classId],
  );


  const loadSessions = useCallback(async () => {
    if (!date) return;
    setBusy(true);
    try {
      const query = new URLSearchParams({ date });
      if (classId) query.set("classId", classId);
      const response = await fetch(`/api/timetable/sessions?${query}`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Failed to load sessions");
      setSessions(data.sessions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل الحصص");
    } finally {
      setBusy(false);
    }
  }, [date, classId]);
  // Initial timetable data
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const [yearResponse, classResponse] = await Promise.all([
          fetch("/api/academic-years"),
          fetch("/api/classes"),
        ]);

        if (!yearResponse.ok || !classResponse.ok) {
          throw new Error("Failed to load timetable data");
        }

        const [yearData, classData] = await Promise.all([
          yearResponse.json(),
          classResponse.json(),
        ]);

        if (!active) return;

        const loadedYears: Year[] = yearData.academicYears ?? [];
        const loadedClasses: SchoolClass[] = Array.isArray(classData)
          ? classData
          : [];

        setYears(loadedYears);
        setClasses(loadedClasses);

        const activeYear =
          loadedYears.find((item) => item.isActive) ?? loadedYears[0];

        if (activeYear) {
          setYearId(activeYear.id);
        } else {
          setYearId("");
          setAssignments([]);
          setWeeklySlots([]);
        }
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "تعذر تحميل بيانات الجدول",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  // Reload sessions when date or class changes
  useEffect(() => {
    let active = true;

    async function fetchSessions() {
      if (!date) return;

      try {
        const query = new URLSearchParams({ date });
        if (classId) query.set("classId", classId);

        const response = await fetch(
          `/api/timetable/sessions?${query}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load sessions");
        }

        if (active) setSessions(data.sessions ?? []);
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error ? error.message : "تعذر تحميل الحصص",
          );
        }
      }
    }

    void fetchSessions();

    return () => {
      active = false;
    };
  }, [date, classId]);

  useEffect(() => {
    if (!yearId) return;
    let active = true;
    Promise.all([
      fetch(
        `/api/teacher-assignments?academicYearId=${encodeURIComponent(yearId)}`,
      ).then((response) => response.json()),
      fetch(
        `/api/timetable?academicYearId=${encodeURIComponent(yearId)}${classId ? `&classId=${encodeURIComponent(classId)}` : ""}`,
      ).then((response) => response.json()),
    ])
      .then(([assignmentData, timetableData]) => {
        if (!active) return;
        setAssignments(assignmentData.assignments ?? []);
        setWeeklySlots(timetableData.slots ?? []);
      })
      .catch(() => {
        if (active) {
          setAssignments([]);
          setWeeklySlots([]);
        }
      });
    return () => {
      active = false;
    };
  }, [yearId, classId]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    fetch("/api/timetable/reports/teachers")
      .then((response) => response.json())
      .then((data) => {
        if (active) setTeacherMetrics(data.teachers ?? []);
      })
      .catch(() => {
        if (active) setTeacherMetrics([]);
      });
    return () => {
      active = false;
    };
  }, [isAdmin, sessions.length]);

  async function generateDay() {
    if (!yearId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/timetable/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, academicYearId: yearId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed");
      setMessage(
        `تم إنشاء ${data.created} حصة، والحصص الموجودة مسبقاً ${data.existing}`,
      );
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إنشاء الحصص");
    } finally {
      setBusy(false);
    }
  }

  async function createSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!yearId || !classId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/timetable", {
        method: editingSlotId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingSlotId
            ? { slotId: editingSlotId }
            : { academicYearId: yearId, classId }),
          ...slot,
          dayOfWeek: Number(slot.dayOfWeek),
          periodNumber: Number(slot.periodNumber),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save slot");
      setMessage(
        editingSlotId
          ? "تم تحديث الحصة"
          : "تمت إضافة الحصة إلى الجدول الأسبوعي",
      );
      setEditingSlotId(null);
      setSlot({
        subjectId: "",
        teacherId: "",
        dayOfWeek: "0",
        periodNumber: "1",
        startTime: "08:00",
        endTime: "08:45",
      });
      const timetableResponse = await fetch(
        `/api/timetable?academicYearId=${encodeURIComponent(yearId)}${classId ? `&classId=${encodeURIComponent(classId)}` : ""}`,
      );
      const timetableData = await timetableResponse.json();
      setWeeklySlots(timetableData.slots ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الحصة");
    } finally {
      setBusy(false);
    }
  }

  function editSlot(row: SlotRow) {
    setClassId(row.slot.classId);
    setEditingSlotId(row.slot.id);
    setSlot({
      subjectId: row.slot.subjectId,
      teacherId: row.slot.teacherId,
      dayOfWeek: String(row.slot.dayOfWeek),
      periodNumber: String(row.slot.periodNumber),
      startTime: row.slot.startTime,
      endTime: row.slot.endTime,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteSlot(slotId: string) {
    if (
      !window.confirm(
        "هل تريد تعطيل هذه الحصة من الجدول؟ ستظل الحصص السابقة محفوظة.",
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/timetable?slotId=${encodeURIComponent(slotId)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to remove slot");
      setWeeklySlots((rows) => rows.filter((row) => row.slot.id !== slotId));
      setMessage(
        data.preservedForHistory
          ? "تم تعطيل الحصة مع الحفاظ على سجلاتها السابقة"
          : "تم حذف الحصة",
      );
      if (editingSlotId === slotId) setEditingSlotId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تعطيل الحصة");
    } finally {
      setBusy(false);
    }
  }

  async function openRoster(sessionId: string) {
    setSelected(sessionId);
    setMessage("");
    try {
      const response = await fetch(
        `/api/timetable/sessions/${sessionId}/student-attendance`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load roster");
      const rows: RosterRow[] = data.roster ?? [];
      setRoster(rows);
      setAttendance(
        Object.fromEntries(
          rows.map((row) => [row.enrollmentId, row.attendance ?? ""]),
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل الطلاب");
    }
  }

  async function saveRoster() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/timetable/sessions/${selected}/student-attendance`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: roster
              .filter((row) => Boolean(attendance[row.enrollmentId]))
              .map((row) => ({
                enrollmentId: row.enrollmentId,
                status: attendance[row.enrollmentId],
              })),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Failed to save attendance");
      setMessage(`تم تسجيل حضور ${data.saved} طالباً`);
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الحضور");
    } finally {
      setBusy(false);
    }
  }

  async function teacherAction(
    sessionId: string,
    action: "check_in" | "check_out",
  ) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/timetable/sessions/${sessionId}/teacher-attendance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Attendance action failed");
      setMessage(
        action === "check_in" ? "تم تسجيل حضور المعلم" : "تم إنهاء الحصة",
      );
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تسجيل الحضور");
    } finally {
      setBusy(false);
    }
  }

  const subjectOptions = assignments.filter((item) => item.classId === classId);
  const teacherForSubject = assignments.filter(
    (item) => item.classId === classId && item.subjectId === slot.subjectId,
  );

  return (
    <main className="min-h-dvh bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Academic operations
              </p>
              <h1 className="mt-1 text-2xl font-bold">الجدول الدراسي والحصص</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                إدارة الجدول الأسبوعي ومتابعة تنفيذ الحصص والحضور الفعلي.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <CalendarDays size={17} />
              {className || "جميع الصفوف"}
            </div>
          </div>
        </header>
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
          <label className="text-sm font-medium">
            السنة الدراسية
            <select
              className={`${inputClass} mt-1`}
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " (نشطة)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            الصف
            <select
              className={`${inputClass} mt-1`}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">كل الصفوف المسموحة</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            التاريخ
            <input
              className={`${inputClass} mt-1`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              className={`${buttonClass} flex-1`}
              onClick={() => void loadSessions()}
              disabled={busy}
            >
              <RefreshCw size={16} /> تحديث
            </button>
            {isAdmin && (
              <button
                className={`${buttonClass} flex-1`}
                onClick={() => void generateDay()}
                disabled={busy || !yearId}
              >
                إنشاء حصص اليوم
              </button>
            )}
          </div>
        </section>
        {isAdmin && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-bold">
                {editingSlotId
                  ? "تعديل الحصة الأسبوعية"
                  : "إضافة حصة للجدول الأسبوعي"}
              </h2>
              {editingSlotId && (
                <button
                  type="button"
                  className="text-sm text-slate-500"
                  onClick={() => {
                    setEditingSlotId(null);
                    setSlot({
                      subjectId: "",
                      teacherId: "",
                      dayOfWeek: "0",
                      periodNumber: "1",
                      startTime: "08:00",
                      endTime: "08:45",
                    });
                  }}
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
            <form
              onSubmit={createSlot}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <label className="text-sm">
                المادة
                <select
                  required
                  className={`${inputClass} mt-1`}
                  value={slot.subjectId}
                  onChange={(e) =>
                    setSlot((v) => ({
                      ...v,
                      subjectId: e.target.value,
                      teacherId: "",
                    }))
                  }
                >
                  <option value="">اختر المادة</option>
                  {Array.from(
                    new Map(
                      subjectOptions.map((a) => [a.subjectId, a]),
                    ).values(),
                  ).map((a) => (
                    <option key={a.subjectId} value={a.subjectId}>
                      {a.subjectName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                المعلم
                <select
                  required
                  className={`${inputClass} mt-1`}
                  value={slot.teacherId}
                  onChange={(e) =>
                    setSlot((v) => ({ ...v, teacherId: e.target.value }))
                  }
                >
                  <option value="">اختر المعلم</option>
                  {Array.from(
                    new Map(
                      teacherForSubject.map((a) => [a.teacherId, a]),
                    ).values(),
                  ).map((a) => (
                    <option key={a.teacherId} value={a.teacherId}>
                      {a.teacher?.name ?? a.teacherId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                اليوم
                <select
                  className={`${inputClass} mt-1`}
                  value={slot.dayOfWeek}
                  onChange={(e) =>
                    setSlot((v) => ({ ...v, dayOfWeek: e.target.value }))
                  }
                >
                  {[
                    "الأحد",
                    "الإثنين",
                    "الثلاثاء",
                    "الأربعاء",
                    "الخميس",
                    "الجمعة",
                    "السبت",
                  ].map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                رقم الحصة
                <input
                  className={`${inputClass} mt-1`}
                  type="number"
                  min="1"
                  value={slot.periodNumber}
                  onChange={(e) =>
                    setSlot((v) => ({ ...v, periodNumber: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                من
                <input
                  className={`${inputClass} mt-1`}
                  type="time"
                  value={slot.startTime}
                  onChange={(e) =>
                    setSlot((v) => ({ ...v, startTime: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                إلى
                <input
                  className={`${inputClass} mt-1`}
                  type="time"
                  value={slot.endTime}
                  onChange={(e) =>
                    setSlot((v) => ({ ...v, endTime: e.target.value }))
                  }
                />
              </label>
              <div className="flex items-end sm:col-span-2">
                <button
                  className={buttonClass}
                  disabled={
                    busy || !classId || !slot.subjectId || !slot.teacherId
                  }
                >
                  {editingSlotId ? "حفظ التعديلات" : "حفظ الحصة"}
                </button>
              </div>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              تظهر المواد والمعلمون بناءً على تكليفات السنة النشطة المعروضة في
              النظام.
            </p>
          </section>
        )}
        {message && (
          <div
            role="status"
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
          >
            {message}
          </div>
        )}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <h2 className="font-bold">الجدول الأسبوعي</h2>
            <p className="mt-1 text-xs text-slate-500">
              الحصص المتكررة للسنة والصف المحددين.
            </p>
          </div>
          {weeklySlots.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              لا توجد حصص أسبوعية مسجلة لهذا الاختيار.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="p-3 text-start">الصف</th>
                    <th className="p-3 text-start">اليوم</th>
                    <th className="p-3 text-start">الحصة</th>
                    <th className="p-3 text-start">المادة</th>
                    <th className="p-3 text-start">المعلم</th>
                    <th className="p-3 text-start">الوقت</th>
                    {isAdmin && <th className="p-3 text-start">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {weeklySlots
                    .slice()
                    .sort(
                      (a, b) =>
                        a.slot.dayOfWeek - b.slot.dayOfWeek ||
                        a.slot.periodNumber - b.slot.periodNumber,
                    )
                    .map((row) => (
                      <tr
                        key={row.slot.id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="p-3">{row.className}</td>
                        <td className="p-3">
                          {
                            [
                              "الأحد",
                              "الإثنين",
                              "الثلاثاء",
                              "الأربعاء",
                              "الخميس",
                              "الجمعة",
                              "السبت",
                            ][row.slot.dayOfWeek]
                          }
                        </td>
                        <td className="p-3">{row.slot.periodNumber}</td>
                        <td className="p-3">{row.subjectName}</td>
                        <td className="p-3">
                          {assignments.find(
                            (a) => a.teacherId === row.slot.teacherId,
                          )?.teacher?.name ?? row.slot.teacherId}
                        </td>
                        <td className="p-3">
                          {row.slot.startTime}–{row.slot.endTime}
                        </td>
                        {isAdmin && (
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                className="text-xs font-semibold text-blue-700"
                                onClick={() => editSlot(row)}
                              >
                                تعديل
                              </button>
                              <button
                                className="text-xs font-semibold text-red-600"
                                onClick={() => void deleteSlot(row.slot.id)}
                                disabled={busy}
                              >
                                تعطيل
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <div>
              <h2 className="font-bold">حصص اليوم</h2>
              <p className="mt-1 text-xs text-slate-500">
                {date} · {sessions.length} حصة
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
              {busy ? "جارٍ التحديث" : "محدث"}
            </span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              جارٍ تحميل الجدول...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <AlertCircle className="mx-auto mb-2" />
              لا توجد حصص لهذا التاريخ. يمكن للإدارة إنشاء حصص اليوم من الجدول
              الأسبوعي.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      <Clock3 size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {classes.find((c) => c.id === item.classId)?.name ??
                          item.classId}{" "}
                        · {item.startTime}–{item.endTime}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        المعلم:{" "}
                        {assignments.find(
                          (a) => a.teacherId === item.actualTeacherId,
                        )?.teacher?.name ?? item.actualTeacherId}{" "}
                        · الحضور المسجل: {item.recordedStudentCount}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(role === "teacher" || isAdmin) &&
                      item.actualTeacherId && (
                        <>
                          <button
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            onClick={() =>
                              void teacherAction(item.id, "check_in")
                            }
                            disabled={busy}
                          >
                            تسجيل حضور المعلم
                          </button>
                          <button
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            onClick={() =>
                              void teacherAction(item.id, "check_out")
                            }
                            disabled={busy}
                          >
                            إنهاء الحصة
                          </button>
                        </>
                      )}
                    <button
                      className={buttonClass}
                      onClick={() => void openRoster(item.id)}
                    >
                      <Users size={15} /> حضور الطلاب
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {selected && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <div>
                <h2 className="font-bold">تسجيل حضور الطلاب</h2>
                <p className="text-xs text-slate-500">{roster.length} طالب</p>
              </div>
              <button
                className="text-sm text-slate-500"
                onClick={() => setSelected(null)}
              >
                إغلاق
              </button>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="p-3 text-start">الطالب</th>
                    <th className="p-3 text-start">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row) => (
                    <tr
                      key={row.enrollmentId}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="p-3">
                        {[row.firstName, row.middleName, row.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </td>
                      <td className="p-3">
                        <select
                          className={inputClass}
                          value={attendance[row.enrollmentId] ?? ""}
                          onChange={(e) =>
                            setAttendance((v) => ({
                              ...v,
                              [row.enrollmentId]: e.target.value,
                            }))
                          }
                        >
                          <option value="">غير مسجل</option>
                          {["present", "absent", "late", "excused"].map(
                            (status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-slate-200 p-4 dark:border-slate-800">
              <button
                className={buttonClass}
                onClick={() => void saveRoster()}
                disabled={busy}
              >
                <CheckCircle2 size={16} /> حفظ الحضور
              </button>
            </div>
          </section>
        )}
        {isAdmin && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <h2 className="font-bold">مؤشرات أداء المعلمين</h2>
              <p className="mt-1 text-xs text-slate-500">
                محسوبة مباشرة من سجلات الحصص والحضور.
              </p>
            </div>
            {teacherMetrics.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                لا توجد بيانات أداء بعد.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="p-3 text-start">المعلم</th>
                      <th className="p-3 text-start">الحصص</th>
                      <th className="p-3 text-start">المنفذة</th>
                      <th className="p-3 text-start">التأخير</th>
                      <th className="p-3 text-start">متوسط التأخير</th>
                      <th className="p-3 text-start">غياب تسجيل الدخول</th>
                      <th className="p-3 text-start">غياب تسجيل الخروج</th>
                      <th className="p-3 text-start">اكتمال حضور الطلاب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherMetrics.map((metric) => (
                      <tr
                        key={metric.teacherId}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="p-3">
                          {assignments.find(
                            (a) => a.teacherId === metric.teacherId,
                          )?.teacher?.name ?? metric.teacherId}
                        </td>
                        <td className="p-3">{metric.totalSessions}</td>
                        <td className="p-3">{metric.completedSessions}</td>
                        <td className="p-3">{metric.lateCheckIns}</td>
                        <td className="p-3">
                          {metric.averageLateMinutes} دقيقة
                        </td>
                        <td className="p-3">{metric.missingTeacherCheckIns}</td>
                        <td className="p-3">
                          {metric.missingTeacherCheckOuts}
                        </td>
                        <td className="p-3">
                          {metric.studentAttendanceCompletionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
