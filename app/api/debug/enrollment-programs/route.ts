import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/**
 * Debug endpoint to see what course_program values exist in the enrollment table
 * This helps diagnose filtering issues
 */
export async function GET(request: NextRequest) {
  try {
    // Get unique course_program values
    const enrollments = await prisma.enrollment.findMany({
      select: {
        course_program: true,
      },
      distinct: ["course_program"],
      take: 50, // Limit to 50 unique values
    });

    const uniquePrograms = enrollments
      .map((e) => e.course_program)
      .filter((p) => p !== null && p !== undefined);

    // Also get a sample of enrollments with their programs
    const sampleEnrollments = await prisma.enrollment.findMany({
      select: {
        student_number: true,
        first_name: true,
        family_name: true,
        course_program: true,
        year_level: true,
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      uniquePrograms,
      sampleEnrollments,
      totalUnique: uniquePrograms.length,
    });
  } catch (error) {
    console.error("Error fetching enrollment programs:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
