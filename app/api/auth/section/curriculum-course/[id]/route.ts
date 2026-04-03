import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope } from "@/app/lib/accessScope";

const ALLOWED_ROLES = new Set([1, 4, 5]); // Admin, Registrar, Dean

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(Number(scope.roleId || 0))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { id } = await params;
    const curriculumCourseId = Number(id);
    if (!Number.isFinite(curriculumCourseId) || curriculumCourseId <= 0) {
      return NextResponse.json({ error: "Invalid curriculum course id." }, { status: 400 });
    }

    const course = await prisma.curriculum_course.findUnique({
      where: { id: curriculumCourseId },
      select: {
        id: true,
        curriculum_id: true,
        subject_id: true,
        course_code: true,
        descriptive_title: true,
        units_lec: true,
        units_lab: true,
        units_total: true,
        year_level: true,
        semester: true,
        lecture_hour: true,
        lab_hour: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Curriculum course not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: Number(course.id),
        curriculum_id: Number(course.curriculum_id),
        subject_id: course.subject_id === null ? null : Number(course.subject_id),
        course_code: String(course.course_code || "N/A"),
        descriptive_title: String(course.descriptive_title || "No title"),
        units_lec: Number(course.units_lec || 0),
        units_lab: Number(course.units_lab || 0),
        units_total: Number(course.units_total || 0),
        year_level: Number(course.year_level || 0),
        semester: Number(course.semester || 0),
        lecture_hour: Number(course.lecture_hour || 0),
        lab_hour: Number(course.lab_hour || 0),
      },
    });
  } catch (error: any) {
    console.error("Error loading curriculum course by id:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load curriculum course." },
      { status: 500 },
    );
  }
}
