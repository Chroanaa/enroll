import "server-only";

import os from "os";
import { spawn } from "child_process";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";

import { prisma } from "@/app/lib/prisma";

const BACKUP_FILE_EXTENSIONS = new Set([".dump", ".backup", ".sql", ".json"]);
const DEFAULT_BACKUP_DIRECTORY = path.join(process.cwd(), "backups");
const SERVERLESS_TEMP_BACKUP_DIRECTORY = path.join(
  os.tmpdir(),
  "enroll-backups",
);
const BACKUP_ARTIFACT_TABLE = "backup_artifacts";
const SCHEDULE_CHECK_INTERVAL_MS = 60 * 1000;
const DEFAULT_RETENTION_COUNT = 10;
const LOGICAL_BACKUP_FORMAT = "enroll-logical-backup";
const LOGICAL_BACKUP_VERSION = 1;

type BackupFrequency = "daily" | "weekly";
type BackupStatus = "idle" | "success" | "failed";
type BackupSource = "manual" | "scheduled";
type BackupStorageMode = "filesystem" | "database";
type BackupEngine = "native" | "logical";
type BackupSchedulerMode = "persistent-process" | "serverless-best-effort";

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

type SerializedBackupValue =
  | null
  | boolean
  | number
  | string
  | SerializedBackupValue[]
  | { __type: "bytea"; base64: string }
  | { [key: string]: SerializedBackupValue };

interface BackupSettingDefinition {
  key: BackupSettingKey;
  value: string;
  description: string;
}

interface BackupArtifactRow {
  id: number;
  name: string;
  format: string;
  source: BackupSource;
  sizeBytes: number;
  content?: string;
  createdAt: Date | string;
}

interface BackupTableMetadata {
  name: string;
  columns: BackupColumnMetadata[];
  primaryKeyColumns: string[];
}

interface BackupColumnMetadata {
  name: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  sequenceName: string | null;
}

interface LogicalBackupTable {
  name: string;
  columns: BackupColumnMetadata[];
  rows: Record<string, SerializedBackupValue>[];
}

interface LogicalBackupPayload {
  format: typeof LOGICAL_BACKUP_FORMAT;
  version: typeof LOGICAL_BACKUP_VERSION;
  generatedAt: string;
  source: BackupSource;
  tables: LogicalBackupTable[];
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
  logicalBackupAvailable: boolean;
  logicalRestoreAvailable: boolean;
  mode: BackupEngine;
  storageMode: BackupStorageMode;
  message: string;
}

export interface BackupSchedulerStatus {
  mode: BackupSchedulerMode;
  reliable: boolean;
  message: string;
}

export interface BackupDashboardData {
  storagePath: string;
  storageMode: BackupStorageMode;
  backups: BackupFileSummary[];
  settings: BackupSettings;
  tooling: BackupToolStatus;
  nextRunAt: string | null;
  scheduler: BackupSchedulerStatus;
}

declare global {
  var __enrollBackupSchedulerStarted: boolean | undefined;
  var __enrollBackupSchedulerInterval: NodeJS.Timeout | undefined;
  var __enrollBackupSchedulerRunning: boolean | undefined;
}

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV,
  );
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

function qualifiedPublicTable(tableName: string) {
  return `public.${quoteIdentifier(tableName)}`;
}

function escapeSqlStringLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function isByteaBackupValue(
  value: SerializedBackupValue,
): value is { __type: "bytea"; base64: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "__type" in value &&
    value.__type === "bytea" &&
    typeof (value as { base64?: unknown }).base64 === "string"
  );
}

function normalizeStorageMode(
  value?: string | null,
): BackupStorageMode | "auto" {
  if (value === "filesystem" || value === "database") {
    return value;
  }

  return "auto";
}

function getBackupStorageMode(): BackupStorageMode {
  const configuredMode = normalizeStorageMode(process.env.BACKUP_STORAGE_MODE);
  if (configuredMode !== "auto") {
    return configuredMode;
  }

  return isServerlessRuntime() ? "database" : "filesystem";
}

function getFilesystemBackupDirectory() {
  const configuredDirectory = process.env.BACKUP_DIRECTORY?.trim();
  if (configuredDirectory) {
    return path.resolve(configuredDirectory);
  }

  return isServerlessRuntime()
    ? SERVERLESS_TEMP_BACKUP_DIRECTORY
    : DEFAULT_BACKUP_DIRECTORY;
}

