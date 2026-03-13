import "server-only";

import { spawn } from "child_process";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";

import { prisma } from "@/app/lib/prisma";

const BACKUP_FILE_EXTENSIONS = new Set([".dump", ".backup", ".sql"]);
const DEFAULT_BACKUP_DIRECTORY = path.join(process.cwd(), "backups");
const SCHEDULE_CHECK_INTERVAL_MS = 60 * 1000;
const DEFAULT_RETENTION_COUNT = 10;

type BackupFrequency = "daily" | "weekly";
type BackupStatus = "idle" | "success" | "failed";
type BackupSource = "manual" | "scheduled";

type BackupSettingKey =
  | "backup_schedule_enabled"
  | "backup_schedule_frequency"
  | "backup_schedule_time"
  | "backup_schedule_day_of_week"
  | "backup_retention_count"
  | "backup_postgres_bin_path"
  | "backup_last_run_at"
  | "backup_last_status"
  | "backup_last_message";

interface BackupSettingDefinition {
  key: BackupSettingKey;
  value: string;
  description: string;
}

export interface BackupSettings {
  enabled: boolean;
  frequency: BackupFrequency;
  time: string;
  dayOfWeek: number;
  retentionCount: number;
  postgresBinPath: string;
  lastRunAt: string | null;
  lastStatus: BackupStatus;
  lastMessage: string | null;
}

export interface BackupFileSummary {
  name: string;
  sizeBytes: number;
  createdAt: string;
  source: BackupSource;
}

export interface BackupToolStatus {
  available: boolean;
  pgDumpAvailable: boolean;
  pgRestoreAvailable: boolean;
  message: string;
}

export interface BackupDashboardData {
  storagePath: string;
  backups: BackupFileSummary[];
  settings: BackupSettings;
  tooling: BackupToolStatus;
  nextRunAt: string | null;
}

declare global {
  var __enrollBackupSchedulerStarted: boolean | undefined;
  var __enrollBackupSchedulerInterval: NodeJS.Timeout | undefined;
  var __enrollBackupSchedulerRunning: boolean | undefined;
}

function getBackupDirectory() {
  return process.env.BACKUP_DIRECTORY
    ? path.resolve(process.env.BACKUP_DIRECTORY)
    : DEFAULT_BACKUP_DIRECTORY;
}

async function ensureBackupDirectory() {
  const backupDirectory = getBackupDirectory();
  await mkdir(backupDirectory, { recursive: true });
  return backupDirectory;
}

function getExecutableName(baseName: string) {
  return process.platform === "win32" ? `${baseName}.exe` : baseName;
}

function resolveExecutable(baseName: string, postgresBinPath?: string) {
  const executableName = getExecutableName(baseName);
  const configuredPath = postgresBinPath?.trim();

  if (!configuredPath) {
    return executableName;
  }

  return path.join(configuredPath, executableName);
}

function truncateSettingValue(value: string | null, maxLength: number = 255) {
  if (!value) {
    return null;
  }

  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function normalizeBoolean(value?: string | null) {
  return value === "true";
}

function normalizeFrequency(value?: string | null): BackupFrequency {
  return value === "weekly" ? "weekly" : "daily";
}

function normalizeTime(value?: string | null) {
  if (!value) {
    return "02:00";
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return "02:00";
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return "02:00";
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return "02:00";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeDayOfWeek(value?: string | null) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) {
    return parsed;
  }

  return 0;
}

function normalizeRetentionCount(value?: string | null) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
    return parsed;
  }

  return DEFAULT_RETENTION_COUNT;
}

function normalizeStatus(value?: string | null): BackupStatus {
  if (value === "success" || value === "failed") {
    return value;
  }

  return "idle";
}

function getDefaultBackupSettings(): BackupSettings {
  return {
    enabled: false,
    frequency: "daily",
    time: "02:00",
    dayOfWeek: 0,
    retentionCount: DEFAULT_RETENTION_COUNT,
    postgresBinPath: process.env.POSTGRES_BIN_DIR?.trim() ?? "",
    lastRunAt: null,
    lastStatus: "idle",
    lastMessage: null,
  };
}

