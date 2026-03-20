import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { ROLES } from "@/app/lib/rbac";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";

const FORECAST_API_URL = process.env.FORECAST_API_URL;
const FORECAST_ALLOWED_ROLES = [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN];

function buildRoomRecommendation(capacity: any[], rooms: any[]) {
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === "available").length;
  const totalAvailableCapacity = rooms
    .filter((r) => r.status === "available")
    .reduce((sum, r) => sum + Number(r.capacity ?? 0), 0);

  const totalRecommendedCapacity = capacity.reduce(
    (sum, item) => sum + Number(item.new_total_capacity ?? 0),
    0,
  );
  const totalAdditionalSectionsNeeded = capacity.reduce(
    (sum, item) => sum + Number(item.additional_sections_needed ?? 0),
    0,
  );

  const averageAvailableRoomCapacity =
    availableRooms > 0
      ? Math.max(1, Math.round(totalAvailableCapacity / availableRooms))
      : 40;
  const additionalCapacityNeeded = Math.max(
    0,
    totalRecommendedCapacity - totalAvailableCapacity,
  );
  const additionalRoomsNeeded =
    additionalCapacityNeeded > 0
      ? Math.ceil(additionalCapacityNeeded / averageAvailableRoomCapacity)
      : 0;

  const roomsAreSufficient =
    additionalRoomsNeeded === 0 && totalAvailableCapacity > 0;

  return {
    rooms_are_sufficient: roomsAreSufficient,
    recommendation: roomsAreSufficient ? "ROOMS_SUFFICIENT" : "ADD_ROOMS",
    total_recommended_capacity: totalRecommendedCapacity,
    total_available_capacity: totalAvailableCapacity,
    capacity_gap: additionalCapacityNeeded,
    additional_sections_needed: totalAdditionalSectionsNeeded,
    additional_rooms_needed: additionalRoomsNeeded,
    average_available_room_capacity: averageAvailableRoomCapacity,
    message: roomsAreSufficient
      ? "Available rooms are sufficient for the projected sections and students."
      : `Additional rooms are recommended. Add at least ${additionalRoomsNeeded} room(s) to cover approximately ${additionalCapacityNeeded} more seat(s).`,
    notes:
      "This recommendation is based on available room seat capacity versus total projected section capacity.",
  };
}

