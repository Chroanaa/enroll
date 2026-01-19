import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * GET /api/auth/curriculum/subjects
 * Fetches curriculum subjects based on program and semester
 * 
 * Query parameters:
 * - programId: Program ID (required)
 * - semester: Semester number (1 or 2) (required)
 * - yearLevel: Optional year level filter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get("programId");
    const semester = searchParams.get("semester");
    const yearLevel = searchParams.get("yearLevel");

    if (!programId || !semester) {
      return NextResponse.json(
        { error: "programId and semester are required" },
        { status: 400 }
      );
    }

    const semesterNum = parseInt(semester);
    if (semesterNum !== 1 && semesterNum !== 2) {
      return NextResponse.json(
        { error: "semester must be 1 or 2" },
        { status: 400 }
      );
    }

    // First, get the program to find its code
    const program = await prisma.program.findUnique({
      where: { id: parseInt(programId) },
      select: { code: true, name: true },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Find active curriculum for the program using program_code
    const curriculum = await prisma.curriculum.findFirst({
      where: {
        program_code: program.code,
        status: "active",
      },
      orderBy: {
        effective_year: "desc",
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "No active curriculum found for this program" },
        { status: 404 }
      );
    }

    // Fetch curriculum courses for the specified semester
    const whereClause: any = {
      curriculum_id: curriculum.id,
      semester: semesterNum,
    };

    if (yearLevel) {
      whereClause.year_level = parseInt(yearLevel);
    }

    const curriculumCourses = await prisma.curriculum_course.findMany({
      where: whereClause,
      orderBy: [
        { year_level: "asc" },
        { course_code: "asc" },
      ],
    });

    // Fetch subject details for each curriculum course
    const coursesWithSubjects = await Promise.all(
      curriculumCourses.map(async (course) => {
        let subject = null;
        if (course.subject_id) {
          subject = await prisma.subject.findUnique({
            where: { id: course.subject_id },
          });
        }

        return {
          id: course.id,
          curriculum_id: course.curriculum_id,
          subject_id: course.subject_id,
          course_code: course.course_code,
          descriptive_title: course.descriptive_title,
          units_lec: course.units_lec,
          units_lab: course.units_lab,
          units_total: course.units_total,
          lecture_hour: course.lecture_hour,
          lab_hour: course.lab_hour,
          prerequisite: course.prerequisite,
          year_level: course.year_level,
          semester: course.semester,
          subject: subject,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        curriculum: {
          id: curriculum.id,
          program_name: curriculum.program_name,
          program_code: curriculum.program_code,
          effective_year: curriculum.effective_year,
        },
        courses: coursesWithSubjects,
      },
    });
  } catch (error: any) {
    console.error("Error fetching curriculum subjects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch curriculum subjects" },
      { status: 500 }
    );
  }
}