async function ensureFilesystemBackupDirectory() {
  const backupDirectory = getFilesystemBackupDirectory();
  await mkdir(backupDirectory, { recursive: true });
  return backupDirectory;
}

function getBackupStorageDescription(storageMode: BackupStorageMode) {
  return storageMode === "database"
    ? `Database-backed storage (public.${BACKUP_ARTIFACT_TABLE})`
    : getFilesystemBackupDirectory();
}

function getBackupSchedulerStatus(): BackupSchedulerStatus {
  if (isServerlessRuntime()) {
    return {
      mode: "serverless-best-effort",
      reliable: false,
      message:
        "Automatic backups in serverless production need an external cron trigger. The built-in scheduler only runs while a function instance is warm.",
    };
  }

  return {
    mode: "persistent-process",
    reliable: true,
    message:
      "Automatic backups run while the application server process is active.",
  };
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

function createBackupFileName(source: BackupSource, engine: BackupEngine) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const extension = engine === "native" ? ".sql" : ".json";
  return `backup-${source}-${timestamp}${extension}`;
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

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

async function ensureBackupArtifactsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${qualifiedPublicTable(BACKUP_ARTIFACT_TABLE)} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      format VARCHAR(50) NOT NULL,
      source VARCHAR(20) NOT NULL,
      size_bytes INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP(6) NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS ${quoteIdentifier("idx_backup_artifacts_created_at")}
    ON ${qualifiedPublicTable(BACKUP_ARTIFACT_TABLE)} (created_at DESC)
  `);
}

function chooseBackupEngine(
  storageMode: BackupStorageMode,
  pgDumpAvailable: boolean,
  pgRestoreAvailable: boolean,
  logicalBackupAvailable: boolean,
  logicalRestoreAvailable: boolean,
): BackupEngine {
  if (
    storageMode === "filesystem" &&
    pgDumpAvailable &&
    pgRestoreAvailable
  ) {
    return "native";
  }

  if (logicalBackupAvailable && logicalRestoreAvailable) {
    return "logical";
  }

  return "native";
}

export async function getBackupToolStatus(): Promise<BackupToolStatus> {
  const settings = await getBackupSettings();
  const storageMode = getBackupStorageMode();
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

  const logicalBackupAvailable = Boolean(process.env.DATABASE_URL);
  const logicalRestoreAvailable = logicalBackupAvailable;
  const mode = chooseBackupEngine(
    storageMode,
    pgDumpAvailable,
    pgRestoreAvailable,
    logicalBackupAvailable,
    logicalRestoreAvailable,
  );

  if (mode === "native" && pgDumpAvailable && pgRestoreAvailable) {
    return {
      available: true,
      pgDumpAvailable,
      pgRestoreAvailable,
      logicalBackupAvailable,
      logicalRestoreAvailable,
      mode,
      storageMode,
      message: "Using PostgreSQL native backup tools.",
    };
  }

  if (logicalBackupAvailable && logicalRestoreAvailable) {
    return {
      available: true,
      pgDumpAvailable,
      pgRestoreAvailable,
      logicalBackupAvailable,
      logicalRestoreAvailable,
      mode: "logical",
      storageMode,
      message: isServerlessRuntime()
        ? "Using built-in logical backups compatible with serverless production. Native pg_dump and pg_restore are not available in this runtime."
        : "Using built-in logical backups because PostgreSQL native backup tools are not available on this server.",
    };
  }

  return {
    available: false,
    pgDumpAvailable,
    pgRestoreAvailable,
    logicalBackupAvailable,
    logicalRestoreAvailable,
    mode,
    storageMode,
    message:
      "Neither PostgreSQL native tools nor the built-in logical backup engine are available. Check DATABASE_URL and PostgreSQL tooling configuration.",
  };
}

interface TableNameRow {
  tableName: string;
}

interface TableDependencyRow {
  tableName: string;
  dependsOn: string;
}

interface TableColumnRow {
  tableName: string;
  columnName: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  sequenceName: string | null;
}

interface PrimaryKeyRow {
  tableName: string;
  columnName: string;
  position: number;
}

function sortTablesByDependencies(
  tableNames: string[],
  dependencies: TableDependencyRow[],
) {
  const dependencyMap = new Map<string, Set<string>>();
  const reverseDependencyMap = new Map<string, Set<string>>();

  for (const tableName of tableNames) {
    dependencyMap.set(tableName, new Set());
    reverseDependencyMap.set(tableName, new Set());
  }

  for (const dependency of dependencies) {
    if (
      dependency.tableName === dependency.dependsOn ||
      !dependencyMap.has(dependency.tableName) ||
      !dependencyMap.has(dependency.dependsOn)
    ) {
      continue;
    }

    dependencyMap.get(dependency.tableName)?.add(dependency.dependsOn);
    reverseDependencyMap.get(dependency.dependsOn)?.add(dependency.tableName);
  }

  const ready = tableNames
    .filter((tableName) => (dependencyMap.get(tableName)?.size ?? 0) === 0)
    .sort((left, right) => left.localeCompare(right));
  const sorted: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift();
    if (!current) {
      break;
    }

    sorted.push(current);

    const dependents = Array.from(reverseDependencyMap.get(current) ?? []).sort(
      (left, right) => left.localeCompare(right),
    );
    for (const dependent of dependents) {
      const currentDependencies = dependencyMap.get(dependent);
      if (!currentDependencies) {
        continue;
      }

      currentDependencies.delete(current);
      if (currentDependencies.size === 0 && !sorted.includes(dependent)) {
        ready.push(dependent);
        ready.sort((left, right) => left.localeCompare(right));
      }
    }
  }

  if (sorted.length === tableNames.length) {
    return sorted;
  }

  const remaining = tableNames
    .filter((tableName) => !sorted.includes(tableName))
    .sort((left, right) => left.localeCompare(right));
  return [...sorted, ...remaining];
}

async function getBackupTableMetadata(): Promise<BackupTableMetadata[]> {
  const [tableRows, dependencyRows, columnRows, primaryKeyRows] =
    await Promise.all([
      prisma.$queryRawUnsafe<TableNameRow[]>(`
        SELECT table_name AS "tableName"
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name <> '${BACKUP_ARTIFACT_TABLE}'
        ORDER BY table_name
      `),
      prisma.$queryRawUnsafe<TableDependencyRow[]>(`
        SELECT
          child.relname AS "tableName",
          parent.relname AS "dependsOn"
        FROM pg_constraint constraint_row
        JOIN pg_class child ON child.oid = constraint_row.conrelid
        JOIN pg_namespace child_namespace ON child_namespace.oid = child.relnamespace
        JOIN pg_class parent ON parent.oid = constraint_row.confrelid
        JOIN pg_namespace parent_namespace ON parent_namespace.oid = parent.relnamespace
        WHERE constraint_row.contype = 'f'
          AND child_namespace.nspname = 'public'
          AND parent_namespace.nspname = 'public'
          AND child.relname <> '${BACKUP_ARTIFACT_TABLE}'
          AND parent.relname <> '${BACKUP_ARTIFACT_TABLE}'
      `),
      prisma.$queryRawUnsafe<TableColumnRow[]>(`
        SELECT
          columns.table_name AS "tableName",
          columns.column_name AS "columnName",
          columns.data_type AS "dataType",
          columns.udt_name AS "udtName",
          (columns.is_nullable = 'YES') AS "isNullable",
          pg_get_serial_sequence(
            format('%I.%I', columns.table_schema, columns.table_name),
            columns.column_name
          ) AS "sequenceName"
        FROM information_schema.columns AS columns
        WHERE columns.table_schema = 'public'
          AND columns.table_name <> '${BACKUP_ARTIFACT_TABLE}'
        ORDER BY columns.table_name, columns.ordinal_position
      `),
      prisma.$queryRawUnsafe<PrimaryKeyRow[]>(`
        SELECT
          table_row.relname AS "tableName",
          attribute.attname AS "columnName",
          key_column.ordinality AS "position"
        FROM pg_index AS index_row
        JOIN pg_class AS table_row ON table_row.oid = index_row.indrelid
        JOIN pg_namespace AS namespace_row ON namespace_row.oid = table_row.relnamespace
        JOIN unnest(index_row.indkey) WITH ORDINALITY AS key_column(attnum, ordinality) ON TRUE
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = table_row.oid
         AND attribute.attnum = key_column.attnum
        WHERE namespace_row.nspname = 'public'
          AND index_row.indisprimary
          AND table_row.relname <> '${BACKUP_ARTIFACT_TABLE}'
        ORDER BY table_row.relname, key_column.ordinality
      `),
    ]);

  const orderedTableNames = sortTablesByDependencies(
    tableRows.map((row) => row.tableName),
    dependencyRows,
  );
  const columnsByTable = new Map<string, BackupColumnMetadata[]>();
  const primaryKeysByTable = new Map<string, string[]>();

  for (const columnRow of columnRows) {
    const existingColumns = columnsByTable.get(columnRow.tableName) ?? [];
    existingColumns.push({
      name: columnRow.columnName,
      dataType: columnRow.dataType,
      udtName: columnRow.udtName,
      isNullable: columnRow.isNullable,
      sequenceName: columnRow.sequenceName,
    });
    columnsByTable.set(columnRow.tableName, existingColumns);
  }

  for (const primaryKeyRow of primaryKeyRows) {
    const existingPrimaryKeys = primaryKeysByTable.get(primaryKeyRow.tableName) ?? [];
    existingPrimaryKeys.push(primaryKeyRow.columnName);
    primaryKeysByTable.set(primaryKeyRow.tableName, existingPrimaryKeys);
  }

  return orderedTableNames.map((tableName) => ({
    name: tableName,
    columns: columnsByTable.get(tableName) ?? [],
    primaryKeyColumns: primaryKeysByTable.get(tableName) ?? [],
  }));
}

async function fetchTableRows(metadata: BackupTableMetadata) {
  const orderByClause =
    metadata.primaryKeyColumns.length > 0
      ? ` ORDER BY ${metadata.primaryKeyColumns.map((columnName) => quoteIdentifier(columnName)).join(", ")}`
      : "";

  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${qualifiedPublicTable(metadata.name)}${orderByClause}`,
  );
}

