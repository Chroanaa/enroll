import { NextRequest, NextResponse } from "next/server";

import { getBackupFileContent } from "@/app/lib/backup";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const fileName = request.nextUrl.searchParams.get("file");
  if (!fileName) {
    return NextResponse.json(
      { error: "Backup file is required." },
      { status: 400 },
    );
  }

  try {
    const fileContent = await getBackupFileContent(fileName);
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download backup.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
