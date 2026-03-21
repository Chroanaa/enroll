"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  HardDriveUpload,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";

import { colors } from "../colors";

type BackupFrequency = "daily" | "weekly";

interface BackupSettings {
  enabled: boolean;
  frequency: BackupFrequency;
  time: string;
  dayOfWeek: number;
  retentionCount: number;
  postgresBinPath: string;
  lastRunAt: string | null;
  lastStatus: "idle" | "success" | "failed";
  lastMessage: string | null;
}

interface BackupFileSummary {
  name: string;
  sizeBytes: number;
  createdAt: string;
  source: "manual" | "scheduled";
}

interface BackupDashboardData {
  storagePath: string;
  storageMode: "filesystem" | "database";
  backups: BackupFileSummary[];
  settings: BackupSettings;
  tooling: {
    available: boolean;
    pgDumpAvailable: boolean;
    pgRestoreAvailable: boolean;
    logicalBackupAvailable: boolean;
    logicalRestoreAvailable: boolean;
    mode: "native" | "logical";
    storageMode: "filesystem" | "database";
    message: string;
  };
  nextRunAt: string | null;
  scheduler: {
    mode: "persistent-process" | "serverless-best-effort";
    reliable: boolean;
    message: string;
  };
}

const dayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const emptySettings: BackupSettings = {
  enabled: false,
  frequency: "daily",
  time: "02:00",
  dayOfWeek: 0,
  retentionCount: 10,
  postgresBinPath: "",
  lastRunAt: null,
  lastStatus: "idle",
  lastMessage: null,
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = sizeBytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

const BackupManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringName, setRestoringName] = useState<string | null>(null);
  const [uploadingRestore, setUploadingRestore] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(
    null,
  );
  const [dashboard, setDashboard] = useState<BackupDashboardData | null>(null);
  const [settings, setSettings] = useState<BackupSettings>(emptySettings);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const backups = dashboard?.backups ?? [];

  const saveDisabled = useMemo(() => {
    return saving || !dashboard;
  }, [dashboard, saving]);

  const loadDashboard = async (showSpinner: boolean = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await fetch("/api/backups");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load backup dashboard.");
      }

      setDashboard(payload.data);
      setSettings(payload.data.settings);
      setMessage(null);
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Failed to load backup dashboard.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const saveSchedule = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/backups/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save backup settings.");
      }

      setSettings(payload.data);
      setMessage({ type: "success", text: "Backup schedule saved." });
      await loadDashboard(false);
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Failed to save backup settings.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    try {
      setCreatingBackup(true);
      const response = await fetch("/api/backups", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create backup.");
      }

      setMessage({
        type: "success",
        text: `Backup created: ${payload.data.name}`,
      });
      await loadDashboard(false);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Failed to create backup.";
      setMessage({ type: "error", text });
    } finally {
      setCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupName: string) => {
    const confirmed = window.confirm(
      `Restore the database using ${backupName}? This will overwrite the current database contents.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setRestoringName(backupName);
      const response = await fetch("/api/backups/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backupFileName: backupName }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to restore backup.");
      }

      setMessage({
        type: "success",
        text: payload.message || "Backup restored successfully.",
      });
      await loadDashboard(false);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Failed to restore backup.";
      setMessage({ type: "error", text });
    } finally {
      setRestoringName(null);
    }
  };

  const restoreUploadedFile = async () => {
    if (!selectedRestoreFile) {
      setMessage({ type: "error", text: "Choose a backup file first." });
      return;
    }

    const confirmed = window.confirm(
      `Restore the database using uploaded file ${selectedRestoreFile.name}? This will overwrite the current database contents.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setUploadingRestore(true);
      const formData = new FormData();
      formData.append("file", selectedRestoreFile);

      const response = await fetch("/api/backups/restore", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to restore uploaded backup.");
      }

      setSelectedRestoreFile(null);
      setMessage({
        type: "success",
        text: payload.message || "Backup restored successfully.",
      });
      await loadDashboard(false);
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Failed to restore uploaded backup.";
      setMessage({ type: "error", text });
    } finally {
      setUploadingRestore(false);
    }
  };

  if (loading) {
    return (
      <div
        className='min-h-screen flex items-center justify-center'
        style={{ backgroundColor: colors.paper }}
      >
        <div className='flex flex-col items-center gap-4'>
          <Loader2
            className='w-10 h-10 animate-spin'
            style={{ color: colors.primary }}
          />
          <p className='font-medium' style={{ color: colors.neutralDark }}>
            Loading backup management...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen' style={{ backgroundColor: colors.paper }}>
      <div
        className='border-b px-6 py-8 sm:px-8 lg:px-12'
        style={{ borderColor: `${colors.primary}20` }}
      >
        <div className='max-w-7xl mx-auto flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <div className='flex items-center gap-3 mb-3'>
              <div
                className='p-3 rounded-2xl'
                style={{ backgroundColor: `${colors.primary}12` }}
              >
                <Database
                  className='w-7 h-7'
                  style={{ color: colors.primary }}
                />
              </div>
              <div>
                <h1
                  className='text-3xl font-bold'
                  style={{ color: colors.primary }}
                >
                  Backup Management
                </h1>
                <p className='text-sm' style={{ color: colors.secondary }}>
                  Manual backups, daily or weekly scheduling, and full database
                  restore.
                </p>
              </div>
            </div>
            <p className='text-sm' style={{ color: colors.neutralDark }}>
              Backup storage:{" "}
              <span className='font-semibold'>{dashboard?.storagePath}</span>
            </p>
          </div>

          <div className='flex flex-wrap gap-3'>
            <button
              type='button'
              onClick={() => void loadDashboard(false)}
              disabled={refreshing}
              className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium transition disabled:opacity-60'
              style={{
                backgroundColor: "white",
                color: colors.primary,
                border: `1px solid ${colors.primary}20`,
              }}
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              type='button'
              onClick={createBackup}
              disabled={creatingBackup}
              className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-white transition disabled:opacity-60'
              style={{ backgroundColor: colors.primary }}
            >
              {creatingBackup ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Database className='w-4 h-4' />
              )}
              Backup Now
            </button>
          </div>
        </div>
      </div>

      <div className='px-6 py-8 sm:px-8 lg:px-12'>
        <div className='max-w-7xl mx-auto space-y-8'>
          {message && (
            <div
              className='flex items-center gap-3 rounded-2xl border px-4 py-3'
              style={{
                backgroundColor:
                  message.type === "success"
                    ? `${colors.success}12`
                    : `${colors.danger}12`,
                borderColor:
                  message.type === "success"
                    ? `${colors.success}30`
                    : `${colors.danger}30`,
              }}
            >
              {message.type === "success" ? (
                <CheckCircle2
                  className='w-5 h-5'
                  style={{ color: colors.success }}
                />
              ) : (
                <AlertCircle
                  className='w-5 h-5'
                  style={{ color: colors.danger }}
                />
              )}
              <span
                className='font-medium'
                style={{
                  color:
                    message.type === "success" ? colors.success : colors.danger,
                }}
              >
                {message.text}
              </span>
            </div>
          )}

          <div className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
            <section
              className='rounded-3xl border bg-white p-6 shadow-sm'
              style={{ borderColor: `${colors.primary}15` }}
            >
              <div className='flex items-center justify-between gap-4 mb-6'>
                <div>
                  <h2
                    className='text-xl font-semibold'
                    style={{ color: colors.primary }}
                  >
                    Automatic Scheduled Backup
                  </h2>
                  <p className='text-sm mt-1' style={{ color: colors.neutral }}>
                    Configure daily or weekly automatic backups for the current
                    runtime.
                  </p>
                </div>
                <div
                  className='rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide'
                  style={{
                    backgroundColor: settings.enabled
                      ? `${colors.success}12`
                      : `${colors.warning}12`,
                    color: settings.enabled ? colors.success : colors.warning,
                  }}
                >
                  {settings.enabled ? "Enabled" : "Disabled"}
                </div>
              </div>

              <div className='grid gap-5 md:grid-cols-2'>
                <label
                  className='flex items-start gap-3 rounded-2xl border p-4'
                  style={{ borderColor: colors.neutralBorder }}
                >
                  <input
                    type='checkbox'
                    checked={settings.enabled}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                    className='mt-1 h-4 w-4 rounded'
                  />
                  <span>
                    <span
                      className='block font-semibold'
                      style={{ color: colors.primary }}
                    >
                      Enable automatic backups
                    </span>
                    <span
                      className='block text-sm mt-1'
                      style={{ color: colors.neutral }}
                    >
                      {dashboard?.scheduler?.reliable
                        ? "The scheduler checks every minute and runs the next due backup."
                        : "In serverless production, a cron trigger is required for reliable scheduled backups."}
                    </span>
                  </span>
                </label>

                <div
                  className='rounded-2xl border p-4'
                  style={{ borderColor: colors.neutralBorder }}
                >
                  <p
                    className='text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    Next scheduled run
                  </p>
                  <p className='text-sm' style={{ color: colors.neutralDark }}>
                    {dashboard?.nextRunAt
                      ? formatDateTime(dashboard.nextRunAt)
                      : "Scheduling disabled"}
                  </p>
                </div>

                <div>
                  <label
                    className='block text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    Frequency
                  </label>
                  <select
                    value={settings.frequency}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        frequency: event.target.value as BackupFrequency,
                      }))
                    }
                    className='w-full rounded-xl border px-3 py-2.5 outline-none'
                    style={{ borderColor: colors.neutralBorder }}
                  >
                    <option value='daily'>Daily</option>
                    <option value='weekly'>Weekly</option>
                  </select>
                </div>

                <div>
                  <label
                    className='block text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    Time
                  </label>
                  <input
                    type='time'
                    value={settings.time}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        time: event.target.value,
                      }))
                    }
                    className='w-full rounded-xl border px-3 py-2.5 outline-none'
                    style={{ borderColor: colors.neutralBorder }}
                  />
                </div>

                {settings.frequency === "weekly" && (
                  <div>
                    <label
                      className='block text-sm font-semibold mb-2'
                      style={{ color: colors.primary }}
                    >
                      Day of week
                    </label>
                    <select
                      value={settings.dayOfWeek}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          dayOfWeek: Number(event.target.value),
                        }))
                      }
                      className='w-full rounded-xl border px-3 py-2.5 outline-none'
                      style={{ borderColor: colors.neutralBorder }}
                    >
                      {dayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    className='block text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    Retention count
                  </label>
                  <input
                    type='number'
                    min={1}
                    max={100}
                    value={settings.retentionCount}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        retentionCount: Number(event.target.value),
                      }))
                    }
                    className='w-full rounded-xl border px-3 py-2.5 outline-none'
                    style={{ borderColor: colors.neutralBorder }}
                  />
                </div>
              </div>

              <div className='mt-5'>
                <label
                  className='block text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  PostgreSQL bin directory
                </label>
                <input
                  type='text'
                  value={settings.postgresBinPath}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      postgresBinPath: event.target.value,
                    }))
                  }
                  placeholder='Optional, for example C:\Program Files\PostgreSQL\17\bin'
                  className='w-full rounded-xl border px-3 py-2.5 outline-none'
                  style={{ borderColor: colors.neutralBorder }}
                />
                <p className='mt-2 text-sm' style={{ color: colors.neutral }}>
                  Leave this blank if `pg_dump`, `pg_restore`, and `psql` are
                  already available in PATH. Built-in logical backups can still
                  run when those tools are missing.
                </p>
              </div>

              <div className='mt-6 flex flex-wrap gap-3'>
                <button
                  type='button'
                  onClick={saveSchedule}
                  disabled={saveDisabled}
                  className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-white transition disabled:opacity-60'
                  style={{ backgroundColor: colors.primary }}
                >
                  {saving ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Save className='w-4 h-4' />
                  )}
                  Save Schedule
                </button>
              </div>
            </section>

            <section className='space-y-6'>
              <div
                className='rounded-3xl border bg-white p-6 shadow-sm'
                style={{ borderColor: `${colors.primary}15` }}
              >
                <h2
                  className='text-xl font-semibold mb-4'
                  style={{ color: colors.primary }}
                >
                  Backup Tool Status
                </h2>
                <div
                  className='rounded-2xl border px-4 py-4'
                  style={{
                    backgroundColor: dashboard?.tooling.available
                      ? `${colors.success}12`
                      : `${colors.warning}12`,
                    borderColor: dashboard?.tooling.available
                      ? `${colors.success}30`
                      : `${colors.warning}30`,
                  }}
                >
                  <p
                    className='font-semibold'
                    style={{
                      color: dashboard?.tooling.available
                        ? colors.success
                        : colors.warning,
                    }}
                  >
                    {dashboard?.tooling.message}
                  </p>
                  <div
                    className='mt-3 text-sm space-y-1'
                    style={{ color: colors.neutralDark }}
                  >
                    <p>
                      Mode:{" "}
                      {dashboard?.tooling.mode === "logical"
                        ? "Built-in logical backup"
                        : "PostgreSQL native tools"}
                    </p>
                    <p>
                      Storage:{" "}
                      {dashboard?.tooling.storageMode === "database"
                        ? "Database-backed"
                        : "Filesystem"}
                    </p>
                    <p>
                      pg_dump:{" "}
                      {dashboard?.tooling.pgDumpAvailable
                        ? "Available"
                        : "Missing"}
                    </p>
                    <p>
                      pg_restore:{" "}
                      {dashboard?.tooling.pgRestoreAvailable
                        ? "Available"
                        : "Missing"}
                    </p>
                    <p>
                      Built-in restore:{" "}
                      {dashboard?.tooling.logicalRestoreAvailable
                        ? "Available"
                        : "Unavailable"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className='rounded-3xl border bg-white p-6 shadow-sm'
                style={{ borderColor: `${colors.primary}15` }}
              >
                <h2
                  className='text-xl font-semibold mb-4'
                  style={{ color: colors.primary }}
                >
                  Scheduler Activity
                </h2>
                <div
                  className='space-y-3 text-sm'
                  style={{ color: colors.neutralDark }}
                >
                  <p>{dashboard?.scheduler?.message}</p>
                  <p>
                    Last run:{" "}
                    <span className='font-semibold'>
                      {formatDateTime(settings.lastRunAt)}
                    </span>
                  </p>
                  <p>
                    Last status:{" "}
                    <span className='font-semibold uppercase'>
                      {settings.lastStatus}
                    </span>
                  </p>
                  <p>
                    Last message:{" "}
                    <span className='font-semibold'>
                      {settings.lastMessage ||
                        "No scheduled backup has run yet."}
                    </span>
                  </p>
                </div>
              </div>

              <div
                className='rounded-3xl border bg-white p-6 shadow-sm'
                style={{ borderColor: `${colors.primary}15` }}
              >
                <h2
                  className='text-xl font-semibold mb-4'
                  style={{ color: colors.primary }}
                >
                  Restore Uploaded Backup
                </h2>
                <div className='space-y-4'>
                  <input
                    type='file'
                    accept='.dump,.backup,.sql,.json'
                    onChange={(event) =>
                      setSelectedRestoreFile(event.target.files?.[0] ?? null)
                    }
                    className='block w-full text-sm'
                  />
                  <button
                    type='button'
                    onClick={restoreUploadedFile}
                    disabled={uploadingRestore || !selectedRestoreFile}
                    className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-white transition disabled:opacity-60'
                    style={{ backgroundColor: colors.danger }}
                  >
                    {uploadingRestore ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <HardDriveUpload className='w-4 h-4' />
                    )}
                    Restore Uploaded File
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section
            className='rounded-3xl border bg-white p-6 shadow-sm'
            style={{ borderColor: `${colors.primary}15` }}
          >
            <div className='flex items-center justify-between gap-4 mb-6'>
              <div>
                <h2
                  className='text-xl font-semibold'
                  style={{ color: colors.primary }}
                >
                  Backup Files
                </h2>
                <p className='text-sm mt-1' style={{ color: colors.neutral }}>
                  Download an existing backup or restore the database from one
                  of these files.
                </p>
              </div>
              <div
                className='text-sm font-medium'
                style={{ color: colors.neutralDark }}
              >
                {backups.length} file{backups.length === 1 ? "" : "s"}
              </div>
            </div>

            {backups.length === 0 ? (
              <div
                className='rounded-2xl border border-dashed px-6 py-10 text-center'
                style={{ borderColor: colors.neutralBorder }}
              >
                <p className='font-medium' style={{ color: colors.primary }}>
                  No backup files available.
                </p>
                <p className='text-sm mt-2' style={{ color: colors.neutral }}>
                  Create a manual backup or enable the schedule to start
                  generating files.
                </p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table
                  className='min-w-full divide-y'
                  style={{ borderColor: colors.neutralBorder }}
                >
                  <thead>
                    <tr
                      className='text-left text-sm'
                      style={{ color: colors.neutral }}
                    >
                      <th className='pb-3 pr-4 font-semibold'>File</th>
                      <th className='pb-3 pr-4 font-semibold'>Created</th>
                      <th className='pb-3 pr-4 font-semibold'>Size</th>
                      <th className='pb-3 pr-4 font-semibold'>Source</th>
                      <th className='pb-3 text-right font-semibold'>Actions</th>
                    </tr>
                  </thead>
                  <tbody
                    className='divide-y'
                    style={{ borderColor: colors.neutralBorder }}
                  >
                    {backups.map((backup) => {
                      const isRestoring = restoringName === backup.name;

                      return (
                        <tr key={backup.name}>
                          <td className='py-4 pr-4'>
                            <p
                              className='font-semibold break-all'
                              style={{ color: colors.primary }}
                            >
                              {backup.name}
                            </p>
                          </td>
                          <td
                            className='py-4 pr-4 text-sm'
                            style={{ color: colors.neutralDark }}
                          >
                            {formatDateTime(backup.createdAt)}
                          </td>
                          <td
                            className='py-4 pr-4 text-sm'
                            style={{ color: colors.neutralDark }}
                          >
                            {formatSize(backup.sizeBytes)}
                          </td>
                          <td
                            className='py-4 pr-4 text-sm capitalize'
                            style={{ color: colors.neutralDark }}
                          >
                            {backup.source}
                          </td>
                          <td className='py-4 text-right'>
                            <div className='flex justify-end gap-2'>
                              <a
                                href={`/api/backups/download?file=${encodeURIComponent(backup.name)}`}
                                className='inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition'
                                style={{
                                  backgroundColor: `${colors.info}12`,
                                  color: colors.info,
                                }}
                              >
                                <Download className='w-4 h-4' />
                                Download
                              </a>
                              <button
                                type='button'
                                onClick={() => void restoreBackup(backup.name)}
                                disabled={isRestoring}
                                className='inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white transition disabled:opacity-60'
                                style={{ backgroundColor: colors.danger }}
                              >
                                {isRestoring ? (
                                  <Loader2 className='w-4 h-4 animate-spin' />
                                ) : (
                                  <RotateCcw className='w-4 h-4' />
                                )}
                                Restore
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default BackupManagement;
