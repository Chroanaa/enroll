import { NextResponse } from "next/server";

import {
  createDatabaseBackup,
  ensureBackupSchedulerStarted,
  getBackupDashboardData,
  processScheduledBackup,
} from "@/app/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  try {
    ensureBackupSchedulerStarted();
    await processScheduledBackup().catch(() => undefined);
    const data = await getBackupDashboardData();
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load backups.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const backup = await createDatabaseBackup("manual");
    return NextResponse.json({ data: backup }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create backup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
