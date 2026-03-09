import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import {
  conflictChecker,
  sectionService
} from '../../utils/sectionService';
import {
  CreateClassScheduleRequest,
  ClassScheduleResponse,
  ApiError
} from '../../types/sectionTypes';

/**
 * POST /api/class-schedule
 * Create a class schedule for a section
 *
 * Request Body:
 * - sectionId: number
 * - curriculumCourseId: number
 * - facultyId: number
 * - roomId: number
 * - dayOfWeek: string
 * - startTime: string (ISO 8601)
 * - endTime: string (ISO 8601)
 * - academicYear: string
 * - semester: string
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateClassScheduleRequest & { isLabSchedule?: boolean } = await request.json();

    // Validate required fields - Faculty is optional
    if (
      !body.sectionId ||
      !body.curriculumCourseId ||
      !body.roomId ||
      !body.dayOfWeek ||
      !body.startTime ||
      !body.endTime ||
      !body.academicYear ||
      !body.semester
    ) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields (faculty is optional)'
        } as ApiError,
        { status: 400 }
      );
    }

    const validSemesters = ['first', 'second', 'summer'];
    if (!validSemesters.includes(body.semester)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Semester must be "first", "second", or "summer"'
        } as ApiError,
        { status: 400 }
      );
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid startTime or endTime format'
        } as ApiError,
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Start time must be before end time'
        } as ApiError,
        { status: 400 }
      );
    }

    // Check section exists and is draft
    const section = await prisma.sections.findUnique({
      where: { id: body.sectionId }
    });

    if (!section) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Section ${body.sectionId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Allow schedule modifications for draft and active sections, not locked/closed
    if (section.status === 'locked' || section.status === 'closed') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Cannot modify schedule. Section is ${section.status}.`
        } as ApiError,
        { status: 400 }
      );
    }

    // Verify subject belongs to section's curriculum
    const curriculumCourse = await prisma.curriculum_course.findUnique({
      where: { id: body.curriculumCourseId },
      include: { curriculum: true }
    });

    if (!curriculumCourse) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Curriculum course ${body.curriculumCourseId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Verify faculty exists (only if provided)
    if (body.facultyId) {
      const faculty = await prisma.faculty.findUnique({
        where: { id: body.facultyId }
      });

      if (!faculty) {
        return NextResponse.json(
          {
            error: 'NOT_FOUND',
            message: `Faculty ${body.facultyId} not found`
          } as ApiError,
          { status: 404 }
        );
      }
    }

    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: body.roomId }
    });

    if (!room) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Room ${body.roomId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Run conflict checks - REMOVED room conflict, keep faculty conflict only if faculty assigned
    const conflictChecks = [
      conflictChecker.checkSectionConflict(
        body.sectionId,
        body.dayOfWeek,
        startTime,
        endTime,
        body.academicYear,
        body.semester
      ),
      conflictChecker.checkSubjectDuplication(
        body.sectionId,
        body.curriculumCourseId,
        body.academicYear,
        body.semester,
        undefined,
        body.isLabSchedule ? 2 : 1
      )
    ];

    // Only check faculty conflict if faculty is assigned
    if (body.facultyId) {
      conflictChecks.push(
        conflictChecker.checkFacultyConflict(
          body.facultyId,
          body.dayOfWeek,
          startTime,
          endTime,
          body.academicYear,
          body.semester
        )
      );
    }

    const results = await Promise.all(conflictChecks);
    const sectionConflict = results[0];
    const subjectDuplicate = results[1];
    const facultyConflict = results[2]; // Will be undefined if faculty not assigned

    // Room conflict check removed - allow scheduling even with room conflicts

    if (facultyConflict) {
      return NextResponse.json(
        {
          error: 'FACULTY_CONFLICT',
          message: `Faculty has schedule conflict on ${body.dayOfWeek} from ${startTime} to ${endTime}`
        } as ApiError,
        { status: 409 }
      );
    }

    if (sectionConflict) {
      return NextResponse.json(
        {
          error: 'SECTION_CONFLICT',
          message: `Section has internal time overlap on ${body.dayOfWeek} from ${startTime} to ${endTime}`
        } as ApiError,
        { status: 409 }
      );
    }

    if (subjectDuplicate) {
      return NextResponse.json(
        {
          error: 'SUBJECT_DUPLICATE',
          message: `Subject is already scheduled in this section for this term`
        } as ApiError,
        { status: 409 }
      );
    }

    // Create class schedule - faculty_id can be null
    const schedule = await prisma.$transaction(async (tx: any) => {
      return await tx.class_schedule.create({
        data: {
          section_id: body.sectionId,
          curriculum_course_id: body.curriculumCourseId,
          faculty_id: body.facultyId || null, // Allow null faculty
          room_id: body.roomId,
          day_of_week: body.dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          academic_year: body.academicYear,
          semester: body.semester,
          status: 'active'
        }
      });
    });

    const response: ClassScheduleResponse = {
      id: schedule.id,
      sectionId: schedule.section_id,
      curriculumCourseId: schedule.curriculum_course_id,
      facultyId: schedule.faculty_id,
      roomId: schedule.room_id,
      dayOfWeek: schedule.day_of_week,
      startTime: schedule.start_time.toISOString(),
      endTime: schedule.end_time.toISOString(),
      academicYear: schedule.academic_year,
      semester: schedule.semester,
      status: schedule.status as 'active' | 'cancelled'
    };

    return NextResponse.json(
      { success: true, data: response },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating class schedule:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create class schedule'
      } as ApiError,
      { status: 500 }
    );
  }
}

/**
 * GET /api/class-schedule
 * List schedules with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const facultyId = searchParams.get('facultyId');
    const curriculumCourseId = searchParams.get('curriculumCourseId');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');

    const where: any = {};

    if (sectionId) where.section_id = parseInt(sectionId);
    if (facultyId) where.faculty_id = parseInt(facultyId);
    if (curriculumCourseId) where.curriculum_course_id = parseInt(curriculumCourseId);
    if (academicYear) where.academic_year = academicYear;
    if (semester) where.semester = semester;
    if (status) where.status = status;

    const schedules = await prisma.class_schedule.findMany({
      where,
      orderBy: [
        { day_of_week: 'asc' },
        { start_time: 'asc' }
      ]
    });

    // Fetch faculty, room, curriculum course, and section data for all schedules
    // Filter out null faculty_ids since faculty assignment is optional
    const facultyIds = [...new Set(schedules.map((s: any) => s.faculty_id).filter((id: any) => id !== null))];
    const roomIds = [...new Set(schedules.map((s: any) => s.room_id))];
    const curriculumCourseIds = [...new Set(schedules.map((s: any) => s.curriculum_course_id))];
    const sectionIds = [...new Set(schedules.map((s: any) => s.section_id))];

    const [facultyList, roomList, curriculumCourseList, sectionList] = await Promise.all([
      facultyIds.length > 0 
        ? prisma.faculty.findMany({
            where: { id: { in: facultyIds } },
            select: { id: true, first_name: true, last_name: true }
          })
        : [],
      prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, room_number: true, capacity: true }
      }),
      prisma.curriculum_course.findMany({
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
          units_total: true
        }
      }),
      prisma.sections.findMany({
        where: { id: { in: sectionIds } },
        select: { id: true, section_name: true }
      })
    ]);

    const facultyMap = new Map(facultyList.map((f: any) => [f.id, f] as [number, any]));
    const roomMap = new Map(roomList.map((r: any) => [r.id, r] as [number, any]));
    const curriculumCourseMap = new Map(curriculumCourseList.map((c: any) => [c.id, c] as [number, any]));
    const sectionMap = new Map(sectionList.map((s: any) => [s.id, s] as [number, any]));

    const response = schedules.map((schedule: any) => {
      const curriculumCourse = curriculumCourseMap.get(schedule.curriculum_course_id);
      const section = sectionMap.get(schedule.section_id);
      return {
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
        status: schedule.status as 'active' | 'cancelled',
        faculty: facultyMap.get(schedule.faculty_id) || null,
        room: roomMap.get(schedule.room_id) || null,
        section: section || null,
        // Subject details from curriculum_course
        courseCode: curriculumCourse?.course_code || `Course ${schedule.curriculum_course_id}`,
        courseTitle: curriculumCourse?.descriptive_title || '',
        prerequisite: curriculumCourse?.prerequisite || null,
        subjectYearLevel: curriculumCourse?.year_level || null,
        subjectSemester: curriculumCourse?.semester || null,
        unitsLec: curriculumCourse?.units_lec || 0,
        unitsLab: curriculumCourse?.units_lab || 0,
        unitsTotal: curriculumCourse?.units_total || 0
      };
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching class schedules:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch class schedules'
      } as ApiError,
      { status: 500 }
    );
  }
}
