import { NextRequest, NextResponse } from "next/server";

import { getBackupSettings, saveBackupSettings } from "@/app/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getBackupSettings();
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load backup settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await saveBackupSettings({
      enabled: Boolean(body.enabled),
      frequency: body.frequency,
      time: body.time,
      dayOfWeek: Number(body.dayOfWeek),
      retentionCount: Number(body.retentionCount),
      postgresBinPath:
        typeof body.postgresBinPath === "string" ? body.postgresBinPath : "",
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save backup settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