// ── GET — all data the frontend and Python server need ──────────────────────
export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, FORECAST_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    // ── Students by program × academic_year (for the frontend charts) ────
    const studentsByProgram =
      scope.isDean && scope.deanDepartmentId
        ? await prisma.$queryRaw`
            SELECT
              COALESCE(p.name, e.course_program) as program,
              EXTRACT(YEAR FROM e.admission_date)::int as year,
              COUNT(*)::int as total_students
            FROM enrollment e
            LEFT JOIN program p ON
              (e.course_program ~ '^[0-9]+$' AND p.id = CAST(e.course_program AS INTEGER))
              OR e.course_program = p.code
              OR e.course_program = p.name
            WHERE e.course_program IS NOT NULL
              AND e.admission_date IS NOT NULL
              AND e.status = 1
              AND e.department = ${scope.deanDepartmentId}
            GROUP BY
              COALESCE(p.name, e.course_program),
              EXTRACT(YEAR FROM e.admission_date)::int
            ORDER BY
              COALESCE(p.name, e.course_program),
              EXTRACT(YEAR FROM e.admission_date)::int
          `
        : await prisma.$queryRaw`
            SELECT
              COALESCE(p.name, e.course_program) as program,
              EXTRACT(YEAR FROM e.admission_date)::int as year,
              COUNT(*)::int as total_students
            FROM enrollment e
            LEFT JOIN program p ON
              (e.course_program ~ '^[0-9]+$' AND p.id = CAST(e.course_program AS INTEGER))
              OR e.course_program = p.code
              OR e.course_program = p.name
            WHERE e.course_program IS NOT NULL
              AND e.admission_date IS NOT NULL
              AND e.status = 1
            GROUP BY
              COALESCE(p.name, e.course_program),
              EXTRACT(YEAR FROM e.admission_date)::int
            ORDER BY
              COALESCE(p.name, e.course_program),
              EXTRACT(YEAR FROM e.admission_date)::int
          `;

    const totalStudents = await prisma.enrollment.count({
      where:
        scope.isDean && scope.deanDepartmentId
          ? { status: 1, department: scope.deanDepartmentId }
          : { status: 1 },
    });

    const studentsByTerm =
      scope.isDean && scope.deanDepartmentId
        ? await prisma.$queryRaw`
            SELECT term, COUNT(*)::int as total_students
            FROM enrollment
            WHERE status = 1
              AND term IS NOT NULL
              AND department = ${scope.deanDepartmentId}
            GROUP BY term ORDER BY term
          `
        : await prisma.$queryRaw`
            SELECT term, COUNT(*)::int as total_students
            FROM enrollment
            WHERE status = 1 AND term IS NOT NULL
            GROUP BY term ORDER BY term
          `;

    const studentsByDepartment =
      scope.isDean && scope.deanDepartmentId
        ? await prisma.$queryRaw`
            SELECT d.name as department_name, COUNT(e.id)::int as total_students
            FROM enrollment e
            LEFT JOIN department d ON e.department = d.id
            WHERE e.status = 1
              AND e.department = ${scope.deanDepartmentId}
            GROUP BY d.name ORDER BY total_students DESC
          `
        : await prisma.$queryRaw`
            SELECT d.name as department_name, COUNT(e.id)::int as total_students
            FROM enrollment e
            LEFT JOIN department d ON e.department = d.id
            WHERE e.status = 1
            GROUP BY d.name ORDER BY total_students DESC
          `;

    // ── Enrollment counts by (program_code, admission_year) for Python ───
    const programs = await prisma.program.findMany({
      where:
        scope.isDean && scope.deanDepartmentId
          ? { department_id: scope.deanDepartmentId }
          : undefined,
      select: { id: true, code: true },
    });
    const programCodeMap = new Map(
      programs.map((p) => [p.id.toString(), p.code]),
    );

    const rawEnrollments = await prisma.enrollment.findMany({
      where: {
        course_program: { not: null },
        admission_date: { not: null },
        ...(scope.isDean && scope.deanDepartmentId
          ? { department: scope.deanDepartmentId }
          : {}),
      },
      select: {
        course_program: true,
        admission_date: true,
      },
    });

    const enrollmentCounts: Record<string, number> = {};
    for (const e of rawEnrollments) {
      const programCode =
        programCodeMap.get(e.course_program!) || e.course_program!;
      const year = new Date(e.admission_date!).getFullYear();
      if (isNaN(year)) continue;
      const key = `${programCode}|${year}`;
      enrollmentCounts[key] = (enrollmentCounts[key] || 0) + 1;
    }

    const enrollment = Object.entries(enrollmentCounts)
      .map(([key, total_students]) => {
        const [course, yearStr] = key.split("|");
        return { course, year: parseInt(yearStr), total_students };
      })
      .sort((a, b) => a.course.localeCompare(b.course) || a.year - b.year);

    // ── Rooms ────────────────────────────────────────────────────────────
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
      where:
        scope.isDean && scope.deanDepartmentId
          ? { program_id: { in: programs.map((p) => p.id) } }
          : undefined,
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

    return NextResponse.json({
      programData: studentsByProgram,
      summary: {
        totalStudents,
        totalPrograms: [
          ...new Set((studentsByProgram as any[]).map((s) => s.program)),
        ].length,
      },
      studentsByTerm,
      studentsByDepartment,
      // Data consumed by the Python forecast server
      enrollment,
      rooms,
      section_history,
    });
  } catch (error: any) {
    console.error("Error fetching student forecast data:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch student forecast data",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// ── POST — call Python forecast server for predictions + capacity ───────────
export async function POST(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, FORECAST_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      data,
      section_history: inputSectionHistory,
      rooms: inputRooms,
    } = body;

    const scopedPrograms = await prisma.program.findMany({
      where:
        scope.isDean && scope.deanDepartmentId
          ? { department_id: scope.deanDepartmentId }
          : undefined,
      select: { id: true, code: true, name: true },
    });

    const allowedProgramKeys = new Set<string>();
    for (const p of scopedPrograms) {
      if (p.code) {
        allowedProgramKeys.add(p.code.trim().toLowerCase());
      }
      if (p.name) {
        allowedProgramKeys.add(p.name.trim().toLowerCase());
      }
      allowedProgramKeys.add(String(p.id));
    }

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected { data: [...] }" },
        { status: 400 },
      );
    }

    const normalizedData =
      scope.isDean && scope.deanDepartmentId
        ? data.filter((item: any) => {
            const key = String(item.program || item.course || "")
              .trim()
              .toLowerCase();
            return key && allowedProgramKeys.has(key);
          })
        : data;

    for (const item of normalizedData) {
      // Accept "course" as alias for "program"
      if (!item.program && item.course) {
        item.program = item.course;
      }
      // Accept academic_year (from GET response) and convert to year
      if (!item.year && item.academic_year) {
        item.year = parseInt(item.academic_year.split("-")[0]);
      }
      if (!item.program || item.total_students === undefined || !item.year) {
        return NextResponse.json(
          {
            error:
              "Each data item must have program (or course), total_students, and year (or academic_year) fields",
          },
          { status: 400 },
        );
      }
    }

    if (!FORECAST_API_URL) {
      return NextResponse.json(
        { error: "Forecast API URL not configured" },
        { status: 500 },
      );
    }

    // Transform for the Python /predict endpoint (uses "course" not "program")
    const transformedData = normalizedData.map((item: any) => ({
      course: item.program,
      total_students: item.total_students,
      year: item.year,
    }));

    // Use provided section_history/rooms or fall back to DB
    let rooms = inputRooms;
    let section_history = inputSectionHistory;

    if (
      !rooms ||
      !Array.isArray(rooms) ||
      rooms.length === 0 ||
      !section_history ||
      !Array.isArray(section_history) ||
      section_history.length === 0
    ) {
      const programs = scopedPrograms.map((p) => ({ id: p.id, code: p.code }));
      const programCodeMap = new Map(
        programs.map((p) => [p.id.toString(), p.code]),
      );

      if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
        const rawRooms = await prisma.room.findMany({
          select: { id: true, capacity: true, room_type: true, status: true },
        });
        rooms = rawRooms.map((r) => ({
          room_id: r.id,
          capacity: r.capacity ?? 0,
          room_type: r.room_type ?? "lecture",
          status: r.status ?? "available",
        }));
      }

      if (
        !section_history ||
        !Array.isArray(section_history) ||
        section_history.length === 0
      ) {
        const rawSections = await prisma.sections.findMany({
          where:
            scope.isDean && scope.deanDepartmentId
              ? { program_id: { in: programs.map((p) => p.id) } }
              : undefined,
          select: {
            program_id: true,
            student_count: true,
            max_capacity: true,
            academic_year: true,
          },
        });

        type SB = {
          program: string;
          year: number;
          section_count: number;
          total_students: number;
          capacities: number[];
        };
        const sMap: Record<string, SB> = {};
        for (const s of rawSections) {
          if (!s.academic_year || !s.program_id) continue;
          const pc =
            programCodeMap.get(s.program_id.toString()) || String(s.program_id);
          const yr = parseInt(s.academic_year.split("-")[0]);
          if (isNaN(yr)) continue;
          const key = `${pc}|${yr}`;
          if (!sMap[key])
            sMap[key] = {
              program: pc,
              year: yr,
              section_count: 0,
              total_students: 0,
              capacities: [],
            };
          sMap[key].section_count++;
          sMap[key].total_students += s.student_count ?? 0;
          if (s.max_capacity) sMap[key].capacities.push(s.max_capacity);
        }

        section_history = Object.values(sMap).map((s) => ({
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
        }));
      }
    }

    // Single call to Python — returns both enrollment_predictions and capacity_recommendations
    const forecastResponse = await fetch(FORECAST_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: transformedData,
        section_history,
        rooms,
      }),
    });

    if (!forecastResponse.ok) {
      const errorText = await forecastResponse.text();
      throw new Error(`Forecast API error: ${errorText}`);
    }

    const forecastResult = await forecastResponse.json();

    // Group historical data by program
    const programGroups: Record<
      string,
      { year: number; total_students: number }[]
    > = {};
    normalizedData.forEach((item: any) => {
      if (!programGroups[item.program]) programGroups[item.program] = [];
      programGroups[item.program].push({
        year: item.year,
        total_students: item.total_students,
      });
    });
    Object.values(programGroups).forEach((d) =>
      d.sort((a, b) => a.year - b.year),
    );

    // Build a code→fullName map from the input data for resolving program codes
    const programNames = Object.keys(programGroups);
    const codeToName: Record<string, string> = {};
    programNames.forEach((name) => {
      const skip = new Set(["of", "in", "and", "the", "for"]);
      const abbr = name
        .split(" ")
        .filter((w) => !skip.has(w.toLowerCase()))
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
      if (abbr) codeToName[abbr] = name;
    });
    const resolveProgram = (code: string): string =>
      codeToName[code] || programNames.find((n) => n.includes(code)) || code;

    let rawForecast = forecastResult.enrollment_predictions;
    let rawCapacity = forecastResult.capacity_recommendations;

    // If the Python server returned the forecast array at the top level
    if (!rawForecast && Array.isArray(forecastResult)) {
      rawForecast = forecastResult;
    }

    // Normalize capacity items from whichever shape the Python server returns
    let capacity: any[] = [];
    if (rawCapacity && Array.isArray(rawCapacity) && rawCapacity.length > 0) {
      capacity = rawCapacity.map((c: any) => {
        const fullName = resolveProgram(c.program || c.course);
        const predictedStudents =
          c.predicted_students ?? c.predicted_count ?? 0;
        const currentSections = c.current_sections ?? 1;
        const sectionsNeeded =
          c.sections_needed ?? c.recommended_sections ?? currentSections;
        const sectionsToAdd =
          c.sections_to_add ??
          c.additional_sections_needed ??
          Math.max(0, sectionsNeeded - currentSections);
        const avgCap = c.avg_section_capacity ?? 40;
        const currentCapacity = c.current_capacity ?? currentSections * avgCap;
        const newTotalCapacity =
          c.total_capacity_needed ??
          c.new_total_capacity ??
          sectionsNeeded * avgCap;
        const utilizationRate =
          c.utilization_rate ??
          (newTotalCapacity > 0
            ? Math.round((predictedStudents / newTotalCapacity) * 100)
            : 0);

        return {
          program: fullName,
          predicted_year: c.predicted_year ?? null,
          predicted_students: predictedStudents,
          current_sections: currentSections,
          current_capacity: currentCapacity,
          avg_section_capacity: avgCap,
          recommended_sections: sectionsNeeded,
          additional_sections_needed: sectionsToAdd,
          add_section: sectionsToAdd > 0,
          new_total_capacity: newTotalCapacity,
          utilization_rate: utilizationRate,
          status:
            c.recommendation ??
            c.status ??
            (sectionsToAdd > 0
              ? `Add ${sectionsToAdd} section(s) — current ${currentSections} section(s) can only hold ${currentCapacity} students but ${predictedStudents} are predicted`
              : `No additional sections needed — current ${currentSections} section(s) with capacity ${currentCapacity} can accommodate ${predictedStudents} predicted students`),
        };
      });
    }

    // Build forecast from capacity when the Python server didn't return enrollment_predictions
    let forecast: any[] = [];
    if (rawForecast && Array.isArray(rawForecast) && rawForecast.length > 0) {
      forecast = rawForecast.map((f: any) => ({
        course: resolveProgram(f.course || f.program),
        predicted_year: f.predicted_year ?? null,
        predicted_count: f.predicted_count ?? f.predicted_students ?? 0,
      }));
    } else if (capacity.length > 0) {
      // Derive forecast from capacity data
      forecast = capacity.map((c: any) => ({
        course: c.program,
        predicted_year: c.predicted_year ?? null,
        predicted_count: c.predicted_students ?? 0,
      }));
    }

    // When both forecast and capacity are available, align capacity rows to the
    // predicted enrollment counts so downstream tables/summaries don't fall back
    // to stale or differently named fields from the capacity payload.
    if (capacity.length > 0 && forecast.length > 0) {
      const forecastByProgram = new Map(
        forecast.map((item: any) => [item.course, item]),
      );

      capacity = capacity.map((cap: any) => {
        const matchingForecast = forecastByProgram.get(cap.program);
        if (!matchingForecast) return cap;

        const predictedStudents =
          matchingForecast.predicted_count ?? cap.predicted_students ?? 0;
        const predictedYear =
          matchingForecast.predicted_year ?? cap.predicted_year ?? null;
        const totalCapacity = Number(cap.new_total_capacity ?? 0);
        const utilizationRate =
          totalCapacity > 0
            ? Math.round((predictedStudents / totalCapacity) * 100)
            : cap.utilization_rate ?? 0;

        return {
          ...cap,
          predicted_students: predictedStudents,
          predicted_year: predictedYear,
          utilization_rate: utilizationRate,
          status:
            cap.additional_sections_needed > 0
              ? `Add ${cap.additional_sections_needed} section(s) — current ${cap.current_sections} section(s) can only hold ${cap.current_capacity} students but ${predictedStudents} are predicted`
              : `No additional sections needed — current ${cap.current_sections} section(s) with capacity ${cap.current_capacity} can accommodate ${predictedStudents} predicted students`,
        };
      });
    }

    // Build capacity recommendations if neither the Python server nor normalization produced them
    if (capacity.length === 0 && forecast.length > 0) {
      // Build a lookup of latest section info per program
      const latestSections: Record<
        string,
        { section_count: number; avg_section_capacity: number; year: number }
      > = {};
      (section_history as any[]).forEach((sh: any) => {
        const key = resolveProgram(sh.program);
        if (!latestSections[key] || sh.year > latestSections[key].year) {
          latestSections[key] = {
            section_count: sh.section_count,
            avg_section_capacity: sh.avg_section_capacity,
            year: sh.year,
          };
        }
      });

      capacity = forecast.map((fc: any) => {
        const programName = fc.course;
        const predictedStudents = fc.predicted_count ?? 0;
        const latest = latestSections[programName];

        const currentSections = latest?.section_count ?? 1;
        const avgCapacity = latest?.avg_section_capacity ?? 40;
        const currentCapacity = currentSections * avgCapacity;

        const sectionsNeeded = Math.max(
          1,
          Math.ceil(predictedStudents / avgCapacity),
        );
        const additionalSections = Math.max(
          0,
          sectionsNeeded - currentSections,
        );
        const newTotalCapacity = sectionsNeeded * avgCapacity;
        const utilizationRate =
          newTotalCapacity > 0
            ? Math.round((predictedStudents / newTotalCapacity) * 100)
            : 0;

        return {
          program: programName,
          predicted_year: fc.predicted_year ?? null,
          predicted_students: predictedStudents,
          current_sections: currentSections,
          current_capacity: currentCapacity,
          avg_section_capacity: avgCapacity,
          recommended_sections: sectionsNeeded,
          additional_sections_needed: additionalSections,
          add_section: additionalSections > 0,
          new_total_capacity: newTotalCapacity,
          utilization_rate: utilizationRate,
          status:
            additionalSections > 0
              ? `Add ${additionalSections} section(s) — current ${currentSections} section(s) can only hold ${currentCapacity} students but ${predictedStudents} are predicted`
              : `No additional sections needed — current ${currentSections} section(s) with capacity ${currentCapacity} can accommodate ${predictedStudents} predicted students`,
        };
      });
    }

    const roomRecommendation = buildRoomRecommendation(
      capacity,
      rooms as any[],
    );

    return NextResponse.json({
      success: true,
      programs: Object.keys(programGroups),
      historical: programGroups,
      forecast,
      capacity,
      totalPrograms: Object.keys(programGroups).length,
      room_summary: {
        total_rooms: (rooms as any[]).length,
        available_rooms: (rooms as any[]).filter(
          (r: any) => r.status === "available",
        ).length,
        total_available_capacity: (rooms as any[])
          .filter((r: any) => r.status === "available")
          .reduce((sum: number, r: any) => sum + (r.capacity ?? 0), 0),
      },
      room_recommendation: roomRecommendation,
    });
  } catch (error: any) {
    console.error("Error processing forecast data:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to process forecast data",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
