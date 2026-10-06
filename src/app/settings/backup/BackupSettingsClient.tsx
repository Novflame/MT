"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  CloudDownload,
  Database,
  Download,
  FileArchive,
  FileCheck2,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";

type BackupHistoryItem = {
  id: string;
  createdAt: string;
  school: {
    id: string;
    name: string;
  };
  database: {
    provider: "sqlite";
    migration: {
      hash: string;
      createdAt: number;
    } | null;
  };
  contents: {
    database: true;
    files: boolean;
  };
  integrity: {
    algorithm: "sha256";
    databaseSha256: string;
  };
};

type Props = {
  initialBackups: BackupHistoryItem[];
};

type Toast = {
  type: "success" | "error";
  title: string;
  message: string;
};

type Message =
  | {
      type: "success";
      text: string;
    }
  | {
      type: "error";
      text: string;
    }
  | null;

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatRelativeDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const now = Date.now()
  const difference = now - date.getTime()

  if (difference < 60_000) {
    return "Just now"
  }

  if (difference < 3_600_000) {
    const minutes = Math.floor(difference / 60_000)

    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }

  if (difference < 86_400_000) {
    const hours = Math.floor(difference / 3_600_000)

    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  const days = Math.floor(difference / 86_400_000)

  return `${days} day${days === 1 ? "" : "s"} ago`
}
function shortenBackupId(id: string) {
  if (id.length <= 34) {
    return id;
  }

  return `${id.slice(0, 18)}…${id.slice(-12)}`;
}

function getApiError(data: unknown, fallback: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return fallback;
}

