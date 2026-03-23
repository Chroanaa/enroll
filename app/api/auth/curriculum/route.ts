import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { ROLES } from "@/app/lib/rbac";
import { getSessionScope } from "@/app/lib/accessScope";

const READ_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.REGISTRAR,
  ROLES.FACULTY,
  ROLES.DEAN,
];
const WRITE_ALLOWED_ROLES = [ROLES.ADMIN, ROLES.DEAN];

async function requireRole(allowedRoles: number[]) {
  const session = await getServerSession(authOptions);
  const userRole = Number((session?.user as any)?.role) || 0;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      {
        error:
          allowedRoles === WRITE_ALLOWED_ROLES
            ? "View-only access. Only admin and dean can modify curriculum."
            : "Unauthorized to access curriculum.",
      },
      { status: 403 },
    );
  }

  return null;
}

async function resolveProgramByIdentifier(identifier: unknown) {
  const raw = String(identifier || "").trim();
  if (!raw) {
    return null;
  }

  const parsedId = Number.parseInt(raw, 10);
  const numericId = Number.isNaN(parsedId) ? null : parsedId;

  return prisma.program.findFirst({
    where: {
      OR: [
        { code: raw },
        ...(numericId !== null ? [{ id: numericId }] : []),
      ],
    },
    select: {
      id: true,
      code: true,
      name: true,
      department_id: true,
    },
  });
}

