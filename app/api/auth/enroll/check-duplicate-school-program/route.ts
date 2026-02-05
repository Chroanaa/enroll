import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const school = searchParams.get("school");
    const program = searchParams.get("program");

    if (!school || !program) {
      return NextResponse.json(
        { error: "School and program are required" },
        { status: 400 }
      );
    }

    // Check if this school + program combination already exists in enrollments
    const existing = await prisma.enrollment.findFirst({
      where: {
        last_school_attended: {
          equals: school.trim().toUpperCase(),
          mode: "insensitive",
        },
        program_shs: {
          equals: program.trim().toUpperCase(),
          mode: "insensitive",
        },
      },
    });

    return NextResponse.json({
      isDuplicate: !!existing,
      message: existing
        ? "This school and program combination already exists."
        : "No duplicate found",
    });
  } catch (error) {
    console.error("Error checking duplicate school-program:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