function mapSettingsToDefinitions(
  settings: BackupSettings,
): BackupSettingDefinition[] {
  return [
    {
      key: "backup_schedule_enabled",
      value: String(settings.enabled),
      description: "Whether automatic database backup scheduling is enabled.",
    },
    {
      key: "backup_schedule_frequency",
      value: settings.frequency,
      description: "Automatic backup frequency: daily or weekly.",
    },
    {
      key: "backup_schedule_time",
      value: settings.time,
      description: "Automatic backup execution time in 24-hour HH:mm format.",
    },
    {
      key: "backup_schedule_day_of_week",
      value: String(settings.dayOfWeek),
      description:
        "Automatic backup execution weekday when weekly scheduling is enabled.",
    },
    {
      key: "backup_retention_count",
      value: String(settings.retentionCount),
      description:
        "How many backup files to keep before pruning the oldest backups.",
    },
    {
      key: "backup_postgres_bin_path",
      value: settings.postgresBinPath,
      description:
        "Optional PostgreSQL bin directory containing pg_dump, pg_restore, and psql.",
    },
    {
      key: "backup_last_run_at",
      value: settings.lastRunAt ?? "",
      description: "Timestamp of the last automatic backup execution.",
    },
    {
      key: "backup_last_status",
      value: settings.lastStatus,
      description: "Status of the last automatic backup execution.",
    },
    {
      key: "backup_last_message",
      value: truncateSettingValue(settings.lastMessage) ?? "",
      description:
        "Short result message from the last automatic backup execution.",
    },
  ];
}

async function upsertBackupSettings(settings: BackupSettings) {
  const definitions = mapSettingsToDefinitions(settings);

  await prisma.$transaction(
    definitions.map((definition) =>
      prisma.settings.upsert({
        where: { key: definition.key },
        update: {
          value: definition.value,
          description: definition.description,
        },
        create: {
          key: definition.key,
          value: definition.value,
          description: definition.description,
        },
      }),
    ),
  );
}

export async function getBackupSettings(): Promise<BackupSettings> {
  const defaults = getDefaultBackupSettings();
  const rows = await prisma.settings.findMany({
    where: {
      key: {
        in: mapSettingsToDefinitions(defaults).map((item) => item.key),
      },
    },
  });

  const settingsMap = new Map(rows.map((row) => [row.key, row.value]));

  return {
    enabled: normalizeBoolean(settingsMap.get("backup_schedule_enabled")),
    frequency: normalizeFrequency(settingsMap.get("backup_schedule_frequency")),
    time: normalizeTime(settingsMap.get("backup_schedule_time")),
    dayOfWeek: normalizeDayOfWeek(
      settingsMap.get("backup_schedule_day_of_week"),
    ),
    retentionCount: normalizeRetentionCount(
      settingsMap.get("backup_retention_count"),
    ),
    postgresBinPath:
      settingsMap.get("backup_postgres_bin_path")?.trim() ??
      defaults.postgresBinPath,
    lastRunAt: settingsMap.get("backup_last_run_at") || null,
    lastStatus: normalizeStatus(settingsMap.get("backup_last_status")),
    lastMessage: settingsMap.get("backup_last_message") || null,
  };
}

export async function saveBackupSettings(
  input: Partial<BackupSettings>,
): Promise<BackupSettings> {
  const current = await getBackupSettings();
  const next: BackupSettings = {
    ...current,
    enabled: input.enabled ?? current.enabled,
    frequency: input.frequency
      ? normalizeFrequency(input.frequency)
      : current.frequency,
    time: input.time ? normalizeTime(input.time) : current.time,
    dayOfWeek:
      input.dayOfWeek !== undefined
        ? normalizeDayOfWeek(String(input.dayOfWeek))
        : current.dayOfWeek,
    retentionCount:
      input.retentionCount !== undefined
        ? normalizeRetentionCount(String(input.retentionCount))
        : current.retentionCount,
    postgresBinPath:
      input.postgresBinPath !== undefined
        ? input.postgresBinPath.trim()
        : current.postgresBinPath,
    lastRunAt:
      input.lastRunAt !== undefined ? input.lastRunAt : current.lastRunAt,
    lastStatus:
      input.lastStatus !== undefined ? input.lastStatus : current.lastStatus,
    lastMessage:
      input.lastMessage !== undefined
        ? truncateSettingValue(input.lastMessage)
        : current.lastMessage,
  };

  await upsertBackupSettings(next);

  return next;
}

function inferBackupSource(fileName: string): BackupSource {
  return fileName.includes("scheduled") ? "scheduled" : "manual";
}

function createBackupFileName(source: BackupSource) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `backup-${source}-${timestamp}.sql`;
}

