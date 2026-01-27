import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const programId = searchParams.get("programId");
    const majorId = searchParams.get("majorId");

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const searchTerm = query.trim();

    // Build search conditions - use Prisma's case-insensitive search
    const whereConditions: any = {
      OR: [
        // Search by student number (exact match preferred for numbers)
        {
          student_number: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        // Search by first name
        {
          first_name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        // Search by middle name (nullable)
        {
          middle_name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        // Search by family name
        {
          family_name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        // Search by course_program (if it's a string)
        {
          course_program: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    };

    // If search term is numeric, also try exact match for course_program
    if (/^\d+$/.test(searchTerm)) {
      whereConditions.OR.push({
        course_program: searchTerm,
      });
    }

    // Build final where condition with program and major filters if provided
    let finalWhereConditions: any = whereConditions;
    const additionalFilters: any[] = [];

    // Add program filter if provided
    if (programId && programId !== "all" && programId !== "") {
      const programIdNum = parseInt(programId);
      if (!isNaN(programIdNum)) {
        // Filter by program ID - course_program can be the program ID as a string
        additionalFilters.push({
          OR: [
            { course_program: programId },
            { course_program: programIdNum.toString() },
          ],
        });
      }
    }

    // Add major filter if provided
    if (majorId && majorId !== "all" && majorId !== "") {
      const majorIdNum = parseInt(majorId);
      if (!isNaN(majorIdNum)) {
        additionalFilters.push({
          major_id: majorIdNum,
        });
      }
    }

    // Combine all filters
    if (additionalFilters.length > 0) {
      finalWhereConditions = {
        AND: [
          whereConditions,
          ...additionalFilters,
        ],
      };
    }

    // Fetch enrollments with search
    const enrollments = await prisma.enrollment.findMany({
      where: finalWhereConditions,
      take: limit,
      orderBy: [
        { admission_date: "desc" },
        { student_number: "asc" },
      ],
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
        department: true,
        term: true,
        academic_year: true,
        status: true,
        admission_date: true,
      },
    });

    // Fetch program data for each enrollment
    const results = await Promise.all(
      enrollments.map(async (enrollment) => {
        let programName = null;
        let programCode = null;

        if (enrollment.course_program) {
          const courseProgramValue = enrollment.course_program.trim();
          const isNumeric = /^\d+$/.test(courseProgramValue);

          let program = null;

          if (isNumeric) {
            // Try to find program by ID
            program = await prisma.program.findFirst({
              where: {
                id: parseInt(courseProgramValue),
              },
              select: {
                id: true,
                name: true,
                code: true,
              },
            });
          }

          // If not found by ID, try by name or code
          if (!program) {
            program = await prisma.program.findFirst({
              where: {
                OR: [
                  { name: { contains: courseProgramValue, mode: "insensitive" } },
                  { code: { contains: courseProgramValue, mode: "insensitive" } },
                ],
              },
              select: {
                id: true,
                name: true,
                code: true,
              },
            });
          }

          if (program) {
            programName = program.name;
            programCode = program.code;
          } else {
            // If no program found, use the course_program value as is
            programName = courseProgramValue;
          }
        }

        // Construct full name
        const nameParts = [
          enrollment.first_name,
          enrollment.middle_name,
          enrollment.family_name,
        ].filter(Boolean);
        const fullName = nameParts.join(" ");

        // Determine year level from term and academic_year if available
        let yearLevel = null;
        if (enrollment.term && enrollment.academic_year) {
          // This is a simplified logic - adjust based on your actual year level calculation
          yearLevel = enrollment.term;
        }

        // Map status number to status string
        let statusText = null;
        if (enrollment.status !== null) {
          const statusMap: Record<number, string> = {
            1: "Active",
            2: "Inactive",
            3: "Graduated",
            4: "Pending",
          };
          statusText = statusMap[enrollment.status] || `Status ${enrollment.status}`;
        }

        return {
          id: enrollment.id,
          student_number: enrollment.student_number,
          full_name: fullName,
          first_name: enrollment.first_name,
          middle_name: enrollment.middle_name,
          last_name: enrollment.family_name,
          course_program: programName || enrollment.course_program,
          program_code: programCode,
          year_level: yearLevel,
          status: statusText,
          status_code: enrollment.status,
          term: enrollment.term,
          academic_year: enrollment.academic_year,
        };
      })
    );

    return NextResponse.json({
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    console.error("Error searching students:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to search students",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

