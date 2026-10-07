
import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { getStudentFullName } from "@/lib/student-name";
import { getLocale } from "@/lib/i18n/server";
import { translations, type Locale } from "@/lib/i18n/translations";

export default async function AttendanceReportPage() {
  await requirePermission("attendance.read");

  const db = await getSchoolDB();

  const rows = await db.query.attendance.findMany({
    with: {
      studentEnrollment: {
        with: {
          student: true,
          class: true,
        },
      },
    },
  });

  const present = rows.filter(
    (r) => r.status === "present",
  ).length;

  const absent = rows.filter(
    (r) => r.status === "absent",
  ).length;

  const locale = await getLocale();
  const t = translations[locale];

  return (
    <main className="min-h-dvh bg-slate-50 px-3 py-4 text-slate-900 sm:px-6 sm:py-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <header className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-5 text-white sm:px-6 sm:py-6 dark:border-slate-800">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
                  {t.attendance.schoolManagementSystem}
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {getAttendanceReportTitle(locale)}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  {getAttendanceReportDescription(locale)}
                </p>
              </div>

              {/* Header statistics */}
              <div className="grid w-full grid-cols-3 overflow-hidden rounded-xl border border-white/20 bg-white/10 sm:w-auto">
                <HeaderMetric
                  label={getTotalRecordsLabel(locale)}
                  value={rows.length}
                />

                <HeaderMetric
                  label={getPresentLabel(locale)}
                  value={present}
                  valueClassName="text-emerald-300"
                />

                <HeaderMetric
                  label={getAbsentLabel(locale)}
                  value={absent}
                  valueClassName="text-red-300"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Report table */}
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                  {getAttendanceReportTitle(locale)}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {getRecordsLabel(locale)}
                </p>
              </div>

              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {rows.length}
              </div>
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                    <th className="whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6 dark:text-slate-400">
                      {getDateLabel(locale)}
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6 dark:text-slate-400">
                      {getStudentLabel(locale)}
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6 dark:text-slate-400">
                      {getClassLabel(locale)}
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6 dark:text-slate-400">
                      {getStatusLabel(locale)}
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6 dark:text-slate-400">
                      {getNoteLabel(locale)}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => {
                    const isPresent = r.status === "present";
                    const isAbsent = r.status === "absent";

                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700 sm:px-6 dark:text-slate-200">
                          {r.date}
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {r.studentEnrollment?.student
                              ? getStudentFullName(
                                  r.studentEnrollment.student,
                                )
                              : "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <span className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                            {r.studentEnrollment?.class?.name ?? "—"}
                          </span>
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <span
                            className={[
                              "inline-flex min-w-20 items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold capitalize",
                              isPresent
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : isAbsent
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
                            ].join(" ")}
                          >
                            {getStatusText(r.status, locale)}
                          </span>
                        </td>

                        <td className="max-w-xs px-4 py-4 text-slate-500 sm:px-6 dark:text-slate-400">
                          {r.note ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-12 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <span className="text-xl">—</span>
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                {getNoRecordsTitle(locale)}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                {getNoRecordsDescription(locale)}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function HeaderMetric({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 px-3 py-3 text-center sm:px-5 sm:py-4">
      <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-blue-100 sm:text-xs">
        {label}
      </div>

      <div
        className={`mt-1 text-xl font-bold leading-none sm:text-2xl ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  );
}

function getAttendanceReportTitle(locale: Locale) {
  if (locale === "ar") return "تقرير الحضور";
  if (locale === "fr") return "Rapport de présence";
  return "Attendance Report";
}

function getAttendanceReportDescription(locale: Locale) {
  if (locale === "ar") {
    return "عرض سجلات حضور الطلاب وحالاتهم في مكان واحد.";
  }

  if (locale === "fr") {
    return "Consultez les enregistrements et les statuts de présence des élèves.";
  }

  return "View student attendance records and status in one place.";
}

function getTotalRecordsLabel(locale: Locale) {
  if (locale === "ar") return "إجمالي السجلات";
  if (locale === "fr") return "Total";
  return "Total records";
}

function getPresentLabel(locale: Locale) {
  if (locale === "ar") return "حاضر";
  if (locale === "fr") return "Présent";
  return "Present";
}

function getAbsentLabel(locale: Locale) {
  if (locale === "ar") return "غائب";
  if (locale === "fr") return "Absent";
  return "Absent";
}

function getRecordsLabel(locale: Locale) {
  if (locale === "ar") return "سجلات الحضور";
  if (locale === "fr") return "Enregistrements de présence";
  return "Attendance records";
}

function getDateLabel(locale: Locale) {
  if (locale === "ar") return "التاريخ";
  if (locale === "fr") return "Date";
  return "Date";
}

function getStudentLabel(locale: Locale) {
  if (locale === "ar") return "الطالب";
  if (locale === "fr") return "Élève";
  return "Student";
}

function getClassLabel(locale: Locale) {
  if (locale === "ar") return "الفصل";
  if (locale === "fr") return "Classe";
  return "Class";
}

function getStatusLabel(locale: Locale) {
  if (locale === "ar") return "الحالة";
  if (locale === "fr") return "Statut";
  return "Status";
}

function getNoteLabel(locale: Locale) {
  if (locale === "ar") return "ملاحظة";
  if (locale === "fr") return "Note";
  return "Note";
}

function getStatusText(
  status: string,
  locale: Locale,
) {
  if (status === "present") {
    if (locale === "ar") return "حاضر";
    if (locale === "fr") return "Présent";
    return "Present";
  }

  if (status === "absent") {
    if (locale === "ar") return "غائب";
    if (locale === "fr") return "Absent";
    return "Absent";
  }

  if (status === "late") {
    if (locale === "ar") return "متأخر";
    if (locale === "fr") return "En retard";
    return "Late";
  }

  if (status === "excused") {
    if (locale === "ar") return "معذور";
    if (locale === "fr") return "Excused";
    return "Excused";
  }

  return status;
}

function getNoRecordsTitle(locale: Locale) {
  if (locale === "ar") return "لا توجد سجلات حضور";
  if (locale === "fr") return "Aucun enregistrement";
  return "No attendance records";
}

function getNoRecordsDescription(locale: Locale) {
  if (locale === "ar") {
    return "لا توجد سجلات حضور متاحة للعرض حالياً.";
  }

  if (locale === "fr") {
    return "Aucun enregistrement de présence n'est disponible actuellement.";
  }

  return "There are currently no attendance records to display.";
}

