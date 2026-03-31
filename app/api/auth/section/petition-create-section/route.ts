import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope } from "@/app/lib/accessScope";
import { insertIntoReports } from "@/app/utils/reportsUtils";

const ALLOWED_ROLES = new Set([1, 4, 5]); // Admin, Registrar, Dean

function normalizeSemesterToLabel(semester: number) {
  if (semester === 1) return "first";
  if (semester === 2) return "second";
  return "summer";
}

function getTermCode(semester: number) {
  if (semester === 1) return "1ST";
  if (semester === 2) return "2ND";
  return "SUM";
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(Number(scope.roleId || 0))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const curriculumCourseId = Number(body?.curriculumCourseId);
    const requestedProgramId = Number(body?.programId);
    const yearLevel = Number(body?.yearLevel);
    const semester = Number(body?.semester);
    const academicYear = String(body?.academicYear || "").trim();
    const courseCode = String(body?.courseCode || "PET").trim().toUpperCase();

    if (
      !Number.isFinite(curriculumCourseId) ||
      !Number.isFinite(yearLevel) ||
      !Number.isFinite(semester) ||
      !academicYear
    ) {
      return NextResponse.json(
        { error: "curriculumCourseId, yearLevel, semester, and academicYear are required." },
        { status: 400 },
      );
    }

    const semesterLabel = normalizeSemesterToLabel(semester);

    const curriculumCourse = await prisma.curriculum_course.findUnique({
      where: { id: curriculumCourseId },
      select: {
        curriculum_id: true,
      },
    });

    if (!curriculumCourse?.curriculum_id) {
      return NextResponse.json(
        { error: "Curriculum course not found." },
        { status: 404 },
      );
    }

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: curriculumCourse.curriculum_id },
      select: { program_code: true },
    });

    const resolvedProgram = await prisma.program.findFirst({
      where: {
        OR: [
          Number.isFinite(requestedProgramId)
            ? { id: requestedProgramId }
            : { id: -1 },
          curriculum?.program_code
            ? { code: { equals: curriculum.program_code, mode: "insensitive" } }
            : { id: -1 },
        ],
      },
      select: { id: true },
    });

    if (!resolvedProgram?.id) {
      return NextResponse.json(
        { error: "Unable to resolve host program for petition section." },
        { status: 400 },
      );
    }

    const programId = Number(resolvedProgram.id);

    const existingRows = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT s.id
      FROM sections s
      INNER JOIN class_schedule cs ON cs.section_id = s.id
      WHERE s.program_id = ${programId}
        AND s.year_level = ${yearLevel}
        AND s.academic_year = ${academicYear}
        AND LOWER(COALESCE(s.semester, '')) = ${semesterLabel}
        AND cs.curriculum_course_id = ${curriculumCourseId}
      ORDER BY s.id ASC
      LIMIT 1
    `;

    if (existingRows.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          sectionId: Number(existingRows[0].id),
          created: false,
          message: "Existing section with this petition subject schedule was found.",
        },
      });
    }

    const baseCode = courseCode.replace(/[^A-Z0-9]/g, "").slice(0, 12) || "PET";
    const termCode = getTermCode(semester);
    const namePrefix = `PET-${baseCode}-Y${yearLevel}-${termCode}`;

    const sequenceRows = await prisma.$queryRaw<{ existing_count: bigint }[]>`
      SELECT COUNT(*)::bigint AS existing_count
      FROM sections
      WHERE program_id = ${programId}
        AND academic_year = ${academicYear}
        AND LOWER(COALESCE(semester, '')) = ${semesterLabel}
        AND section_name ILIKE ${`${namePrefix}-%`}
    `;
    const nextSequence = Number(sequenceRows[0]?.existing_count || 0) + 1;
    const sequenceCode = String(nextSequence).padStart(2, "0");
    const generatedSectionName = `${namePrefix}-${sequenceCode}`;

    const newSection = await prisma.sections.create({
      data: {
        program_id: programId,
        year_level: yearLevel,
        academic_year: academicYear,
        semester: semesterLabel,
        section_name: generatedSectionName,
        advisor: "To Be Assigned",
        max_capacity: 40,
        student_count: 0,
        status: "draft",
      },
      select: { id: true, section_name: true },
    });

    if (scope.userId) {
      await insertIntoReports({
        action: `Created petition section ${newSection.section_name} for curriculum course ${curriculumCourseId} (${academicYear} sem ${semester})`,
        user_id: Number(scope.userId),
        created_at: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        sectionId: Number(newSection.id),
        sectionName: String(newSection.section_name),
        created: true,
      },
    });
  } catch (error: any) {
    console.error("Error creating petition section:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create petition section." },
      { status: 500 },
    );
  }
}
