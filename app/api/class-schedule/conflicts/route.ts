import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

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

    // Get faculty info
    const facultyIds = [...new Set(schedules.map(s => s.faculty_id))];
    const facultyList = await prisma.faculty.findMany({
      where: { id: { in: facultyIds } },
      select: { id: true, first_name: true, last_name: true }
    });
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
        facultyName: facultyMap.get(schedule.faculty_id) || 'Unknown',
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
