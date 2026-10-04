"use client";
import { useState } from "react";
export default function DepartmentHeadsManager({
  departments,
  staff,
}: {
  departments: { id: string; name: string }[];
  staff: { id: string; name: string; email: string; role: string }[];
}) {
  const [departmentId, setDepartmentId] = useState("");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/department-heads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId, userId }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      alert("Head of Department assigned");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="text-xl font-semibold">Assign Head of Department</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <select
          className="rounded border px-3 py-2"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="">Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border px-3 py-2"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">Staff member</option>
          {staff
            .filter(
              (s) => s.role === "head_of_department" || s.role === "teacher",
            )
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.email}
              </option>
            ))}
        </select>
      </div>
      <button
        onClick={save}
        disabled={saving || !departmentId || !userId}
        className="mt-4 rounded bg-black px-4 py-2 text-white"
      >
        {saving ? "Saving..." : "Assign"}
      </button>
    </section>
  );
}