function isDecimalLike(value: unknown): value is { toString(): string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toString?: unknown }).toString === "function" &&
    (value as { constructor?: { name?: string } }).constructor?.name ===
      "Decimal"
  );
}

function isNumericColumn(column: BackupColumnMetadata) {
  return new Set([
    "int2",
    "int4",
    "int8",
    "float4",
    "float8",
    "numeric",
  ]).has(column.udtName);
}

function isDateColumn(column: BackupColumnMetadata) {
  return column.udtName === "date";
}

function isTimestampColumn(column: BackupColumnMetadata) {
  return column.udtName === "timestamp" || column.udtName === "timestamptz";
}

function serializeJsonLikeValue(
  value: unknown,
): SerializedBackupValue | { [key: string]: SerializedBackupValue } {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeJsonLikeValue(item));
  }

  if (typeof value === "object") {
    const serializedObject: Record<string, SerializedBackupValue> = {};
    for (const [key, innerValue] of Object.entries(value)) {
      serializedObject[key] = serializeJsonLikeValue(innerValue);
    }
    return serializedObject;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return value as SerializedBackupValue;
}

function serializeBackupValue(
  value: unknown,
  column: BackupColumnMetadata,
): SerializedBackupValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      item instanceof Date
        ? item.toISOString()
        : typeof item === "bigint"
          ? item.toString()
          : isDecimalLike(item)
            ? item.toString()
            : (item as SerializedBackupValue),
    );
  }

  if (value instanceof Date) {
    if (isDateColumn(column)) {
      return value.toISOString().slice(0, 10);
    }

    return value.toISOString();
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      __type: "bytea",
      base64: Buffer.from(value).toString("base64"),
    };
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (isDecimalLike(value) || (isNumericColumn(column) && typeof value === "string")) {
    return value.toString();
  }

  if (column.udtName === "json" || column.udtName === "jsonb") {
    return serializeJsonLikeValue(value);
  }

  return value as SerializedBackupValue;
}