async function runCommand(
  executable: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      env: process.env,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to start ${path.basename(executable)}. ${error.message}`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const message =
        stderr.trim() || stdout.trim() || `Command exited with code ${code}.`;
      reject(new Error(message));
    });
  });
}

async function checkCommandAvailable(executable: string) {
  try {
    await runCommand(executable, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function getBackupToolStatus(): Promise<BackupToolStatus> {
  const settings = await getBackupSettings();
  const pgDumpExecutable = resolveExecutable(
    "pg_dump",
    settings.postgresBinPath,
  );
  const pgRestoreExecutable = resolveExecutable(
    "pg_restore",
    settings.postgresBinPath,
  );

  const [pgDumpAvailable, pgRestoreAvailable] = await Promise.all([
    checkCommandAvailable(pgDumpExecutable),
    checkCommandAvailable(pgRestoreExecutable),
  ]);

  if (pgDumpAvailable && pgRestoreAvailable) {
    return {
      available: true,
      pgDumpAvailable,
      pgRestoreAvailable,
      message: "PostgreSQL backup tools are available.",
    };
  }

  return {
    available: false,
    pgDumpAvailable,
    pgRestoreAvailable,
    message:
      "pg_dump and pg_restore must be installed and reachable from PATH or the configured PostgreSQL bin directory.",
  };
}

export async function listBackups(): Promise<BackupFileSummary[]> {
  const backupDirectory = await ensureBackupDirectory();
  const entries = await readdir(backupDirectory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const extension = path.extname(entry.name).toLowerCase();
        if (!BACKUP_FILE_EXTENSIONS.has(extension)) {
          return null;
        }

        const fullPath = path.join(backupDirectory, entry.name);
        const fileStats = await stat(fullPath);

        return {
          name: entry.name,
          sizeBytes: fileStats.size,
          createdAt: fileStats.birthtime.toISOString(),
          source: inferBackupSource(entry.name),
        } satisfies BackupFileSummary;
      }),
  );

  return files
    .filter((item): item is BackupFileSummary => item !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

async function pruneOldBackups(retentionCount: number) {
  const backups = await listBackups();
  const staleBackups = backups.slice(retentionCount);
  const backupDirectory = getBackupDirectory();

  await Promise.all(
    staleBackups.map((backup) =>
      unlink(path.join(backupDirectory, backup.name)).catch(() => undefined),
    ),
  );
}

export async function createDatabaseBackup(source: BackupSource = "manual") {
  const settings = await getBackupSettings();
  const backupDirectory = await ensureBackupDirectory();
  const fileName = createBackupFileName(source);
  const filePath = path.join(backupDirectory, fileName);
  const pgDumpExecutable = resolveExecutable(
    "pg_dump",
    settings.postgresBinPath,
  );

  await runCommand(pgDumpExecutable, [
    "--format=plain",
    "--no-owner",
    "--no-privileges",
    `--file=${filePath}`,
    `--dbname=${getDatabaseUrl()}`,
  ]);

  await pruneOldBackups(settings.retentionCount);

  const fileStats = await stat(filePath);

  return {
    name: fileName,
    sizeBytes: fileStats.size,
    createdAt: fileStats.birthtime.toISOString(),
    source,
  } satisfies BackupFileSummary;
}

async function getBackupFilePath(fileName: string) {
  const sanitizedName = path.basename(fileName);
  const extension = path.extname(sanitizedName).toLowerCase();
  if (!BACKUP_FILE_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported backup file type.");
  }

  const fullPath = path.join(getBackupDirectory(), sanitizedName);
  await stat(fullPath);
  return fullPath;
}

export async function getBackupFileContent(fileName: string) {
  const fullPath = await getBackupFilePath(fileName);
  return readFile(fullPath);
}

async function restoreBackupFile(filePath: string) {
  const settings = await getBackupSettings();
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".sql") {
    const psqlExecutable = resolveExecutable("psql", settings.postgresBinPath);
    await runCommand(psqlExecutable, [
      `--dbname=${getDatabaseUrl()}`,
      `--file=${filePath}`,
      "--single-transaction",
      "--set=ON_ERROR_STOP=1",
    ]);
    return;
  }

  const pgRestoreExecutable = resolveExecutable(
    "pg_restore",
    settings.postgresBinPath,
  );

  await runCommand(pgRestoreExecutable, [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    `--dbname=${getDatabaseUrl()}`,
    filePath,
  ]);
}

export async function restoreStoredBackup(fileName: string) {
  const filePath = await getBackupFilePath(fileName);
  await restoreBackupFile(filePath);
}

export async function restoreUploadedBackup(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  if (!BACKUP_FILE_EXTENSIONS.has(extension)) {
    throw new Error(
      "Unsupported backup file type. Use .dump, .backup, or .sql files.",
    );
  }

  const backupDirectory = await ensureBackupDirectory();
  const tempFileName = `restore-upload-${Date.now()}${extension}`;
  const tempFilePath = path.join(backupDirectory, tempFileName);

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, fileBuffer);
    await restoreBackupFile(tempFilePath);
  } finally {
    await unlink(tempFilePath).catch(() => undefined);
  }
}

function getMostRecentScheduledRun(now: Date, settings: BackupSettings) {
  const [hours, minutes] = settings.time.split(":").map(Number);
  const scheduledRun = new Date(now);
  scheduledRun.setSeconds(0, 0);
  scheduledRun.setHours(hours, minutes, 0, 0);

  if (settings.frequency === "daily") {
    if (scheduledRun > now) {
      scheduledRun.setDate(scheduledRun.getDate() - 1);
    }
    return scheduledRun;
  }

  const dayDifference = (now.getDay() - settings.dayOfWeek + 7) % 7;
  scheduledRun.setDate(scheduledRun.getDate() - dayDifference);

  if (scheduledRun > now) {
    scheduledRun.setDate(scheduledRun.getDate() - 7);
  }

  return scheduledRun;
}

export function getNextScheduledRun(
  settings: BackupSettings,
  referenceDate: Date = new Date(),
) {
  if (!settings.enabled) {
    return null;
  }

  const lastScheduledRun = getMostRecentScheduledRun(referenceDate, settings);
  const nextRun = new Date(lastScheduledRun);

  if (settings.frequency === "daily") {
    nextRun.setDate(nextRun.getDate() + 1);
  } else {
    nextRun.setDate(nextRun.getDate() + 7);
  }

  if (nextRun <= referenceDate) {
    if (settings.frequency === "daily") {
      nextRun.setDate(nextRun.getDate() + 1);
    } else {
      nextRun.setDate(nextRun.getDate() + 7);
    }
  }

  return nextRun;
}

export async function processScheduledBackup() {
  if (globalThis.__enrollBackupSchedulerRunning) {
    return { skipped: true as const };
  }

  globalThis.__enrollBackupSchedulerRunning = true;

  try {
    const settings = await getBackupSettings();
    if (!settings.enabled) {
      return { skipped: true as const };
    }

    const now = new Date();
    const mostRecentScheduledRun = getMostRecentScheduledRun(now, settings);
    const lastRun = settings.lastRunAt ? new Date(settings.lastRunAt) : null;

    if (mostRecentScheduledRun > now) {
      return { skipped: true as const };
    }

    if (lastRun && lastRun >= mostRecentScheduledRun) {
      return { skipped: true as const };
    }

    try {
      const backup = await createDatabaseBackup("scheduled");
      await saveBackupSettings({
        lastRunAt: new Date().toISOString(),
        lastStatus: "success",
        lastMessage: `Scheduled backup completed: ${backup.name}`,
      });
      return { skipped: false as const, backup };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scheduled backup failed.";
      await saveBackupSettings({
        lastRunAt: new Date().toISOString(),
        lastStatus: "failed",
        lastMessage: truncateSettingValue(message),
      });
      throw error;
    }
  } finally {
    globalThis.__enrollBackupSchedulerRunning = false;
  }
}

export function ensureBackupSchedulerStarted() {
  if (globalThis.__enrollBackupSchedulerStarted) {
    return;
  }

  globalThis.__enrollBackupSchedulerStarted = true;
  globalThis.__enrollBackupSchedulerInterval = setInterval(() => {
    void processScheduledBackup().catch((error) => {
      console.error("Scheduled backup processing failed:", error);
    });
  }, SCHEDULE_CHECK_INTERVAL_MS);

  globalThis.__enrollBackupSchedulerInterval?.unref?.();
}

export async function getBackupDashboardData(): Promise<BackupDashboardData> {
  const [settings, backups, tooling] = await Promise.all([
    getBackupSettings(),
    listBackups(),
    getBackupToolStatus(),
  ]);

  return {
    storagePath: getBackupDirectory(),
    backups,
    settings,
    tooling,
    nextRunAt: getNextScheduledRun(settings)?.toISOString() ?? null,
  };
}
