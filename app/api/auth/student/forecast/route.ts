import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

const FORECAST_API_URL = process.env.FORECAST_API_URL;

// Get student enrollment data for forecasting grouped by program and year
export async function GET(request: NextRequest) {
  try {
    // Get students grouped by program and academic year
    // Join with program table to get the program name
    // Try to match course_program as ID (cast to int), code, or name
    const studentsByProgram = await prisma.$queryRaw`
      SELECT 
        COALESCE(p.name, e.course_program) as program,
        e.academic_year,
        COUNT(*)::int as total_students
      FROM enrollment e
      LEFT JOIN program p ON 
        (e.course_program ~ '^[0-9]+$' AND p.id = CAST(e.course_program AS INTEGER))
        OR e.course_program = p.code 
        OR e.course_program = p.name
      WHERE e.course_program IS NOT NULL
        AND e.academic_year IS NOT NULL
        AND e.status = 1
      GROUP BY COALESCE(p.name, e.course_program), e.academic_year
      ORDER BY COALESCE(p.name, e.course_program), e.academic_year
    `;

    // Get total students count
    const totalStudents = await prisma.enrollment.count({
      where: {
        status: 1,
      },
    });

    // Get students by term
    const studentsByTerm = await prisma.$queryRaw`
      SELECT 
        term,
        COUNT(*)::int as total_students
      FROM enrollment
      WHERE status = 1
        AND term IS NOT NULL
      GROUP BY term
      ORDER BY term
    `;

    // Get students by department
    const studentsByDepartment = await prisma.$queryRaw`
      SELECT 
        d.name as department_name,
        COUNT(e.id)::int as total_students
      FROM enrollment e
      LEFT JOIN department d ON e.department = d.id
      WHERE e.status = 1
      GROUP BY d.name
      ORDER BY total_students DESC
    `;

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

// Call external forecast API with enrollment data
export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected { data: [...] }" },
        { status: 400 },
      );
    }

    // Validate data structure
    for (const item of data) {
      if (!item.program || item.total_students === undefined || !item.year) {
        return NextResponse.json(
          {
            error:
              "Each data item must have program, total_students, and year fields",
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

    // Transform data to use "course" instead of "program" for the external API
    const transformedData = data.map((item: any) => ({
      course: item.program,
      total_students: item.total_students,
      year: item.year,
    }));

    // Call the external forecast API
    const forecastResponse = await fetch(FORECAST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: transformedData }),
    });

    if (!forecastResponse.ok) {
      const errorText = await forecastResponse.text();
      throw new Error(`Forecast API error: ${errorText}`);
    }

    const forecastResult = await forecastResponse.json();

    // Process and return the forecast result
    // Group data by program for display purposes
    const programGroups: Record<
      string,
      { year: number; total_students: number }[]
    > = {};

    data.forEach((item: any) => {
      if (!programGroups[item.program]) {
        programGroups[item.program] = [];
      }
      programGroups[item.program].push({
        year: item.year,
        total_students: item.total_students,
      });
    });

    // Sort each program's data by year
    Object.values(programGroups).forEach((yearlyData) => {
      yearlyData.sort((a, b) => a.year - b.year);
    });

    return NextResponse.json({
      success: true,
      programs: Object.keys(programGroups),
      historical: programGroups,
      forecast: forecastResult,
      totalPrograms: Object.keys(programGroups).length,
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