async function createLogicalBackupPayload(
  source: BackupSource,
): Promise<LogicalBackupPayload> {
  const tableMetadata = await getBackupTableMetadata();
  const tables: LogicalBackupTable[] = [];

  for (const metadata of tableMetadata) {
    const rows = await fetchTableRows(metadata);
    tables.push({
      name: metadata.name,
      columns: metadata.columns,
      rows: rows.map((row) => {
        const serializedRow: Record<string, SerializedBackupValue> = {};
        for (const column of metadata.columns) {
          serializedRow[column.name] = serializeBackupValue(
            row[column.name],
            column,
          );
        }
        return serializedRow;
      }),
    });
  }

  return {
    format: LOGICAL_BACKUP_FORMAT,
    version: LOGICAL_BACKUP_VERSION,
    generatedAt: new Date().toISOString(),
    source,
    tables,
  };
}

function parseLogicalBackupPayload(content: string): LogicalBackupPayload {
  let payload: unknown;

  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as { format?: string }).format !== LOGICAL_BACKUP_FORMAT ||
    (payload as { version?: number }).version !== LOGICAL_BACKUP_VERSION ||
    !Array.isArray((payload as { tables?: unknown[] }).tables)
  ) {
    throw new Error(
      "Unsupported logical backup format. Use a backup created by this application.",
    );
  }

  return payload as LogicalBackupPayload;
}

