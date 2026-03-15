import { NextRequest, NextResponse } from "next/server";

import { restoreStoredBackup, restoreUploadedBackup } from "@/app/lib/backup";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const uploadedFile = formData.get("file");

      if (!(uploadedFile instanceof File)) {
        return NextResponse.json(
          { error: "Backup file is required." },
          { status: 400 },
        );
      }

      await restoreUploadedBackup(uploadedFile);
      return NextResponse.json({
        success: true,
        message: "Backup restored successfully.",
      });
    }

    const body = await request.json();
    const backupFileName =
      typeof body.backupFileName === "string" ? body.backupFileName : "";

    if (!backupFileName) {
      return NextResponse.json(
        { error: "Backup file name is required." },
        { status: 400 },
      );
    }

    await restoreStoredBackup(backupFileName);
    return NextResponse.json({
      success: true,
      message: "Backup restored successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to restore backup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
