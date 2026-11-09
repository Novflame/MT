"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword.length < 12)
      return setError("The new password must contain at least 12 characters.");
    if (newPassword !== confirmPassword)
      return setError("The new passwords do not match.");
    setSaving(true);
    try {
      const response = await fetch("/api/account/change-initial-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Password change failed");
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Password change failed",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <h1 className="text-2xl font-semibold">
            Change your initial password
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            For your security, you must replace the one-time password before
            using the school system.
          </p>
        </div>
        <label className="block text-sm font-medium">
          Current temporary password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          New password
          <input
            required
            minLength={12}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Confirm new password
          <input
            required
            minLength={12}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <button
          disabled={saving}
          className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {saving ? "Updating…" : "Change password"}
        </button>
      </form>
    </main>
  );
}