function getColumnSignature(column: BackupColumnMetadata) {
  return `${column.name}:${column.udtName}:${column.isNullable ? "nullable" : "required"}`;
}

function getSerializablePostgresType(column: BackupColumnMetadata) {
  const udtName = column.udtName.startsWith("_")
    ? column.udtName.slice(1)
    : column.udtName;

  switch (udtName) {
    case "int2":
      return "smallint";
    case "int4":
      return "integer";
    case "int8":
      return "bigint";
    case "float4":
      return "real";
    case "float8":
      return "double precision";
    case "numeric":
      return "numeric";
    case "bool":
      return "boolean";
    case "varchar":
      return "character varying";
    case "bpchar":
      return "character";
    case "text":
      return "text";
    case "date":
      return "date";
    case "timestamp":
      return "timestamp";
    case "timestamptz":
      return "timestamptz";
    case "json":
      return "json";
    case "jsonb":
      return "jsonb";
    case "uuid":
      return "uuid";
    case "bytea":
      return "bytea";
    default:
      return column.dataType === "ARRAY"
        ? column.udtName.slice(1)
        : column.udtName;
  }
}

function getArrayCast(column: BackupColumnMetadata) {
  return `${getSerializablePostgresType(column)}[]`;
}

function formatArrayElementLiteral(
  value: SerializedBackupValue,
  column: BackupColumnMetadata,
): string {
  if (value === null) {
    return "NULL";
  }

  if (Array.isArray(value)) {
    throw new Error(`Nested arrays are not supported for ${column.name}.`);
  }

  if (typeof value === "object") {
    if (isByteaBackupValue(value)) {
      return `decode('${escapeSqlStringLiteral(value.base64)}', 'base64')`;
    }

    return `'${escapeSqlStringLiteral(JSON.stringify(value))}'`;
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (isNumericColumn(column)) {
    return value;
  }

  return `'${escapeSqlStringLiteral(String(value))}'`;
}

function formatArrayLiteral(
  value: SerializedBackupValue[],
  column: BackupColumnMetadata,
) {
  if (value.length === 0) {
    return `ARRAY[]::${getArrayCast(column)}`;
  }

  return `ARRAY[${value
    .map((item) => formatArrayElementLiteral(item, column))
    .join(", ")}]::${getArrayCast(column)}`;
}

function formatScalarLiteral(
  value: Exclude<SerializedBackupValue, SerializedBackupValue[]>,
  column: BackupColumnMetadata,
): string {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "object") {
    if (isByteaBackupValue(value)) {
      return `decode('${escapeSqlStringLiteral(value.base64)}', 'base64')`;
    }

    const serializedJson = JSON.stringify(value);
    const cast = column.udtName === "json" ? "::json" : "::jsonb";
    return `'${escapeSqlStringLiteral(serializedJson)}'${cast}`;
  }

  const serializedValue = escapeSqlStringLiteral(value);

  if (isNumericColumn(column)) {
    return value;
  }

  if (isDateColumn(column)) {
    return `'${serializedValue}'::date`;
  }

  if (isTimestampColumn(column)) {
    const cast = column.udtName === "timestamptz" ? "::timestamptz" : "::timestamp";
    return `'${serializedValue}'${cast}`;
  }

  if (column.udtName === "uuid") {
    return `'${serializedValue}'::uuid`;
  }

  return `'${serializedValue}'`;
}

