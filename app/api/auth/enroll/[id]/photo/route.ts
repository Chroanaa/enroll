import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const enrollmentId = parseInt(id);

    if (isNaN(enrollmentId)) {
      return NextResponse.json(
        { error: "Invalid enrollment ID" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { photo: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    if (!enrollment.photo) {
      return NextResponse.json(
        { error: "No photo available" },
        { status: 404 }
      );
    }

    // Read file from filesystem
    const filePath = path.join(process.cwd(), "public", enrollment.photo);
    const fileBuffer = await readFile(filePath);

    // Determine content type from file extension
    const ext = path.extname(enrollment.photo).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const contentType = contentTypes[ext] || "image/jpeg";

    // Return the photo as an image response
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error fetching photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
