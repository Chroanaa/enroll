import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

/**
 * POST /api/class-schedule/conflicts
 * Check for scheduling conflicts before assigning faculty
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      facultyId,
      roomId,
      sectionId,
      dayOfWeek,
      startTime,
      endTime,
      academicYear,
      semester,
      excludeScheduleId
    } = body;

    if (!dayOfWeek || !startTime || !endTime || !academicYear || !semester) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const conflicts: any[] = [];
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Helper function to check time overlap
    const hasTimeOverlap = (existingStart: Date, existingEnd: Date) => {
      return (start < existingEnd && end > existingStart);
    };

    // Build base where clause
    const baseWhere: any = {
      day_of_week: dayOfWeek,
      academic_year: academicYear,
      semester: semester,
      status: 'active'
    };

    // Exclude the schedule being edited if provided
    if (excludeScheduleId) {
      baseWhere.id = { not: excludeScheduleId };
    }

    // Check faculty conflicts (if facultyId provided)
    if (facultyId) {
      const facultySchedules = await prisma.class_schedule.findMany({
        where: {
          ...baseWhere,
          faculty_id: facultyId
        }
      });

      // Get section and course info for conflicts
      const sectionIds = [...new Set(facultySchedules.map(s => s.section_id))];
      const courseIds = [...new Set(facultySchedules.map(s => s.curriculum_course_id))];

      const [sections, courses] = await Promise.all([
        prisma.sections.findMany({
          where: { id: { in: sectionIds } },
          select: { id: true, section_name: true }
        }),
        prisma.curriculum_course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, course_code: true, descriptive_title: true }
        })
      ]);

      const sectionMap = new Map(sections.map(s => [s.id, s.section_name]));
      const courseMap = new Map(courses.map(c => [c.id, c]));

      for (const schedule of facultySchedules) {
        if (hasTimeOverlap(schedule.start_time, schedule.end_time)) {
          const course = courseMap.get(schedule.curriculum_course_id);
          const section = sectionMap.get(schedule.section_id);
          conflicts.push({
            type: 'FACULTY_CONFLICT',
            message: `Faculty already teaching ${course?.course_code || 'Unknown'} (${section || 'Unknown'}) at this time`,
            details: {
              scheduleId: schedule.id,
              section: section || 'Unknown',
              subject: course?.course_code || 'Unknown',
              time: `${schedule.start_time.toLocaleTimeString()} - ${schedule.end_time.toLocaleTimeString()}`
            }
          });
        }
      }
    }

    // Check room conflicts (if roomId provided)
    if (roomId) {
      const roomSchedules = await prisma.class_schedule.findMany({
        where: {
          ...baseWhere,
          room_id: roomId
        }
      });

      // Get section info for conflicts
      const sectionIds = [...new Set(roomSchedules.map(s => s.section_id))];
      const sections = await prisma.sections.findMany({
        where: { id: { in: sectionIds } },
        select: { id: true, section_name: true }
      });
      const sectionMap = new Map(sections.map(s => [s.id, s.section_name]));

      for (const schedule of roomSchedules) {
        if (hasTimeOverlap(schedule.start_time, schedule.end_time)) {
          const section = sectionMap.get(schedule.section_id);
          conflicts.push({
            type: 'ROOM_CONFLICT',
            message: `Room already occupied by ${section || 'Unknown'} at this time`,
            details: {
              scheduleId: schedule.id,
              section: section || 'Unknown',
              time: `${schedule.start_time.toLocaleTimeString()} - ${schedule.end_time.toLocaleTimeString()}`
            }
          });
        }
      }
    }

    // Check section conflicts (if sectionId provided)
    if (sectionId) {
      const sectionSchedules = await prisma.class_schedule.findMany({
        where: {
          ...baseWhere,
          section_id: sectionId
        }
      });

      // Get course info for conflicts
      const courseIds = [...new Set(sectionSchedules.map(s => s.curriculum_course_id))];
      const courses = await prisma.curriculum_course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, course_code: true }
      });
      const courseMap = new Map(courses.map(c => [c.id, c.course_code]));

      for (const schedule of sectionSchedules) {
        if (hasTimeOverlap(schedule.start_time, schedule.end_time)) {
          const courseCode = courseMap.get(schedule.curriculum_course_id);
          conflicts.push({
            type: 'SECTION_CONFLICT',
            message: `Section already has ${courseCode || 'Unknown'} scheduled at this time`,
            details: {
              scheduleId: schedule.id,
              subject: courseCode || 'Unknown',
              time: `${schedule.start_time.toLocaleTimeString()} - ${schedule.end_time.toLocaleTimeString()}`
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to check conflicts' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/class-schedule/conflicts
 * Get all scheduled time slots for a given day, academic year, and semester
 * Used to show which rooms/faculty are already booked
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dayOfWeek = searchParams.get('dayOfWeek');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const currentSectionId = searchParams.get('currentSectionId');
    const excludeScheduleId = searchParams.get('excludeScheduleId');

    if (!dayOfWeek || !academicYear || !semester) {
      return NextResponse.json(
        { error: 'Missing required parameters: dayOfWeek, academicYear, semester' },
        { status: 400 }
      );
    }

    // Build where clause - exclude specific schedule if provided (for edit mode)
    const whereClause: any = {
      day_of_week: dayOfWeek,
      academic_year: academicYear,
      semester: semester,
      status: 'active'
    };

    // Exclude the schedule being edited
    if (excludeScheduleId) {
      whereClause.id = { not: parseInt(excludeScheduleId) };
    }

    // Fetch all active schedules for this day/term across ALL sections (excluding the one being edited)
    const schedules = await prisma.class_schedule.findMany({
      where: whereClause,
      select: {
        id: true,
        section_id: true,
        room_id: true,
        faculty_id: true,
        start_time: true,
        end_time: true,
        curriculum_course_id: true
      }
    });

    // Get section names for context
    const sectionIds = [...new Set(schedules.map(s => s.section_id))];
    const sections = await prisma.sections.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true, section_name: true }
    });
    const sectionMap = new Map(sections.map(s => [s.id, s.section_name]));

    // Get room info
    const roomIds = [...new Set(schedules.map(s => s.room_id))];
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, room_number: true }
    });
    const roomMap = new Map(rooms.map(r => [r.id, r.room_number]));

    // Get faculty info (filter out null faculty_id values)
    const facultyIds = [...new Set(schedules.map(s => s.faculty_id).filter(id => id !== null))];
    const facultyList = facultyIds.length > 0 
      ? await prisma.faculty.findMany({
          where: { id: { in: facultyIds } },
          select: { id: true, first_name: true, last_name: true }
        })
      : [];
    const facultyMap = new Map(facultyList.map(f => [f.id, `${f.first_name} ${f.last_name}`]));

    // Format response with time as HH:mm for easier comparison
    const occupiedSlots = schedules.map(schedule => {
      const startDate = new Date(schedule.start_time);
      const endDate = new Date(schedule.end_time);
      const isCurrentSection = currentSectionId ? schedule.section_id === parseInt(currentSectionId) : false;
      
      return {
        id: schedule.id,
        sectionId: schedule.section_id,
        sectionName: sectionMap.get(schedule.section_id) || 'Unknown',
        roomId: schedule.room_id,
        roomNumber: roomMap.get(schedule.room_id) || 'Unknown',
        facultyId: schedule.faculty_id,
        facultyName: schedule.faculty_id ? (facultyMap.get(schedule.faculty_id) || 'Unknown') : 'No Faculty',
        startTime: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
        endTime: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
        startMinutes: startDate.getHours() * 60 + startDate.getMinutes(),
        endMinutes: endDate.getHours() * 60 + endDate.getMinutes(),
        isCurrentSection
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        dayOfWeek,
        academicYear,
        semester,
        occupiedSlots
      }
    });
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflict data' },
      { status: 500 }
    );
  }
}