export default function BackupSettingsClient({ initialBackups }: Props) {
  const [backups, setBackups] = useState<BackupHistoryItem[]>(initialBackups);

  const [message, setMessage] = useState<Message>(null);

  const [creating, setCreating] = useState(false);

  const [importing, setImporting] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const [downloadId, setDownloadId] = useState<string | null>(null);

  const [restoreCandidate, setRestoreCandidate] =
    useState<BackupHistoryItem | null>(null);

  const [showHowItWorks, setShowHowItWorks] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestBackup = backups.length > 0 ? backups[0] : null;

  const verifiedCount = backups.length;

  async function refreshHistory() {
    setRefreshing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/backups/history", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to refresh backup history."));
      }

      setBackups(Array.isArray(data.backups) ? data.backups : []);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to refresh backup history.",
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreateBackup() {
    setCreating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/backups", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to create backup."));
      }

      setMessage({
        type: "success",
        text: "Backup created and verified successfully.",
      });

      await refreshHistory();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to create backup.",
      });
    } finally {
      setCreating(false);
    }
  }

  function openImportPicker() {
    fileInputRef.current?.click();
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".smb")) {
      setMessage({
        type: "error",
        text: "Please select a valid .smb backup package.",
      });

      return;
    }

    setImporting(true);
    setMessage(null);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch("/api/backups/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to import backup."));
      }

      setMessage({
        type: "success",
        text: "Backup imported and verified successfully.",
      });

      await refreshHistory();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to import backup.",
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleVerify(backupId: string) {
    setVerifyingId(backupId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/backups/${encodeURIComponent(backupId)}/verify`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(data, "Backup verification failed."));
      }

      if (data.valid === false) {
        throw new Error(data.error || "Backup verification failed.");
      }

      setMessage({
        type: "success",
        text: "Backup verified successfully. The database integrity and checksum are valid.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Backup verification failed.",
      });
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDownload(backupId: string) {
    setDownloadId(backupId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/backups/${encodeURIComponent(backupId)}/download`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(getApiError(data, "Failed to download backup."));
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `school-backup-${backupId}.smb`;

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(url);

      setMessage({
        type: "success",
        text: "Backup package downloaded successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to download backup.",
      });
    } finally {
      setDownloadId(null);
    }
  }

  async function handleRestore() {
    if (!restoreCandidate) {
      return;
    }

    const backupId = restoreCandidate.id;

    setRestoringId(backupId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/backups/${encodeURIComponent(backupId)}/restore`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to restore backup."));
      }

      setMessage({
        type: "success",
        text: "Backup restored successfully. The school database was verified after restoration.",
      });

      showToast({
        type: "success",
        title: "Restore completed successfully",
        message:
          "Your school data has been restored successfully and verified. The selected backup is now active.",
      });

      setRestoreCandidate(null);

      await refreshHistory();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to restore backup.";

      setMessage({
        type: "error",
        text: errorMessage,
      });

      showToast({
        type: "error",
        title: "Restore failed",
        message: errorMessage,
      });
    } finally {
      setRestoringId(null);
    }
  }

  function showToast(nextToast: Toast) {
    setToast(nextToast);

    window.setTimeout(() => {
      setToast(null);
    }, 2000);
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-5 sm:px-6 sm:py-8 dark:bg-slate-950">
      {toast && (
        <div
          className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:top-6"
          role="status"
          aria-live="polite"
        >
          <div
            className={[
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-4 shadow-2xl backdrop-blur-md",
              "animate-in fade-in slide-in-from-top-4 duration-300",
              toast.type === "success"
                ? "border-green-200 bg-green-50/95 text-green-950 dark:border-green-900 dark:bg-green-950/95 dark:text-green-50"
                : "border-red-200 bg-red-50/95 text-red-950 dark:border-red-900 dark:bg-red-950/95 dark:text-red-50",
            ].join(" ")}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{toast.title}</p>

              <p className="mt-1 text-sm leading-5 opacity-90">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <Database size={22} strokeWidth={1.8} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    Backup & Restore
                  </h1>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Protect your school data
                  </p>
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Create verified copies of your school database, keep them safely
                outside the system, and restore a previous copy when necessary.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <ShieldCheck size={15} />
              {verifiedCount} verified backup
              {verifiedCount === 1 ? "" : "s"}
            </div>
          </div>
        </header>

        {/* Message */}
        {message && (
          <div
            role="status"
            className={[
              "mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
            ].join(" ")}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            )}

            <p className="min-w-0 flex-1 leading-6">{message.text}</p>

            <button
              type="button"
              onClick={() => setMessage(null)}
              className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* How it works */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setShowHowItWorks((value) => !value)}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
            aria-expanded={showHowItWorks}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <CircleHelp size={20} />
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  How Backup & Restore works
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  What each action does and when to use it
                </p>
              </div>
            </div>

            {showHowItWorks ? (
              <ChevronUp size={19} className="shrink-0 text-slate-400" />
            ) : (
              <ChevronDown size={19} className="shrink-0 text-slate-400" />
            )}
          </button>

          {showHowItWorks && (
            <div className="border-t border-slate-200 px-4 py-5 dark:border-slate-800 sm:px-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <HowItWorksCard
                  icon={<Plus size={18} />}
                  title="Create Backup"
                  description="Creates a new verified copy of the current school database."
                />

                <HowItWorksCard
                  icon={<FileCheck2 size={18} />}
                  title="Verify"
                  description="Checks the backup database and SHA-256 checksum to make sure the copy is valid."
                />

                <HowItWorksCard
                  icon={<Download size={18} />}
                  title="Download"
                  description="Downloads the verified .smb package so you can store it somewhere safe outside the application."
                />

                <HowItWorksCard
                  icon={<Upload size={18} />}
                  title="Import"
                  description="Adds an existing .smb backup package to this school's backup history after verification."
                />

                <HowItWorksCard
                  icon={<RotateCcw size={18} />}
                  title="Restore"
                  description="Replaces the current school database with the selected backup. A safety backup is created first."
                  danger
                />
              </div>
            </div>
          )}
        </section>

        {/* Statistics */}
        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Backups"
            value={String(backups.length)}
            description="Available for this school"
            icon={<Database size={19} />}
          />

          <StatCard
            label="Latest Backup"
            value={
              latestBackup ? formatDate(latestBackup.createdAt) : "No backups"
            }
            description={
              latestBackup
                ? formatRelativeDate(latestBackup.createdAt)
                : "Create your first backup"
            }
            icon={<RefreshCw size={19} />}
          />

          <StatCard
            label="Verified Backups"
            value={String(verifiedCount)}
            description="Integrity-ready database copies"
            icon={<ShieldCheck size={19} />}
            success
          />
        </section>

        {/* Actions */}
        <section className="mb-6">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Backup Actions
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Create a new backup or bring an existing verified backup into the
              system.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ActionCard
              icon={<Plus size={20} />}
              title="Create Backup"
              description="Create a new verified copy of the current school database."
              buttonLabel={creating ? "Creating backup..." : "Create Backup"}
              disabled={creating || importing || refreshing}
              loading={creating}
              onClick={handleCreateBackup}
            />

            <ActionCard
              icon={<Upload size={20} />}
              title="Import Backup"
              description="Import an existing .smb package. The package is checked before it becomes available for restore."
              buttonLabel={
                importing ? "Importing backup..." : "Choose .smb File"
              }
              disabled={importing || creating || refreshing}
              loading={importing}
              onClick={openImportPicker}
              secondary
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".smb,application/octet-stream"
            className="hidden"
            onChange={handleImport}
          />
        </section>

        {/* History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Backup History
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Verified backup packages available for this school.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshHistory}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {backups.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-190 w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Backup</th>

                      <th className="px-5 py-3">Created</th>

                      <th className="px-5 py-3">Database</th>

                      <th className="px-5 py-3">Status</th>

                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {backups.map((backup) => (
                      <tr key={backup.id} className="align-top">
                        <td className="px-5 py-4">
                          <div
                            className="font-medium text-slate-900 dark:text-white"
                            title={backup.id}
                          >
                            {shortenBackupId(backup.id)}
                          </div>

                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            SHA-256
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-slate-700 dark:text-slate-200">
                            {formatDate(backup.createdAt)}
                          </div>

                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatRelativeDate(backup.createdAt)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            SQLite
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <VerifiedBadge />
                        </td>

                        <td className="px-5 py-4">
                          <BackupActions
                            verifying={verifyingId === backup.id}
                            downloading={downloadId === backup.id}
                            restoring={restoringId === backup.id}
                            disabled={Boolean(restoringId)}
                            onVerify={() => handleVerify(backup.id)}
                            onDownload={() => handleDownload(backup.id)}
                            onRestore={() => setRestoreCandidate(backup)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet */}
              <div className="divide-y divide-slate-200 lg:hidden dark:divide-slate-800">
                {backups.map((backup) => (
                  <BackupMobileCard
                    key={backup.id}
                    backup={backup}
                    verifying={verifyingId === backup.id}
                    downloading={downloadId === backup.id}
                    restoring={restoringId === backup.id}
                    disabled={Boolean(restoringId)}
                    onVerify={() => handleVerify(backup.id)}
                    onDownload={() => handleDownload(backup.id)}
                    onRestore={() => setRestoreCandidate(backup)}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Restore safety note */}
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400"
            />

            <div className="min-w-0">
              <h2 className="font-semibold text-amber-900 dark:text-amber-300">
                Restore changes live school data
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-400">
                Restoring a backup replaces the current school database. The
                system creates an emergency pre-restore backup before replacing
                the database and verifies the restored database afterward.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Restore confirmation */}
      {restoreCandidate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-dialog-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="restore-dialog-title"
                    className="font-semibold text-slate-900 dark:text-white"
                  >
                    Restore this backup?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    This will replace the current live school database.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRestoreCandidate(null)}
                  disabled={Boolean(restoringId)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close restore confirmation"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Selected backup
                </p>

                <p
                  className="mt-2 break-all text-sm font-medium text-slate-900 dark:text-white"
                  title={restoreCandidate.id}
                >
                  {restoreCandidate.id}
                </p>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Created {formatDate(restoreCandidate.createdAt)}
                </p>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex gap-2">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  The selected backup has already been verified.
                </p>

                <p className="flex gap-2">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  A safety backup will be created before restore.
                </p>

                <p className="flex gap-2">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  The restored database will be checked afterward.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                disabled={Boolean(restoringId)}
                className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRestore}
                disabled={Boolean(restoringId)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {restoringId ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    Restore Backup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function HowItWorksCard({
  icon,
  title,
  description,
  danger = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <div
        className={[
          "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
          danger
            ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
            : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200",
        ].join(" ")}
      >
        {icon}
      </div>

      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  success = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  success?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 break-words text-lg font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            success
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  buttonLabel,
  disabled,
  loading,
  onClick,
  secondary = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            secondary
              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
          ].join(" ")}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
          secondary
            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            : "bg-blue-600 text-white hover:bg-blue-700",
        ].join(" ")}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}

        {!loading && secondary && <Upload size={16} />}

        {!loading && !secondary && <Plus size={16} />}

        {buttonLabel}
      </button>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      <CheckCircle2 size={13} />
      Verified
    </span>
  );
}

function BackupActions({
  verifying,
  downloading,
  restoring,
  disabled,
  onVerify,
  onDownload,
  onRestore,
}: {
  verifying: boolean;
  downloading: boolean;
  restoring: boolean;
  disabled: boolean;
  onVerify: () => void;
  onDownload: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ActionButton
        onClick={onVerify}
        disabled={disabled || verifying}
        loading={verifying}
        icon={<FileCheck2 size={15} />}
        label="Verify"
      />

      <ActionButton
        onClick={onDownload}
        disabled={disabled || downloading}
        loading={downloading}
        icon={<CloudDownload size={15} />}
        label="Download"
      />

      <ActionButton
        onClick={onRestore}
        disabled={disabled || restoring}
        loading={restoring}
        icon={<RotateCcw size={15} />}
        label="Restore"
        danger
      />
    </div>
  );
}

function BackupMobileCard({
  backup,
  verifying,
  downloading,
  restoring,
  disabled,
  onVerify,
  onDownload,
  onRestore,
}: {
  backup: BackupHistoryItem;
  verifying: boolean;
  downloading: boolean;
  restoring: boolean;
  disabled: boolean;
  onVerify: () => void;
  onDownload: () => void;
  onRestore: () => void;
}) {
  return (
    <article className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <FileArchive size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="max-w-full break-all text-sm font-semibold text-slate-900 dark:text-white"
              title={backup.id}
            >
              {shortenBackupId(backup.id)}
            </span>

            <VerifiedBadge />
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            SQLite · SHA-256
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoItem label="Created" value={formatDate(backup.createdAt)} />

        <InfoItem label="Age" value={formatRelativeDate(backup.createdAt)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ActionButton
          onClick={onVerify}
          disabled={disabled || verifying}
          loading={verifying}
          icon={<FileCheck2 size={15} />}
          label="Verify"
          fullWidth
        />

        <ActionButton
          onClick={onDownload}
          disabled={disabled || downloading}
          loading={downloading}
          icon={<CloudDownload size={15} />}
          label="Download"
          fullWidth
        />

        <ActionButton
          onClick={onRestore}
          disabled={disabled || restoring}
          loading={restoring}
          icon={<RotateCcw size={15} />}
          label="Restore"
          danger
          fullWidth
        />
      </div>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-medium text-slate-700 dark:text-slate-300">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  loading,
  icon,
  label,
  danger = false,
  fullWidth = false,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  icon: ReactNode;
  label: string;
  danger?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth ? "w-full" : "",
        danger
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}

      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Database size={22} />
      </div>

      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        No backups yet
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        Create your first verified backup to protect the schools database.
      </p>
    </div>
  );
}