async function ensureDeanCurriculumWriteAccess(programIdentifier: unknown) {
  const scope = await getSessionScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!scope.isDean) {
    return null;
  }

  if (!scope.deanDepartmentId) {
    return NextResponse.json(
      { error: "Dean account is not linked to a department." },
      { status: 403 },
    );
  }

  const program = await resolveProgramByIdentifier(programIdentifier);
  if (!program) {
    return NextResponse.json(
      { error: "Program not found for this curriculum." },
      { status: 400 },
    );
  }

  if (!program.department_id) {
    return NextResponse.json(
      { error: "Selected program is not linked to any department." },
      { status: 400 },
    );
  }

  if (program.department_id !== scope.deanDepartmentId) {
    return NextResponse.json(
      { error: "Forbidden. You can only edit curriculum for your department." },
      { status: 403 },
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireRole(WRITE_ALLOWED_ROLES);
    if (unauthorized) return unauthorized;

    const data = await request.json();
    const { id, courses, ...curriculumData } = data;

    const deanScopeError = await ensureDeanCurriculumWriteAccess(
      curriculumData.program_code,
    );
    if (deanScopeError) return deanScopeError;

    const newCurriculum = await prisma.curriculum.create({
      data: {
        ...curriculumData,
        curriculum_course: {
          create:
            courses?.map((course: any) => ({
              subject_id: course.subject_id,
              course_code: course.course_code,
              descriptive_title: course.descriptive_title,
              units_lec: course.units_lec,
              lecture_hour: course.lecture_hour,
              lab_hour: course.lab_hour,
              units_lab: course.units_lab,
              units_total: course.units_total,
              prerequisite: course.prerequisite,
              year_level: course.year_level,
              semester: course.semester,
              fixedAmount: course.fixedAmount !== undefined && course.fixedAmount !== null 
                ? Number(course.fixedAmount) 
                : null,
            })) || [],
        },
      },
      include: {
        curriculum_course: true,
      },
    });

    return NextResponse.json(newCurriculum);
  } catch (error) {
    console.error("Error creating curriculum:", error);
    return NextResponse.json(
      { error: "Failed to create curriculum" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const unauthorized = await requireRole(READ_ALLOWED_ROLES);
    if (unauthorized) return unauthorized;

    const curriculums = await prisma.curriculum.findMany({
      include: {
        curriculum_course: true,
      },
    });

    const curriculumProgramKeys = [
      ...new Set(curriculums.map((curriculum) => curriculum.program_code).filter(Boolean)),
    ];
    const numericProgramIds = curriculumProgramKeys
      .map((value) => Number.parseInt(String(value), 10))
      .filter((value) => !Number.isNaN(value));
    const stringProgramCodes = curriculumProgramKeys.filter((value) =>
      Number.isNaN(Number.parseInt(String(value), 10)),
    ) as string[];

    const programRows =
      curriculumProgramKeys.length > 0
        ? await prisma.program.findMany({
            where: {
              OR: [
                numericProgramIds.length > 0 ? { id: { in: numericProgramIds } } : undefined,
                stringProgramCodes.length > 0 ? { code: { in: stringProgramCodes } } : undefined,
              ].filter(Boolean) as any[],
            },
            select: {
              id: true,
              code: true,
              department_id: true,
            },
          })
        : [];

    const programByKey = new Map<string, { id: number; department_id: number | null }>();
    for (const program of programRows) {
      programByKey.set(String(program.id), {
        id: program.id,
        department_id: program.department_id ?? null,
      });
      programByKey.set(program.code, {
        id: program.id,
        department_id: program.department_id ?? null,
      });
    }

    // Transform the data to match the frontend Curriculum interface
    const transformedCurriculums = curriculums.map((curriculum) => ({
      ...(programByKey.get(String(curriculum.program_code))
        ? {
            department_id:
              programByKey.get(String(curriculum.program_code))?.department_id ?? null,
          }
        : { department_id: null }),
      id: curriculum.id,
      program_name: curriculum.program_name,
      program_code: curriculum.program_code,
      major: curriculum.major,
      effective_year: curriculum.effective_year,
      total_units: curriculum.total_units,
      status: curriculum.status,
      tuition_fee_per_unit: (curriculum as any).tuition_fee_per_unit != null ? Number((curriculum as any).tuition_fee_per_unit) : undefined,
      courses: curriculum.curriculum_course.map((course) => ({
        id: course.id,
        subject_id: course.subject_id,
        course_code: course.course_code,
        descriptive_title: course.descriptive_title,
        units_lec: course.units_lec,
        lecture_hour: course.lecture_hour,
        lab_hour: course.lab_hour,
        units_lab: course.units_lab,
        units_total: course.units_total,
        prerequisite: course.prerequisite,
        year_level: course.year_level,
        semester: course.semester,
        fixedAmount:
          course.fixedAmount !== undefined && course.fixedAmount !== null
            ? Number(course.fixedAmount)
            : undefined,
      })),
    }));

    return NextResponse.json(transformedCurriculums);
  } catch (error) {
    console.error("Error fetching curriculums:", error);
    return NextResponse.json(
      { error: "Failed to fetch curriculums" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const unauthorized = await requireRole(WRITE_ALLOWED_ROLES);
    if (unauthorized) return unauthorized;

    const data = await nextRequest.json();
    const { id, courses, ...updateData } = data;
    const curriculumId = Number(id);

    const existingCurriculum = await prisma.curriculum.findUnique({
      where: { id: curriculumId },
      select: { id: true, program_code: true },
    });

    if (!existingCurriculum) {
      return NextResponse.json({ error: "Curriculum not found." }, { status: 404 });
    }

    const targetProgramCode = updateData.program_code || existingCurriculum.program_code;
    const deanScopeError = await ensureDeanCurriculumWriteAccess(targetProgramCode);
    if (deanScopeError) return deanScopeError;

    // Smart update: preserve existing curriculum_course IDs so that
    // enrolled_subjects.curriculum_course_id references remain valid.

    // Fetch existing DB course IDs for this curriculum
    const existingCourses = await prisma.curriculum_course.findMany({
      where: { curriculum_id: curriculumId },
      select: { id: true },
    });
    const existingIdSet = new Set(existingCourses.map((c) => c.id));

    const incomingCourses: any[] = courses || [];
    // A course is "existing" if its id is a real DB id (present in existingIdSet)
    const toUpdate = incomingCourses.filter((c) => existingIdSet.has(Number(c.id)));
    const toCreate = incomingCourses.filter((c) => !existingIdSet.has(Number(c.id)));
    const incomingIdSet = new Set(incomingCourses.map((c) => Number(c.id)));
    const toDeleteIds = [...existingIdSet].filter((dbId) => !incomingIdSet.has(dbId));

    const mapCourseFields = (course: any) => ({
      subject_id: course.subject_id,
      course_code: course.course_code,
      descriptive_title: course.descriptive_title,
      units_lec: course.units_lec,
      lecture_hour: course.lecture_hour,
      lab_hour: course.lab_hour,
      units_lab: course.units_lab,
      units_total: course.units_total,
      prerequisite: course.prerequisite,
      year_level: course.year_level,
      semester: course.semester,
      fixedAmount:
        course.fixedAmount !== undefined && course.fixedAmount !== null
          ? Number(course.fixedAmount)
          : null,
    });

    await prisma.$transaction(async (tx) => {
      // 1. Update curriculum basic info
      await tx.curriculum.update({
        where: { id: curriculumId },
        data: { ...updateData },
      });

      // 2. Delete only the courses that were explicitly removed
      if (toDeleteIds.length > 0) {
        await tx.curriculum_course.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }

      // 3. Update existing courses in-place in parallel (preserves their IDs)
      await Promise.all(
        toUpdate.map((course) =>
          tx.curriculum_course.update({
            where: { id: Number(course.id) },
            data: mapCourseFields(course),
          })
        )
      );

      // 4. Create truly new courses
      if (toCreate.length > 0) {
        await tx.curriculum_course.createMany({
          data: toCreate.map((course) => ({
            curriculum_id: curriculumId,
            ...mapCourseFields(course),
          })),
        });
      }
    }, { timeout: 30000 });

    // Re-fetch updated curriculum to return consistent response
    const updatedCurriculum = await prisma.curriculum.findUnique({
      where: { id: curriculumId },
      include: { curriculum_course: true },
    });

    if (!updatedCurriculum) {
      return NextResponse.json({ error: "Curriculum not found after update" }, { status: 404 });
    }

    const transformedCurriculum = {
      id: updatedCurriculum.id,
      program_name: updatedCurriculum.program_name,
      program_code: updatedCurriculum.program_code,
      major: updatedCurriculum.major,
      effective_year: updatedCurriculum.effective_year,
      total_units: updatedCurriculum.total_units,
      status: updatedCurriculum.status,
      tuition_fee_per_unit: (updatedCurriculum as any).tuition_fee_per_unit != null ? Number((updatedCurriculum as any).tuition_fee_per_unit) : undefined,
      courses: updatedCurriculum.curriculum_course.map((course) => ({
        id: course.id,
        subject_id: course.subject_id,
        course_code: course.course_code,
        descriptive_title: course.descriptive_title,
        units_lec: course.units_lec,
        lecture_hour: course.lecture_hour,
        lab_hour: course.lab_hour,
        units_lab: course.units_lab,
        units_total: course.units_total,
        prerequisite: course.prerequisite,
        year_level: course.year_level,
        semester: course.semester,
        fixedAmount:
          course.fixedAmount !== undefined && course.fixedAmount !== null
            ? Number(course.fixedAmount)
            : undefined,
      })),
    };

    return NextResponse.json(transformedCurriculum);
  } catch (error) {
    console.error("Error updating curriculum:", error);
    return NextResponse.json(
      { error: "Failed to update curriculum" },
      { status: 500 }
    );
  }
}
