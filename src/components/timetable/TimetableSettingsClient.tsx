"use client";

import { useEffect, useState } from "react";
import { Save, CalendarClock } from "lucide-react";

export default function TimetableSettingsClient() {
  const [enabled, setEnabled] = useState(false);
  const [grace, setGrace] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [migrationPending, setMigrationPending] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/timetable")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Failed to load settings");
        if (active) {
          setEnabled(data.timetableEnabled);
          setGrace(data.graceMinutes);
          setMigrationPending(Boolean(data.migrationPending));
        }
      })
      .catch((error) => {
        if (active)
          setMessage(
            error instanceof Error ? error.message : "Failed to load settings",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/timetable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetableEnabled: enabled,
          graceMinutes: grace,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Failed to save settings");
      setMessage("تم حفظ إعدادات الجدول والحصص");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <CalendarClock />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                إعدادات الجدول والحصص
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                تفعيل النظام وتحديد المهلة قبل إرسال تنبيهات الحضور.
              </p>
            </div>
          </div>
        </header>
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {migrationPending && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              إعدادات النظام جاهزة في الكود، لكن ترحيلات قاعدة البيانات لم
              تُطبّق بعد. أبقِ النظام معطلاً حتى اكتمال ترحيلات القاعدة المركزية
              وقاعدة المدرسة.
            </p>
          )}
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">
                تفعيل نظام الجدول والحصص
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                عند التعطيل تختفي صفحات النظام وتُرفض طلباته ومهامه الخلفية.
              </span>
            </span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              disabled={loading || migrationPending}
              className="h-5 w-5 accent-blue-700"
            />
          </label>
          <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              مهلة تسجيل الحضور بعد نهاية الحصة (بالدقائق)
              <input
                type="number"
                min="0"
                max="240"
                value={grace}
                onChange={(event) => setGrace(Number(event.target.value))}
                disabled={loading || migrationPending}
                className="mt-2 block w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">
              القيمة من 0 إلى 240 دقيقة. ترسل المهمة الخلفية تنبيهًا واحدًا لكل
              نوع حدث ولكل حصة.
            </p>
          </div>
          {message && (
            <p
              role="status"
              className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
            >
              {message}
            </p>
          )}
          <button
            onClick={() => void save()}
            disabled={
              loading || saving || migrationPending || grace < 0 || grace > 240
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </section>
      </div>
    </main>
  );
}
