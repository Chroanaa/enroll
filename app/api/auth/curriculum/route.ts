import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, courses, ...curriculumData } = data;

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
    const curriculums = await prisma.curriculum.findMany({
      include: {
        curriculum_course: true,
      },
    });

    // Transform the data to match the frontend Curriculum interface
    const transformedCurriculums = curriculums.map((curriculum) => ({
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
        fixedAmount: course.fixedAmount ? Number(course.fixedAmount) : undefined,
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
    const data = await nextRequest.json();
    const { id, courses, ...updateData } = data;

    // Smart update: preserve existing curriculum_course IDs so that
    // enrolled_subjects.curriculum_course_id references remain valid.
    const curriculumId = Number(id);

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
        fixedAmount: course.fixedAmount ? Number(course.fixedAmount) : undefined,
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
