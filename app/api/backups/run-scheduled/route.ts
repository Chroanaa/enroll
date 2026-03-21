import { NextRequest, NextResponse } from "next/server";

import { processScheduledBackup } from "@/app/lib/backup";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return true;
  }

  const authorizationHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  const querySecret = request.nextUrl.searchParams.get("secret") ?? "";

  return (
    bearerToken === configuredSecret ||
    headerSecret === configuredSecret ||
    querySecret === configuredSecret
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await processScheduledBackup();
    return NextResponse.json({ data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scheduled backup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = GET;