function formatValueLiteral(
  value: SerializedBackupValue,
  column: BackupColumnMetadata,
): string {
  if (Array.isArray(value)) {
    return formatArrayLiteral(value, column);
  }

  return formatScalarLiteral(value, column);
}

function buildSchemaMismatchError(
  currentTables: BackupTableMetadata[],
  payloadTables: LogicalBackupTable[],
) {
  const currentTableNames = currentTables.map((table) => table.name).sort();
  const payloadTableNames = payloadTables.map((table) => table.name).sort();

  if (currentTableNames.join("|") !== payloadTableNames.join("|")) {
    return new Error(
      "Backup schema does not match the current database tables. Restore this backup in an environment with the same schema version.",
    );
  }

  const currentTableMap = new Map(currentTables.map((table) => [table.name, table]));

  for (const payloadTable of payloadTables) {
    const currentTable = currentTableMap.get(payloadTable.name);
    if (!currentTable) {
      return new Error(
        "Backup schema does not match the current database tables. Restore this backup in an environment with the same schema version.",
      );
    }

    const currentSignature = currentTable.columns
      .map((column) => getColumnSignature(column))
      .join("|");
    const payloadSignature = payloadTable.columns
      .map((column) => getColumnSignature(column))
      .join("|");

    if (currentSignature !== payloadSignature) {
      return new Error(
        `Backup schema for table "${payloadTable.name}" does not match the current database. Restore this backup in an environment with the same schema version.`,
      );
    }
  }

  return null;
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function restoreLogicalBackupPayload(payload: LogicalBackupPayload) {
  const currentTableMetadata = await getBackupTableMetadata();
  const mismatchError = buildSchemaMismatchError(
    currentTableMetadata,
    payload.tables,
  );

  if (mismatchError) {
    throw mismatchError;
  }

  const currentTableMap = new Map(
    currentTableMetadata.map((table) => [table.name, table]),
  );
  const tableList = currentTableMetadata.map((table) =>
    qualifiedPublicTable(table.name),
  );

  await prisma.$transaction(async (transaction) => {
    if (tableList.length > 0) {
      await transaction.$executeRawUnsafe(
        `TRUNCATE TABLE ${tableList.join(", ")} RESTART IDENTITY CASCADE`,
      );
    }

    for (const payloadTable of payload.tables) {
      const currentTable = currentTableMap.get(payloadTable.name);
      if (!currentTable || payloadTable.rows.length === 0) {
        continue;
      }

      const columnList = currentTable.columns
        .map((column) => quoteIdentifier(column.name))
        .join(", ");
      const rowBatches = chunkArray(payloadTable.rows, 100);

      for (const rowBatch of rowBatches) {
        const valuesSql = rowBatch
          .map((row) => {
            const rowValues = currentTable.columns.map((column) =>
              formatValueLiteral(row[column.name] ?? null, column),
            );
            return `(${rowValues.join(", ")})`;
          })
          .join(",\n");

        await transaction.$executeRawUnsafe(
          `INSERT INTO ${qualifiedPublicTable(payloadTable.name)} (${columnList}) VALUES ${valuesSql}`,
        );
      }
    }

    for (const currentTable of currentTableMetadata) {
      for (const column of currentTable.columns) {
        if (!column.sequenceName) {
          continue;
        }

        await transaction.$executeRawUnsafe(`
          SELECT pg_catalog.setval(
            '${escapeSqlStringLiteral(column.sequenceName)}',
            COALESCE(
              (SELECT MAX(${quoteIdentifier(column.name)})::bigint FROM ${qualifiedPublicTable(currentTable.name)}),
              1
            ),
            EXISTS (SELECT 1 FROM ${qualifiedPublicTable(currentTable.name)})
          )
        `);
      }
    }
  });
}

async function storeBackupArtifact(
  fileName: string,
  source: BackupSource,
  content: string,
  format: string,
) {
  await ensureBackupArtifactsTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO ${qualifiedPublicTable(BACKUP_ARTIFACT_TABLE)} (
        name,
        format,
        source,
        size_bytes,
        content
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE SET
        format = EXCLUDED.format,
        source = EXCLUDED.source,
        size_bytes = EXCLUDED.size_bytes,
        content = EXCLUDED.content,
        created_at = NOW()
    `,
    fileName,
    format,
    source,
    Buffer.byteLength(content, "utf8"),
    content,
  );
}

async function listDatabaseBackups(): Promise<BackupFileSummary[]> {
  await ensureBackupArtifactsTable();
  const rows = await prisma.$queryRawUnsafe<BackupArtifactRow[]>(`
    SELECT
      id,
      name,
      format,
      source,
      size_bytes AS "sizeBytes",
      created_at AS "createdAt"
    FROM ${qualifiedPublicTable(BACKUP_ARTIFACT_TABLE)}
    ORDER BY created_at DESC, id DESC
  `);

  return rows.map((row) => ({
    name: row.name,
    sizeBytes: Number(row.sizeBytes),
    createdAt: new Date(row.createdAt).toISOString(),
    source: row.source,
  }));
}

async function getDatabaseBackupArtifact(fileName: string) {
  await ensureBackupArtifactsTable();
  const rows = await prisma.$queryRawUnsafe<BackupArtifactRow[]>(
    `
      SELECT
        id,
        name,
        format,
        source,
        size_bytes AS "sizeBytes",
        content,
        created_at AS "createdAt"
      FROM ${qualifiedPublicTable(BACKUP_ARTIFACT_TABLE)}
      WHERE name = $1
      LIMIT 1
    `,
    path.basename(fileName),
  );

  const [row] = rows;
  if (!row || typeof row.content !== "string") {
    throw new Error("Backup file not found.");
  }

  return row;
}

async function pruneDatabaseBackups(retentionCount: number) {
  await ensureBackupArtifactsTable();
  await prisma.$executeRawUnsafe(
    `
      DELETE FROM ${qualifiedPublicTable(BACKUP_ARTIFACT_TABLE)}
      WHERE id IN (
        SELECT id
        FROM ${qualifiedPublicTable(BACKUP_ARTIFACT_TABLE)}
        ORDER BY created_at DESC, id DESC
        OFFSET $1
      )
    `,
    retentionCount,
  );
}

async function listFilesystemBackups(): Promise<BackupFileSummary[]> {
  const backupDirectory = await ensureFilesystemBackupDirectory();
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

export async function listBackups(): Promise<BackupFileSummary[]> {
  const storageMode = getBackupStorageMode();
  if (storageMode === "database") {
    return listDatabaseBackups();
  }

  return listFilesystemBackups();
}

async function pruneFilesystemBackups(retentionCount: number) {
  const backups = await listFilesystemBackups();
  const staleBackups = backups.slice(retentionCount);
  const backupDirectory = getFilesystemBackupDirectory();

  await Promise.all(
    staleBackups.map((backup) =>
      unlink(path.join(backupDirectory, backup.name)).catch(() => undefined),
    ),
  );
}

async function pruneOldBackups(
  retentionCount: number,
  storageMode: BackupStorageMode,
) {
  if (storageMode === "database") {
    await pruneDatabaseBackups(retentionCount);
    return;
  }

  await pruneFilesystemBackups(retentionCount);
}

async function createNativeDatabaseBackup(
  source: BackupSource,
  settings: BackupSettings,
) {
  const backupDirectory = await ensureFilesystemBackupDirectory();
  const fileName = createBackupFileName(source, "native");
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

  await pruneOldBackups(settings.retentionCount, "filesystem");

  const fileStats = await stat(filePath);

  return {
    name: fileName,
    sizeBytes: fileStats.size,
    createdAt: fileStats.birthtime.toISOString(),
    source,
  } satisfies BackupFileSummary;
}

async function createLogicalDatabaseBackup(
  source: BackupSource,
  storageMode: BackupStorageMode,
  retentionCount: number,
) {
  const payload = await createLogicalBackupPayload(source);
  const fileName = createBackupFileName(source, "logical");
  const content = JSON.stringify(payload, null, 2);

  if (storageMode === "database") {
    await storeBackupArtifact(
      fileName,
      source,
      content,
      `${LOGICAL_BACKUP_FORMAT}-json`,
    );
  } else {
    const backupDirectory = await ensureFilesystemBackupDirectory();
    await writeFile(path.join(backupDirectory, fileName), content, "utf8");
  }

  await pruneOldBackups(retentionCount, storageMode);

  return {
    name: fileName,
    sizeBytes: Buffer.byteLength(content, "utf8"),
    createdAt: payload.generatedAt,
    source,
  } satisfies BackupFileSummary;
}

export async function createDatabaseBackup(source: BackupSource = "manual") {
  const settings = await getBackupSettings();
  const tooling = await getBackupToolStatus();

  if (!tooling.available) {
    throw new Error(tooling.message);
  }

  if (tooling.mode === "native") {
    return createNativeDatabaseBackup(source, settings);
  }

  return createLogicalDatabaseBackup(
    source,
    tooling.storageMode,
    settings.retentionCount,
  );
}

async function getFilesystemBackupFilePath(fileName: string) {
  const sanitizedName = path.basename(fileName);
  const extension = path.extname(sanitizedName).toLowerCase();
  if (!BACKUP_FILE_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported backup file type.");
  }

  const fullPath = path.join(getFilesystemBackupDirectory(), sanitizedName);
  await stat(fullPath);
  return fullPath;
}

export async function getBackupFileContent(fileName: string) {
  const storageMode = getBackupStorageMode();
  if (storageMode === "database") {
    const backupArtifact = await getDatabaseBackupArtifact(fileName);
    return Buffer.from(backupArtifact.content ?? "", "utf8");
  }

  const fullPath = await getFilesystemBackupFilePath(fileName);
  return readFile(fullPath);
}

async function restoreNativeBackupFile(filePath: string) {
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

async function restoreLogicalBackupContent(content: string) {
  const payload = parseLogicalBackupPayload(content);
  await restoreLogicalBackupPayload(payload);
}

async function restoreFilesystemBackup(fileName: string) {
  const filePath = await getFilesystemBackupFilePath(fileName);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".json") {
    await restoreLogicalBackupContent(await readFile(filePath, "utf8"));
    return;
  }

  const tooling = await getBackupToolStatus();
  if (tooling.mode !== "native") {
    throw new Error(
      "Native PostgreSQL restore tools are not available in this environment. Upload or use a built-in logical JSON backup instead.",
    );
  }

  await restoreNativeBackupFile(filePath);
}

export async function restoreStoredBackup(fileName: string) {
  const storageMode = getBackupStorageMode();

  if (storageMode === "database") {
    const backupArtifact = await getDatabaseBackupArtifact(fileName);
    await restoreLogicalBackupContent(backupArtifact.content ?? "");
    return;
  }

  await restoreFilesystemBackup(fileName);
}

export async function restoreUploadedBackup(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  if (!BACKUP_FILE_EXTENSIONS.has(extension)) {
    throw new Error(
      "Unsupported backup file type. Use .dump, .backup, .sql, or .json files.",
    );
  }

  if (extension === ".json") {
    await restoreLogicalBackupContent(await file.text());
    return;
  }

  const tooling = await getBackupToolStatus();
  if (tooling.mode !== "native") {
    throw new Error(
      "This environment cannot restore pg_dump files directly. Use a built-in logical JSON backup, or restore .sql/.dump/.backup files in a local environment with pg_dump tools installed.",
    );
  }

  const backupDirectory = await ensureFilesystemBackupDirectory();
  const tempFileName = `restore-upload-${Date.now()}${extension}`;
  const tempFilePath = path.join(backupDirectory, tempFileName);

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, fileBuffer);
    await restoreNativeBackupFile(tempFilePath);
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

  if (isServerlessRuntime()) {
    return;
  }

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
    storagePath: getBackupStorageDescription(tooling.storageMode),
    storageMode: tooling.storageMode,
    backups,
    settings,
    tooling,
    nextRunAt: getNextScheduledRun(settings)?.toISOString() ?? null,
    scheduler: getBackupSchedulerStatus(),
  };
}
