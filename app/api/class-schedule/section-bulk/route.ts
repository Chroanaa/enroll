import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

interface SectionBulkSchedulesRequest {
  sectionIds: number[];
  academicYear?: string;
  semester?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SectionBulkSchedulesRequest;
    const sectionIds = Array.isArray(body?.sectionIds)
      ? body.sectionIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];

    if (sectionIds.length === 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'sectionIds must be a non-empty number array' },
        { status: 400 }
      );
    }

    const where: any = {
      section_id: { in: sectionIds },
    };
    if (body.academicYear) where.academic_year = body.academicYear;
    if (body.semester) where.semester = body.semester;

    const schedules = await prisma.class_schedule.findMany({
      where,
      orderBy: [{ section_id: 'asc' }, { day_of_week: 'asc' }, { start_time: 'asc' }],
    });

    const facultyIds = [...new Set(schedules.map((s) => s.faculty_id).filter((id) => id !== null))];
    const roomIds = [...new Set(schedules.map((s) => s.room_id).filter(Boolean))];
    const curriculumCourseIds = [...new Set(schedules.map((s) => s.curriculum_course_id).filter(Boolean))];
    const sectionIdsFromRows = [...new Set(schedules.map((s) => s.section_id).filter(Boolean))];

    const [facultyList, roomList, curriculumCourseList, sectionList] = await Promise.all([
      facultyIds.length > 0
        ? prisma.faculty.findMany({
            where: { id: { in: facultyIds as number[] } },
            select: { id: true, first_name: true, last_name: true },
          })
        : [],
      roomIds.length > 0
        ? prisma.room.findMany({
            where: { id: { in: roomIds as number[] } },
            select: { id: true, room_number: true, capacity: true },
          })
        : [],
      curriculumCourseIds.length > 0
        ? prisma.curriculum_course.findMany({
            where: { id: { in: curriculumCourseIds as number[] } },
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
      sectionIdsFromRows.length > 0
        ? prisma.sections.findMany({
            where: { id: { in: sectionIdsFromRows as number[] } },
            select: { id: true, section_name: true },
          })
        : [],
    ]);

    const facultyMap = new Map<number, any>((facultyList as any[]).map((f: any) => [f.id, f]));
    const roomMap = new Map<number, any>((roomList as any[]).map((r: any) => [r.id, r]));
    const curriculumCourseMap = new Map<number, any>(
      (curriculumCourseList as any[]).map((c: any) => [c.id, c])
    );
    const sectionMap = new Map<number, any>((sectionList as any[]).map((s: any) => [s.id, s]));

    const bySection: Record<string, any[]> = {};
    for (const sectionId of sectionIds) {
      bySection[String(sectionId)] = [];
    }

    for (const schedule of schedules as any[]) {
      const curriculumCourse = curriculumCourseMap.get(schedule.curriculum_course_id);
      const section = sectionMap.get(schedule.section_id);

      bySection[String(schedule.section_id)].push({
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
        faculty: facultyMap.get(schedule.faculty_id) || null,
        room: roomMap.get(schedule.room_id) || null,
        section: section || null,
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
        bySection,
      },
    });
  } catch (error) {
    console.error('Error fetching bulk section schedules:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch bulk section schedules',
      },
      { status: 500 }
    );
  }
}

