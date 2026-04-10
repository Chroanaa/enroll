import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

function getSchoolYearStart(dateInput: Date | string | number): number | null {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 8 ? year : year - 1;
}

/**
 * GET /api/enrollment-forecast
 *
 * Returns enrollment counts, room inventory, and section history for
 * the Python forecast server to use when generating predictions.
 *
 * Response format:
 * {
 *   enrollment:       [{ course, year, academic_year, total_students }],
 *   rooms:            [{ room_id, room_number, capacity, room_type, status }],
 *   section_history:  [{ program, year, student_count, section_count, avg_section_capacity }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // ── Enrollment counts by school-year start (Aug-Jul) ────────────────
    const enrollments = await prisma.enrollment.findMany({
      where: {
        course_program: { not: null },
        admission_date: { not: null },
      },
      select: {
        course_program: true,
        admission_date: true,
      },
    });

    const programs = await prisma.program.findMany({
      select: { id: true, code: true },
    });
    const programCodeMap = new Map(
      programs.map((p) => [p.id.toString(), p.code]),
    );

    const enrollmentCounts: Record<string, number> = {};
    for (const e of enrollments) {
      const programCode =
        programCodeMap.get(e.course_program!) || e.course_program!;
      const year = getSchoolYearStart(e.admission_date!);
      if (year === null) continue;
      const key = `${programCode}|${year}`;
      enrollmentCounts[key] = (enrollmentCounts[key] || 0) + 1;
    }

    const enrollment = Object.entries(enrollmentCounts)
      .map(([key, total_students]) => {
        const [course, yearStr] = key.split("|");
        return {
          course,
          year: parseInt(yearStr, 10),
          academic_year: `${yearStr}-${Number(yearStr) + 1}`,
          total_students,
        };
      })
      .sort((a, b) => a.course.localeCompare(b.course) || a.year - b.year);

    // ── Rooms ─────────────────────────────────────────────────────────────
    const rawRooms = await prisma.room.findMany({
      select: {
        id: true,
        room_number: true,
        capacity: true,
        room_type: true,
        status: true,
      },
    });

    const rooms = rawRooms.map((r) => ({
      room_id: r.id,
      room_number: r.room_number,
      capacity: r.capacity ?? 0,
      room_type: r.room_type ?? "lecture",
      status: r.status ?? "available",
    }));

    // ── Section history grouped by (program_code, start_year) ────────────
    const rawSections = await prisma.sections.findMany({
      select: {
        program_id: true,
        student_count: true,
        max_capacity: true,
        academic_year: true,
      },
    });

    type SectionBucket = {
      program: string;
      year: number;
      section_count: number;
      total_students: number;
      capacities: number[];
    };
    const sectionMap: Record<string, SectionBucket> = {};

    for (const s of rawSections) {
      if (!s.academic_year || !s.program_id) continue;
      const programCode =
        programCodeMap.get(s.program_id.toString()) || String(s.program_id);
      const year = parseInt(s.academic_year.split("-")[0]);
      if (isNaN(year)) continue;

      const key = `${programCode}|${year}`;
      if (!sectionMap[key]) {
        sectionMap[key] = {
          program: programCode,
          year,
          section_count: 0,
          total_students: 0,
          capacities: [],
        };
      }
      sectionMap[key].section_count++;
      sectionMap[key].total_students += s.student_count ?? 0;
      if (s.max_capacity) sectionMap[key].capacities.push(s.max_capacity);
    }

    const section_history = Object.values(sectionMap)
      .map((s) => ({
        program: s.program,
        year: s.year,
        student_count: s.total_students,
        section_count: s.section_count,
        avg_section_capacity:
          s.capacities.length > 0
            ? Math.round(
                s.capacities.reduce((a, b) => a + b, 0) / s.capacities.length,
              )
            : 40,
      }))
      .sort((a, b) => a.program.localeCompare(b.program) || a.year - b.year);

    return NextResponse.json({ enrollment, rooms, section_history });
  } catch (error) {
    console.error("Error fetching enrollment forecast data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
