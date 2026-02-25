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

    // Delete existing courses and create new ones
    const updatedCurriculum = await prisma.curriculum.update({
      where: { id: Number(id) },
      data: {
        ...updateData,
        curriculum_course: {
          deleteMany: {},
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

    // Transform the response to match frontend interface
    const transformedCurriculum = {
      id: updatedCurriculum.id,
      program_name: updatedCurriculum.program_name,
      program_code: updatedCurriculum.program_code,
      major: updatedCurriculum.major,
      effective_year: updatedCurriculum.effective_year,
      total_units: updatedCurriculum.total_units,
      status: updatedCurriculum.status,
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
