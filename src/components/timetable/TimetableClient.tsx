"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
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
  const { locale } = useLanguage();
  const tr = (en: string, ar: string, fr: string = en) => locale === "ar" ? ar : locale === "fr" ? fr : en;
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
        throw new Error(data.error ?? tr("Failed to load sessions", "تعذر تحميل الحصص", "Échec du chargement des cours"));
      setSessions(data.sessions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr("Could not load lessons", "تعذر تحميل الحصص", "Impossible de charger les cours"));
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
          throw new Error(tr("Failed to load timetable data", "تعذر تحميل بيانات الجدول", "Échec du chargement de l’emploi du temps"));
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
              : tr("Could not load timetable data", "تعذر تحميل بيانات الجدول", "Impossible de charger l’emploi du temps"),
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
          throw new Error(data.error ?? tr("Failed to load sessions", "تعذر تحميل الحصص", "Échec du chargement des cours"));
        }

        if (active) setSessions(data.sessions ?? []);
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error ? error.message : tr("Could not load lessons", "تعذر تحميل الحصص", "Impossible de charger les cours"),
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
      if (!response.ok) throw new Error(data.error ?? tr("Generation failed", "تعذر إنشاء الحصص", "Échec de la génération des cours"));
      setMessage(tr(`${data.created} lessons created; ${data.existing} already existed.`, `تم إنشاء ${data.created} حصة، والحصص الموجودة مسبقاً ${data.existing}`, `${data.created} cours créés ; ${data.existing} existaient déjà.`));
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr("Could not generate lessons", "تعذر إنشاء الحصص", "Impossible de générer les cours"));
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
          subjectId: slot.subjectId.trim(),
          teacherId: slot.teacherId.trim(),
          dayOfWeek: Number.parseInt(slot.dayOfWeek, 10),
          periodNumber: Number.parseInt(slot.periodNumber, 10),
          startTime: slot.startTime.trim().slice(0, 5),
          endTime: slot.endTime.trim().slice(0, 5),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const details = Array.isArray(data.invalidFields) && data.invalidFields.length
          ? ` (${data.invalidFields.join(", ")})`
          : "";
        throw new Error(`${data.error ?? tr("Failed to save slot", "تعذر حفظ الحصة", "Échec de l’enregistrement du créneau")}${details}`);
      }
      setMessage(
        editingSlotId
          ? tr("Lesson updated", "تم تحديث الحصة", "Cours mis à jour")
          : tr("Lesson added to the weekly timetable", "تمت إضافة الحصة إلى الجدول الأسبوعي", "Cours ajouté à l’emploi du temps hebdomadaire"),
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
      setMessage(error instanceof Error ? error.message : tr("Could not save the lesson", "تعذر حفظ الحصة", "Impossible d’enregistrer le cours"));
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
        tr("Disable this timetable slot? Past lessons will remain preserved.", "هل تريد تعطيل هذه الحصة من الجدول؟ ستظل الحصص السابقة محفوظة.", "Désactiver ce créneau ? Les cours passés resteront conservés."),
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
      if (!response.ok) throw new Error(data.error ?? tr("Failed to remove slot", "تعذر حذف الحصة", "Échec de la suppression du créneau"));
      setWeeklySlots((rows) => rows.filter((row) => row.slot.id !== slotId));
      setMessage(
        data.preservedForHistory
          ? tr("The slot was disabled; previous records were preserved.", "تم تعطيل الحصة مع الحفاظ على سجلاتها السابقة", "Le créneau a été désactivé ; les enregistrements précédents sont conservés.")
          : tr("The slot was deleted.", "تم حذف الحصة", "Le créneau a été supprimé."),
      );
      if (editingSlotId === slotId) setEditingSlotId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr("Could not disable the lesson", "تعذر تعطيل الحصة", "Impossible de désactiver le cours"));
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
      if (!response.ok) throw new Error(data.error ?? tr("Failed to load roster", "تعذر تحميل قائمة الطلاب", "Échec du chargement de la liste des élèves"));
      const rows: RosterRow[] = data.roster ?? [];
      setRoster(rows);
      setAttendance(
        Object.fromEntries(
          rows.map((row) => [row.enrollmentId, row.attendance ?? ""]),
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr("Could not load students", "تعذر تحميل الطلاب", "Impossible de charger les élèves"));
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
        throw new Error(data.error ?? tr("Failed to save attendance", "تعذر حفظ الحضور", "Échec de l’enregistrement des présences"));
      setMessage(tr(`Attendance saved for ${data.saved} students.`, `تم تسجيل حضور ${data.saved} طالباً`, `Présence enregistrée pour ${data.saved} élèves.`));
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr("Could not save attendance", "تعذر حفظ الحضور", "Impossible d’enregistrer les présences"));
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
        throw new Error(data.error ?? tr("Attendance action failed", "تعذر تسجيل الحضور", "Échec du pointage"));
      setMessage(
        action === "check_in" ? tr("Teacher checked in", "تم تسجيل حضور المعلم", "Enseignant pointé") : tr("Lesson ended", "تم إنهاء الحصة", "Cours terminé"),
      );
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr("Could not record attendance", "تعذر تسجيل الحضور", "Impossible d’enregistrer la présence"));
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
                {tr("Academic operations", "العمليات الأكاديمية", "Opérations académiques")}
              </p>
              <h1 className="mt-1 text-2xl font-bold">{tr("Timetable and lessons", "الجدول الدراسي والحصص", "Emploi du temps et cours")}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {tr("Manage the weekly timetable and monitor lessons and attendance.", "إدارة الجدول الأسبوعي ومتابعة تنفيذ الحصص والحضور الفعلي.", "Gérez l’emploi du temps hebdomadaire et suivez les cours et les présences.")}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <CalendarDays size={17} />
              {className || tr("All classes", "جميع الصفوف", "Toutes les classes")}
            </div>
          </div>
        </header>
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
          <label className="text-sm font-medium">
            {tr("Academic year", "السنة الدراسية", "Année scolaire")}
            <select
              className={`${inputClass} mt-1`}
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? (locale === "ar" ? " (نشطة)" : " (active)") : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            {tr("Class", "الصف", "Classe")}
            <select
              className={`${inputClass} mt-1`}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">{tr("All available classes", "كل الصفوف المسموحة", "Toutes les classes disponibles")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            {tr("Date", "التاريخ", "Date")}
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
              <RefreshCw size={16} /> {tr("Refresh", "تحديث", "Actualiser")}
            </button>
            {isAdmin && (
              <button
                className={`${buttonClass} flex-1`}
                onClick={() => void generateDay()}
                disabled={busy || !yearId}
              >
                {tr("Generate today’s lessons", "إنشاء حصص اليوم", "Générer les cours du jour")}
              </button>
            )}
          </div>
        </section>
        {isAdmin && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-bold">
                {editingSlotId
                  ? tr("Edit weekly slot", "تعديل الحصة الأسبوعية", "Modifier le créneau hebdomadaire")
                  : tr("Add a weekly slot", "إضافة حصة للجدول الأسبوعي", "Ajouter un créneau hebdomadaire")}
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
                  {tr("Cancel editing", "إلغاء التعديل", "Annuler la modification")}
                </button>
              )}
            </div>
            <form
              onSubmit={createSlot}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <label className="text-sm">
                {tr("Subject", "المادة", "Matière")}
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
                  <option value="">{tr("Select subject", "اختر المادة", "Choisir une matière")}</option>
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
                {tr("Teacher", "المعلم", "Enseignant")}
                <select
                  required
                  className={`${inputClass} mt-1`}
                  value={slot.teacherId}
                  onChange={(e) =>
                    setSlot((v) => ({ ...v, teacherId: e.target.value }))
                  }
                >
                  <option value="">{tr("Select teacher", "اختر المعلم", "Choisir un enseignant")}</option>
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
                {tr("Day", "اليوم", "Jour")}
                <select
                  className={`${inputClass} mt-1`}
                  value={slot.dayOfWeek}
                  onChange={(e) =>
                    setSlot((v) => ({ ...v, dayOfWeek: e.target.value }))
                  }
                >
                  {[
                    ...(locale === "ar" ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] : locale === "fr" ? ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
                  ].map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                {tr("Period number", "رقم الحصة", "Numéro du cours")}
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
                {tr("From", "من", "De")}
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
                {tr("To", "إلى", "À")}
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
                  {editingSlotId ? tr("Save changes", "حفظ التعديلات", "Enregistrer les modifications") : tr("Save slot", "حفظ الحصة", "Enregistrer le créneau")}
                </button>
              </div>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              {tr("Subjects and teachers are based on the assignments for the selected academic year.", "تظهر المواد والمعلمون بناءً على تكليفات السنة الدراسية المحددة.", "Les matières et les enseignants dépendent des affectations de l’année scolaire sélectionnée.")}
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
            <h2 className="font-bold">{tr("Weekly timetable", "الجدول الأسبوعي", "Emploi du temps hebdomadaire")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {tr("Recurring lessons for the selected year and class.", "الحصص المتكررة للسنة والصف المحددين.", "Cours récurrents pour l’année et la classe sélectionnées.")}
            </p>
          </div>
          {weeklySlots.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              {tr("No weekly lessons are registered for this selection.", "لا توجد حصص أسبوعية مسجلة لهذا الاختيار.", "Aucun cours hebdomadaire n’est enregistré pour cette sélection.")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="p-3 text-start">{tr("Class", "الصف", "Classe")}</th>
                    <th className="p-3 text-start">{tr("Day", "اليوم", "Jour")}</th>
                    <th className="p-3 text-start">{tr("Period", "الحصة", "Cours")}</th>
                    <th className="p-3 text-start">{tr("Subject", "المادة", "Matière")}</th>
                    <th className="p-3 text-start">{tr("Teacher", "المعلم", "Enseignant")}</th>
                    <th className="p-3 text-start">{tr("Time", "الوقت", "Heure")}</th>
                    {isAdmin && <th className="p-3 text-start">{tr("Actions", "إجراءات", "Actions")}</th>}
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
                            (locale === "ar"
                              ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
                              : locale === "fr"
                                ? ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
                                : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])[row.slot.dayOfWeek]
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
                                {tr("Edit", "تعديل", "Modifier")}
                              </button>
                              <button
                                className="text-xs font-semibold text-red-600"
                                onClick={() => void deleteSlot(row.slot.id)}
                                disabled={busy}
                              >
                                {tr("Disable", "تعطيل", "Désactiver")}
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
              <h2 className="font-bold">{tr("Today’s lessons", "حصص اليوم", "Cours du jour")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {date} · {sessions.length} {tr("lessons", "حصة", "cours")}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
              {busy ? tr("Refreshing", "جارٍ التحديث", "Actualisation") : tr("Up to date", "محدث", "À jour")}
            </span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {tr("Loading timetable...", "جارٍ تحميل الجدول...", "Chargement de l’emploi du temps...")}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <AlertCircle className="mx-auto mb-2" />
              {tr("No lessons are scheduled for this date. Administrators can generate today’s lessons from the weekly timetable.", "لا توجد حصص لهذا التاريخ. يمكن للإدارة إنشاء حصص اليوم من الجدول الأسبوعي.", "Aucun cours n’est prévu à cette date. L’administration peut générer les cours du jour à partir de l’emploi du temps hebdomadaire.")}
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
                        {tr("Teacher", "المعلم", "Enseignant")}:{" "}
                        {assignments.find(
                          (a) => a.teacherId === item.actualTeacherId,
                        )?.teacher?.name ?? item.actualTeacherId}{" "}
                        · {tr("Recorded attendance:", "الحضور المسجل:", "Présences enregistrées :")} {item.recordedStudentCount}
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
                            {tr("Teacher check-in", "تسجيل حضور المعلم", "Pointage de l’enseignant")}
                          </button>
                          <button
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            onClick={() =>
                              void teacherAction(item.id, "check_out")
                            }
                            disabled={busy}
                          >
                            {tr("End lesson", "إنهاء الحصة", "Terminer le cours")}
                          </button>
                        </>
                      )}
                    <button
                      className={buttonClass}
                      onClick={() => void openRoster(item.id)}
                    >
                      <Users size={15} /> {tr("Student attendance", "حضور الطلاب", "Présence des élèves")}
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
                <h2 className="font-bold">{tr("Student attendance", "تسجيل حضور الطلاب", "Présence des élèves")}</h2>
                <p className="text-xs text-slate-500">{roster.length} {tr("students", "طالب", "élèves")}</p>
              </div>
              <button
                className="text-sm text-slate-500"
                onClick={() => setSelected(null)}
              >
                {tr("Close", "إغلاق", "Fermer")}
              </button>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="p-3 text-start">{tr("Student", "الطالب", "Élève")}</th>
                    <th className="p-3 text-start">{tr("Status", "الحالة", "Statut")}</th>
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
                          <option value="">{tr("Not recorded", "غير مسجل", "Non enregistré")}</option>
                          {["present", "absent", "late", "excused"].map(
                            (status) => (
                              <option key={status} value={status}>
                                {status === "present" ? tr("Present", "حاضر", "Présent") : status === "absent" ? tr("Absent", "غائب", "Absent") : status === "late" ? tr("Late", "متأخر", "En retard") : tr("Excused", "بعذر", "Excusé")}
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
                <CheckCircle2 size={16} /> {tr("Save attendance", "حفظ الحضور", "Enregistrer les présences")}
              </button>
            </div>
          </section>
        )}
        {isAdmin && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <h2 className="font-bold">{tr("Teacher performance metrics", "مؤشرات أداء المعلمين", "Indicateurs de performance des enseignants")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {tr("Calculated from lesson and attendance records.", "محسوبة مباشرة من سجلات الحصص والحضور.", "Calculés à partir des cours et des présences enregistrés.")}
              </p>
            </div>
            {teacherMetrics.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                {tr("No performance data yet.", "لا توجد بيانات أداء بعد.", "Aucune donnée de performance pour le moment.")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="p-3 text-start">{tr("Teacher", "المعلم", "Enseignant")}</th>
                      <th className="p-3 text-start">{tr("Lessons", "الحصص", "Cours")}</th>
                      <th className="p-3 text-start">{tr("Completed", "المنفذة", "Terminés")}</th>
                      <th className="p-3 text-start">{tr("Late", "التأخير", "Retards")}</th>
                      <th className="p-3 text-start">{tr("Average delay", "متوسط التأخير", "Retard moyen")}</th>
                      <th className="p-3 text-start">{tr("Missing check-ins", "غياب تسجيل الدخول", "Pointages d’arrivée manquants")}</th>
                      <th className="p-3 text-start">{tr("Missing check-outs", "غياب تسجيل الخروج", "Pointages de départ manquants")}</th>
                      <th className="p-3 text-start">{tr("Student attendance completion", "اكتمال حضور الطلاب", "Complétude des présences élèves")}</th>
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
                          {metric.averageLateMinutes} {tr("min", "دقيقة", "min")}
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
