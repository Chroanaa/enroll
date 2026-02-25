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
 * - majorId: Optional major ID filter (will match curriculum.major by name)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get("programId");
    const semester = searchParams.get("semester");
    const yearLevel = searchParams.get("yearLevel");
    const majorId = searchParams.get("majorId");

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

    // If majorId is provided, get the major name for curriculum matching
    let majorName: string | null = null;
    let majorCode: string | null = null;
    if (majorId) {
      const major = await prisma.major.findUnique({
        where: { id: parseInt(majorId) },
        select: { name: true, code: true },
      });
      if (major) {
        majorName = major.name;
        majorCode = major.code;
      }
    }

    // Find active curriculum for the program using program_code
    let curriculum = null;
    
    if (majorName) {
      // Student has a major - try to find curriculum with matching program AND major
      // Try matching by major name first
      curriculum = await prisma.curriculum.findFirst({
        where: {
          program_code: program.code,
          major: majorName,
          status: "active",
        },
        orderBy: {
          effective_year: "desc",
        },
      });
      
      // If not found by name, try matching by major code
      if (!curriculum && majorCode) {
        curriculum = await prisma.curriculum.findFirst({
          where: {
            program_code: program.code,
            major: majorCode,
            status: "active",
          },
          orderBy: {
            effective_year: "desc",
          },
        });
      }
      
      // If still not found, try case-insensitive match
      if (!curriculum) {
        const allCurriculums = await prisma.curriculum.findMany({
          where: {
            program_code: program.code,
            status: "active",
          },
          orderBy: {
            effective_year: "desc",
          },
        });
        
        // Find one where major matches (case-insensitive)
        curriculum = allCurriculums.find(c => 
          c.major && (
            c.major.toLowerCase() === majorName?.toLowerCase() ||
            c.major.toLowerCase() === majorCode?.toLowerCase()
          )
        ) || null;
      }
      
      // If student has a major but no matching curriculum found, 
      // fall back to curriculum without major (general curriculum)
      if (!curriculum) {
        curriculum = await prisma.curriculum.findFirst({
          where: {
            program_code: program.code,
            status: "active",
            OR: [
              { major: null },
              { major: "" },
            ],
          },
          orderBy: {
            effective_year: "desc",
          },
        });
      }
    } else {
      // Student has NO major - find curriculum without major or with null/empty major
      curriculum = await prisma.curriculum.findFirst({
        where: {
          program_code: program.code,
          status: "active",
          OR: [
            { major: null },
            { major: "" },
          ],
        },
        orderBy: {
          effective_year: "desc",
        },
      });
      
      // If no curriculum without major, fall back to any curriculum for the program
      if (!curriculum) {
        curriculum = await prisma.curriculum.findFirst({
          where: {
            program_code: program.code,
            status: "active",
          },
          orderBy: {
            effective_year: "desc",
          },
        });
      }
    }

    if (!curriculum) {
      // Try matching by program name as last fallback
      curriculum = await prisma.curriculum.findFirst({
        where: {
          program_name: program.name,
          status: "active",
        },
        orderBy: {
          effective_year: "desc",
        },
      });
    }

    if (!curriculum) {
      return NextResponse.json(
        { error: `No active curriculum found for program "${program.name}" (${program.code}). Please ensure an active curriculum exists for this program.` },
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
    // Resolve prerequisite JSON into subject codes (e.g. {"subjectIds":[28]} -> "GEE03")
    // 1) Collect all referenced subject IDs from prerequisite JSON
    const allPrereqSubjectIds = new Set<number>();

    for (const course of curriculumCourses) {
      if (!course.prerequisite) continue;

      try {
        const prereqData = JSON.parse(course.prerequisite as string);
        if (
          prereqData &&
          Array.isArray(prereqData.subjectIds) &&
          prereqData.subjectIds.length > 0
        ) {
          prereqData.subjectIds.forEach((id: number) => {
            if (typeof id === "number" && !Number.isNaN(id)) {
              allPrereqSubjectIds.add(id);
            }
          });
        }
      } catch {
        // Ignore parse errors here; we'll handle formatting per-course below.
      }
    }

    // 2) Fetch all prerequisite subject codes in a single query
    let prereqSubjectsById: Record<number, string> = {};
    if (allPrereqSubjectIds.size > 0) {
      const subjectIdsArray = Array.from(allPrereqSubjectIds);
      const prereqSubjects = await prisma.$queryRaw<any[]>`
        SELECT id, code FROM subject WHERE id = ANY(${subjectIdsArray}::int[])
      `;

      prereqSubjectsById = prereqSubjects.reduce(
        (acc: Record<number, string>, subj: any) => {
          if (subj && typeof subj.id === "number" && typeof subj.code === "string") {
            acc[subj.id] = subj.code;
          }
          return acc;
        },
        {}
      );
    }

    // 3) Fetch subject details for each curriculum course and format prerequisite text
    const coursesWithSubjects = await Promise.all(
      curriculumCourses.map(async (course) => {
        let subject = null;
        if (course.subject_id) {
          subject = await prisma.subject.findUnique({
            where: { id: course.subject_id },
          });
        }

        let prerequisiteText: string | null = null;

        if (course.prerequisite) {
          try {
            const prereqData = JSON.parse(course.prerequisite as string);

            if (
              prereqData &&
              Array.isArray(prereqData.subjectIds) &&
              prereqData.subjectIds.length > 0
            ) {
              const codes = prereqData.subjectIds
                .map((id: number) => prereqSubjectsById[id])
                .filter(Boolean);

              if (codes.length > 0) {
                prerequisiteText = codes.join(", ");
              }
            }
          } catch {
            // If parsing fails and the string looks like JSON, hide it instead
            // of returning raw JSON to the frontend. Otherwise, treat it as
            // already-human-readable text (e.g. "GEE03").
            const raw = String(course.prerequisite).trim();
            if (!raw.startsWith("{")) {
              prerequisiteText = raw;
            }
          }
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
          prerequisite: prerequisiteText,
          year_level: course.year_level,
          semester: course.semester,
          fixedAmount: course.fixedAmount ? Number(course.fixedAmount) : undefined,
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

