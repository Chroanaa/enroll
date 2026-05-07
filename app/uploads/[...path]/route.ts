import { NextRequest, NextResponse } from "next/server";
import { access, readFile } from "fs/promises";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function getContentType(filePath: string) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function resolveUploadPath(segments: string[]) {
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const normalizedRelativePath = path
    .normalize(path.join(...segments))
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.join(uploadsRoot, normalizedRelativePath);

  if (!absolutePath.startsWith(uploadsRoot)) {
    return null;
  }

  return absolutePath;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params;
    if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
      return NextResponse.json({ error: "File path is required." }, { status: 400 });
    }

    const filePath = resolveUploadPath(pathSegments);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });
    }

    await access(filePath);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": getContentType(filePath),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    console.error("GET upload file error:", error);
    return NextResponse.json({ error: "Failed to load file." }, { status: 500 });
  }
}
