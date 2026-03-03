import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Helper function to convert semester string to integer
function convertSemesterToInt(semester: string | number): number {
  if (typeof semester === "number") return semester;
  const semesterStr = semester.toLowerCase();
  if (semesterStr === "first" || semesterStr === "1st") return 1;
  if (semesterStr === "second" || semesterStr === "2nd") return 2;
  return parseInt(semester) || 1;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const search = searchParams.get("search") || "";
    const programFilter = searchParams.get("programId");
    const yearLevel = searchParams.get("yearLevel");
    const assessmentStatus = searchParams.get("assessmentStatus"); // 'assessed', 'not_assessed', or null for all

    console.log("Assessment summaries request:", {
      academicYear,
      semester,
      search,
      programFilter,
      yearLevel,
      assessmentStatus,
    });

    if (!academicYear || !semester) {
      return NextResponse.json(
        { error: "Academic year and semester are required" },
        { status: 400 }
      );
    }

    const semesterInt = convertSemesterToInt(semester);

    // Build where clause for filtering
    const whereClause: any = {};
    const andConditions: any[] = [];

    // Search by student number or name
    if (search) {
      andConditions.push({
        OR: [
          { student_number: { contains: search, mode: "insensitive" } },
          { first_name: { contains: search, mode: "insensitive" } },
          { family_name: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    // Filter by program (using course_program field which stores program ID as string)
    // and major_id field for major filtering
    // The programFilter can be:
    // - "1" (program ID only, no major)
    // - "1-5" (program ID 1 with major ID 5)
    if (programFilter) {
      const parts = programFilter.split("-");
      const programId = parseInt(parts[0]);
      const majorId = parts[1] ? parseInt(parts[1]) : null;
      
      console.log("Parsed program filter:", { programId, majorId });
      
      if (!isNaN(programId)) {
        // The course_program field stores the program ID as a string
        andConditions.push({
          course_program: programId.toString(),
        });
        
        // If major is specified, also filter by major_id
        if (majorId && !isNaN(majorId)) {
          andConditions.push({
            major_id: majorId,
          });
          console.log(`Filtering by program ID: ${programId} and major ID: ${majorId}`);
        } else {
          console.log(`Filtering by program ID: ${programId} only`);
        }
      }
    }

    // Filter by year level
    if (yearLevel) {
      andConditions.push({
        year_level: parseInt(yearLevel),
      });
    }

    // Combine all conditions with AND
    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
    }

    console.log("Where clause:", JSON.stringify(whereClause, null, 2));

    // Fetch all enrolled students for the current term
    const students = await prisma.enrollment.findMany({
      where: whereClause,
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        year_level: true,
        course_program: true,
        major_id: true,
        photo: true,
      },
      orderBy: [
        { family_name: "asc" },
        { first_name: "asc" },
      ],
    });

    console.log(`Found ${students.length} students`);
    
    // Log sample course_program values to help debug
    if (students.length > 0) {
      console.log("Sample course_program values:", students.slice(0, 5).map(s => ({
        student: s.student_number,
        course_program: s.course_program,
      })));
    }

    // Fetch program and major information to display properly
    // Get unique program IDs from students
    const programIds = [...new Set(
      students
        .map(s => s.course_program)
        .filter(p => p !== null && p !== undefined && p !== "")
        .map(p => parseInt(p))
        .filter(p => !isNaN(p))
    )];

    // Fetch programs and majors
    const programs = await prisma.program.findMany({
      where: { id: { in: programIds } },
      select: { id: true, code: true, name: true },
    });

    const majors = await prisma.major.findMany({
      where: { program_id: { in: programIds } },
      select: { id: true, name: true, program_id: true },
    });

    // Create lookup maps
    const programMap = new Map(programs.map(p => [p.id, p]));
    const majorsByProgram = majors.reduce((acc, major) => {
      if (!acc[major.program_id]) acc[major.program_id] = [];
      acc[major.program_id].push(major);
      return acc;
    }, {} as Record<number, typeof majors>);
    
    // Fetch all assessments for the current term
    const assessments = await prisma.student_assessment.findMany({
      where: {
        academic_year: academicYear,
        semester: semesterInt,
        student_number: {
          in: students.map((s) => s.student_number || ""),
        },
      },
      select: {
        student_number: true,
        created_at: true,
        total_due_cash: true,
        total_due_installment: true,
        payment_mode: true,
      },
    });

    console.log(`Found ${assessments.length} assessments`);

    // Create a map of student_number to assessment
    const assessmentMap = new Map(
      assessments.map((a) => [a.student_number, a])
    );

    // Combine student data with assessment status
    let studentsWithAssessment = students.map((student) => {
      const assessment = assessmentMap.get(student.student_number || "");
      const hasAssessment = !!assessment;
      
      // Calculate total amount based on payment mode
      let totalAmount = 0;
      if (assessment) {
        if (assessment.payment_mode === "cash") {
          totalAmount = Number(assessment.total_due_cash) || 0;
        } else {
          totalAmount = Number(assessment.total_due_installment) || 0;
        }
      }

      // Format program display: "BSIT - no major" or "BEED - Filipino"
      let programDisplay = "N/A";
      if (student.course_program) {
        const programId = parseInt(student.course_program);
        if (!isNaN(programId)) {
          const program = programMap.get(programId);
          if (program) {
            // Check if student has a major_id
            if (student.major_id) {
              const major = majors.find(m => m.id === student.major_id);
              if (major) {
                programDisplay = `${program.code} - ${major.name}`;
              } else {
                programDisplay = `${program.code} - no major`;
              }
            } else {
              programDisplay = `${program.code} - no major`;
            }
          }
        }
      }

      return {
        id: student.id,
        student_number: student.student_number,
        first_name: student.first_name,
        middle_name: student.middle_name,
        family_name: student.family_name,
        program_code: programDisplay,
        program_name: programDisplay,
        year_level: student.year_level,
        photo: student.photo,
        has_assessment: hasAssessment,
        assessment_date: assessment?.created_at,
        total_amount: totalAmount,
      };
    });

    // Filter by assessment status if specified
    if (assessmentStatus === "assessed") {
      studentsWithAssessment = studentsWithAssessment.filter((s) => s.has_assessment);
    } else if (assessmentStatus === "not_assessed") {
      studentsWithAssessment = studentsWithAssessment.filter((s) => !s.has_assessment);
    }

    console.log(`Returning ${studentsWithAssessment.length} students after filtering`);

    return NextResponse.json({
      success: true,
      data: studentsWithAssessment,
      total: studentsWithAssessment.length,
    });
  } catch (error) {
    console.error("Error fetching assessment summaries:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
