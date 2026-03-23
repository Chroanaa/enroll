import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/authOptions";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope } from "@/app/lib/accessScope";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const scope = await getSessionScope();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (scope?.isDean) {
      return NextResponse.json(
        { error: "Forbidden. Dean accounts cannot access resident students." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const admissionStatus = searchParams.get("admissionStatus") || "all";
    const programIdParam = searchParams.get("programId") || "";
    const majorIdParam = searchParams.get("majorId") || "";
    const yearLevelParam = searchParams.get("yearLevel") || "";
    const offset = (page - 1) * limit;

    // Build where clause based on admission status filter
    const whereClause: any = {};
    const andConditions: any[] = [];

    // Filter by admission status
    if (admissionStatus !== "all") {
      whereClause.admission_status = {
        equals: admissionStatus,
        mode: "insensitive",
      };
    }

    // Filter by program (supports enrollment.course_program stored as either program ID or program code)
    if (programIdParam) {
      const parsedProgramId = Number.parseInt(programIdParam, 10);
      if (!Number.isNaN(parsedProgramId)) {
        const selectedProgram = await prisma.program.findUnique({
          where: { id: parsedProgramId },
          select: { code: true },
        });

        andConditions.push({
          OR: [
            { course_program: String(parsedProgramId) },
            ...(selectedProgram?.code
              ? [
                  {
                    course_program: {
                      equals: selectedProgram.code,
                      mode: "insensitive",
                    },
                  },
                ]
              : []),
          ],
        });
      }
    }

    // Filter by major
    if (majorIdParam) {
      const parsedMajorId = Number.parseInt(majorIdParam, 10);
      if (!Number.isNaN(parsedMajorId)) {
        andConditions.push({
          major_id: parsedMajorId,
        });
      }
    }

    // Filter by year level
    if (yearLevelParam) {
      const parsedYearLevel = Number.parseInt(yearLevelParam, 10);
      if (!Number.isNaN(parsedYearLevel)) {
        andConditions.push({
          year_level: parsedYearLevel,
        });
      }
    }

    // Add search filter if provided
    if (search) {
      andConditions.push({
        OR: [
          { student_number: { contains: search, mode: "insensitive" } },
          { first_name: { contains: search, mode: "insensitive" } },
          { family_name: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
    }

    // Get total count
    const totalCount = await prisma.enrollment.count({
      where: whereClause,
    });

    // Fetch students with pagination
    const students = await prisma.enrollment.findMany({
      where: whereClause,
      orderBy: [
        { academic_year: "desc" },
        { term: "desc" },
        { family_name: "asc" },
      ],
      skip: offset,
      take: limit,
    });

    // Fetch program and major data separately
    const uniqueCourseProgramValues = Array.from(
      new Set(
        students
          .map((student) => String(student.course_program || "").trim())
          .filter(Boolean),
      ),
    );

    const numericProgramIds = uniqueCourseProgramValues
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => !Number.isNaN(value));

    const stringProgramCodes = uniqueCourseProgramValues.filter((value) =>
      Number.isNaN(Number.parseInt(value, 10)),
    );

    const [programRows, majorRows] = await Promise.all([
      uniqueCourseProgramValues.length > 0
        ? prisma.program.findMany({
            where: {
              OR: [
                numericProgramIds.length > 0
                  ? { id: { in: numericProgramIds } }
                  : undefined,
                stringProgramCodes.length > 0
                  ? { code: { in: stringProgramCodes } }
                  : undefined,
              ].filter(Boolean) as any[],
            },
            select: {
              id: true,
              code: true,
              name: true,
              department_name: true,
            },
          })
        : Promise.resolve([]),
      prisma.major.findMany({
        where: {
          id: {
            in: students
              .map((student) => student.major_id)
              .filter((id): id is number => typeof id === "number"),
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      }),
    ]);

    const programsById = new Map(programRows.map((program) => [program.id, program]));
    const programsByCode = new Map(
      programRows.map((program) => [String(program.code || "").toUpperCase(), program]),
    );
    const majorsById = new Map(majorRows.map((major) => [major.id, major]));

    const formattedStudents = students.map((student) => {
      const rawCourseProgram = String(student.course_program || "").trim();
      const parsedProgramId = Number.parseInt(rawCourseProgram, 10);

      const program =
        (!Number.isNaN(parsedProgramId)
          ? programsById.get(parsedProgramId)
          : undefined) ||
        programsByCode.get(rawCourseProgram.toUpperCase()) ||
        null;

      const major =
        student.major_id && majorsById.has(student.major_id)
          ? majorsById.get(student.major_id)
          : null;

      return {
        id: student.id,
        student_number: student.student_number,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.family_name,
        email_address: student.email_address,
        contact_number: student.contact_number,
        program: program
          ? {
              id: program.id,
              code: program.code,
              name: program.name,
              department_name: program.department_name,
            }
          : null,
        major: major
          ? {
              id: major.id,
              code: major.code,
              name: major.name,
            }
          : null,
        year_level: student.year_level,
        term: student.term,
        academic_year: student.academic_year,
        admission_date: student.admission_date,
        admission_status: student.admission_status,
        academic_status: student.academic_status,
        status: student.status,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedStudents,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching resident students:", error);
    return NextResponse.json(
      { error: "Failed to fetch resident students" },
      { status: 500 }
    );
  }
}
