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
    const body: CreateClassScheduleRequest = await request.json();

    // Validate required fields
    if (
      !body.sectionId ||
      !body.curriculumCourseId ||
      !body.facultyId ||
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
          message: 'Missing required fields'
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

    if (section.status !== 'draft') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Cannot modify schedule. Section must be in draft status. Current status: ${section.status}`
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

    // Verify faculty exists
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

    // Run conflict checks
    const [roomConflict, facultyConflict, sectionConflict, subjectDuplicate] =
      await Promise.all([
        conflictChecker.checkRoomConflict(
          body.roomId,
          body.dayOfWeek,
          startTime,
          endTime,
          body.academicYear,
          body.semester
        ),
        conflictChecker.checkFacultyConflict(
          body.facultyId,
          body.dayOfWeek,
          startTime,
          endTime,
          body.academicYear,
          body.semester
        ),
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
          body.semester
        )
      ]);

    if (roomConflict) {
      return NextResponse.json(
        {
          error: 'ROOM_CONFLICT',
          message: `Room is already booked on ${body.dayOfWeek} from ${startTime} to ${endTime}`
        } as ApiError,
        { status: 409 }
      );
    }

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

    // Create class schedule
    const schedule = await prisma.$transaction(async (tx: any) => {
      return await tx.class_schedule.create({
        data: {
          section_id: body.sectionId,
          curriculum_course_id: body.curriculumCourseId,
          faculty_id: body.facultyId,
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
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');

    const where: any = {};

    if (sectionId) where.section_id = parseInt(sectionId);
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

    const response = schedules.map((schedule: any) => ({
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
    } as ClassScheduleResponse));

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
