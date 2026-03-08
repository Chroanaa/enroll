import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

/**
 * GET /api/enrollment-forecast
 *
 * Returns enrollment counts grouped by program code and academic year.
 * Used by the forecasting model (create_model.py) to train linear regression.
 *
 * Response format:
 * [
 *   { "course": "BSIT", "year": 2024, "total_students": 120 },
 *   ...
 * ]
 */
export async function GET(request: NextRequest) {
  try {
    // Query enrollment counts grouped by program and academic year
    const enrollments = await prisma.enrollment.findMany({
      where: {
        course_program: { not: null },
        academic_year: { not: null },
      },
      select: {
        course_program: true,
        academic_year: true,
      },
    });

    // Get all programs for code lookup
    const programs = await prisma.program.findMany({
      select: { id: true, code: true },
    });
    const programMap = new Map(programs.map((p) => [p.id.toString(), p.code]));

    // Group and count: { "BSIT|2024-2025": count }
    const counts: Record<string, number> = {};
    for (const e of enrollments) {
      const programCode =
        programMap.get(e.course_program!) || e.course_program!;
      // Extract the start year from academic_year (e.g., "2024-2025" -> 2024)
      const yearStr = e.academic_year!;
      const startYear = parseInt(yearStr.split("-")[0]);
      if (isNaN(startYear)) continue;

      const key = `${programCode}|${startYear}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    // Convert to array
    const data = Object.entries(counts).map(([key, total_students]) => {
      const [course, yearStr] = key.split("|");
      return {
        course,
        year: parseInt(yearStr),
        total_students,
      };
    });

    // Sort by course then year
    data.sort((a, b) => a.course.localeCompare(b.course) || a.year - b.year);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching enrollment forecast data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
