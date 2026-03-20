import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

interface FacultyBulkSchedulesRequest {
  facultyIds: number[];
  academicYear?: string;
  semester?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FacultyBulkSchedulesRequest;
    const facultyIds = Array.isArray(body?.facultyIds)
      ? body.facultyIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];

    if (facultyIds.length === 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'facultyIds must be a non-empty number array' },
        { status: 400 }
      );
    }

    const where: any = {
      faculty_id: { in: facultyIds },
    };

    if (body.academicYear) where.academic_year = body.academicYear;
    if (body.semester) where.semester = body.semester;

    const schedules = await prisma.class_schedule.findMany({
      where,
      orderBy: [{ faculty_id: 'asc' }, { day_of_week: 'asc' }, { start_time: 'asc' }],
    });

    const roomIds = [...new Set(schedules.map((s) => s.room_id).filter(Boolean))];
    const curriculumCourseIds = [...new Set(schedules.map((s) => s.curriculum_course_id).filter(Boolean))];
    const sectionIds = [...new Set(schedules.map((s) => s.section_id).filter(Boolean))];

    const [rooms, curriculumCourses, sections] = await Promise.all([
      roomIds.length
        ? prisma.room.findMany({
            where: { id: { in: roomIds } },
            select: { id: true, room_number: true, capacity: true },
          })
        : [],
      curriculumCourseIds.length
        ? prisma.curriculum_course.findMany({
            where: { id: { in: curriculumCourseIds } },
            select: {
              id: true,
              course_code: true,
              descriptive_title: true,
              prerequisite: true,
              year_level: true,
              semester: true,
              units_lec: true,
              units_lab: true,
              units_total: true,
            },
          })
        : [],
      sectionIds.length
        ? prisma.sections.findMany({
            where: { id: { in: sectionIds } },
            select: { id: true, section_name: true },
          })
        : [],
    ]);

    const roomMap = new Map<number, any>((rooms as any[]).map((room: any) => [room.id, room]));
    const curriculumCourseMap = new Map<number, any>(
      (curriculumCourses as any[]).map((course: any) => [course.id, course])
    );
    const sectionMap = new Map<number, any>(
      (sections as any[]).map((section: any) => [section.id, section])
    );

    const byFaculty: Record<string, any[]> = {};
    for (const facultyId of facultyIds) {
      byFaculty[String(facultyId)] = [];
    }

    for (const schedule of schedules as any[]) {
      const facultyId = Number(schedule.faculty_id);
      if (!facultyId || !byFaculty[String(facultyId)]) continue;

      const curriculumCourse = curriculumCourseMap.get(schedule.curriculum_course_id);
      const section = sectionMap.get(schedule.section_id);

      byFaculty[String(facultyId)].push({
        id: schedule.id,
        sectionId: schedule.section_id,
        sectionName: section?.section_name || 'Unknown',
        curriculumCourseId: schedule.curriculum_course_id,
        facultyId: schedule.faculty_id,
        roomId: schedule.room_id,
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time.toISOString(),
        endTime: schedule.end_time.toISOString(),
        academicYear: schedule.academic_year,
        semester: schedule.semester,
        status: schedule.status || 'active',
        room: roomMap.get(schedule.room_id) || null,
        courseCode: curriculumCourse?.course_code || `Course ${schedule.curriculum_course_id}`,
        courseTitle: curriculumCourse?.descriptive_title || '',
        prerequisite: curriculumCourse?.prerequisite || null,
        subjectYearLevel: curriculumCourse?.year_level || null,
        subjectSemester: curriculumCourse?.semester || null,
        unitsLec: curriculumCourse?.units_lec || 0,
        unitsLab: curriculumCourse?.units_lab || 0,
        unitsTotal: curriculumCourse?.units_total || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        byFaculty,
      },
    });
  } catch (error) {
    console.error('Error fetching bulk faculty schedules:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch bulk faculty schedules',
      },
      { status: 500 }
    );
  }
}
