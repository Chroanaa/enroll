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
    const offset = (page - 1) * limit;

    // Build where clause based on admission status filter
    const whereClause: any = {};

    // Filter by admission status
    if (admissionStatus !== "all") {
      whereClause.admission_status = {
        equals: admissionStatus,
        mode: "insensitive",
      };
    }

    // Add search filter if provided
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { student_number: { contains: search, mode: "insensitive" } },
            { first_name: { contains: search, mode: "insensitive" } },
            { family_name: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
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
    const formattedStudents = await Promise.all(
      students.map(async (student) => {
        let program = null;
        let major = null;

        // Fetch program if course_program exists
        if (student.course_program) {
          const programData = await prisma.program.findFirst({
            where: { code: student.course_program },
          });
          if (programData) {
            program = {
              id: programData.id,
              code: programData.code,
              name: programData.name,
              department_name: programData.department_name,
            };
          }
        }

        // Fetch major if major_id exists
        if (student.major_id) {
          const majorData = await prisma.major.findUnique({
            where: { id: student.major_id },
          });
          if (majorData) {
            major = {
              id: majorData.id,
              code: majorData.code,
              name: majorData.name,
            };
          }
        }

        return {
          id: student.id,
          student_number: student.student_number,
          first_name: student.first_name,
          middle_name: student.middle_name,
          last_name: student.family_name,
          email_address: student.email_address,
          contact_number: student.contact_number,
          program,
          major,
          year_level: student.year_level,
          term: student.term,
          academic_year: student.academic_year,
          admission_date: student.admission_date,
          admission_status: student.admission_status,
          academic_status: student.academic_status,
          status: student.status,
        };
      })
    );

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
