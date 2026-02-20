import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../../types/sectionTypes';

/**
 * PATCH /api/class-schedule/{id}
 * Update a class schedule (faculty, room, day, time changes allowed for draft/active sections)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid schedule ID'
        } as ApiError,
        { status: 400 }
      );
    }

    const body = await request.json();
    const { facultyId, roomId, dayOfWeek, startTime, endTime } = body;

    // Get the schedule
    const schedule = await prisma.class_schedule.findUnique({
      where: { id: scheduleId }
    });

    if (!schedule) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Schedule ${scheduleId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Get the section to check status
    const section = await prisma.sections.findUnique({
      where: { id: schedule.section_id }
    });

    if (!section) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Section ${schedule.section_id} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Check if section allows modifications (draft or active)
    if (section.status === 'locked' || section.status === 'closed') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Cannot update schedule. Section is ${section.status}.`
        } as ApiError,
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    
    // Parse times if provided
    const newStartTime = startTime ? new Date(startTime) : schedule.start_time;
    const newEndTime = endTime ? new Date(endTime) : schedule.end_time;
    const newDayOfWeek = dayOfWeek || schedule.day_of_week;
    const newFacultyId = facultyId ? parseInt(facultyId) : schedule.faculty_id;
    const newRoomId = roomId ? parseInt(roomId) : schedule.room_id;

    // Validate time
    if (newStartTime >= newEndTime) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Start time must be before end time'
        } as ApiError,
        { status: 400 }
      );
    }

    // Check for faculty conflicts (if faculty or time changed)
    if (facultyId || dayOfWeek || startTime || endTime) {
      const facultyConflict = await prisma.class_schedule.findFirst({
        where: {
          id: { not: scheduleId },
          faculty_id: newFacultyId,
          day_of_week: newDayOfWeek,
          academic_year: schedule.academic_year,
          semester: schedule.semester,
          status: 'active',
          OR: [
            {
              AND: [
                { start_time: { lte: newStartTime } },
                { end_time: { gt: newStartTime } }
              ]
            },
            {
              AND: [
                { start_time: { lt: newEndTime } },
                { end_time: { gte: newEndTime } }
              ]
            },
            {
              AND: [
                { start_time: { gte: newStartTime } },
                { end_time: { lte: newEndTime } }
              ]
            }
          ]
        }
      });

      if (facultyConflict) {
        return NextResponse.json(
          {
            error: 'FACULTY_CONFLICT',
            message: 'Faculty has schedule conflict on this day and time'
          } as ApiError,
          { status: 409 }
        );
      }
    }

    // Check for room conflicts (if room or time changed)
    if (roomId || dayOfWeek || startTime || endTime) {
      const roomConflict = await prisma.class_schedule.findFirst({
        where: {
          id: { not: scheduleId },
          room_id: newRoomId,
          day_of_week: newDayOfWeek,
          academic_year: schedule.academic_year,
          semester: schedule.semester,
          status: 'active',
          OR: [
            {
              AND: [
                { start_time: { lte: newStartTime } },
                { end_time: { gt: newStartTime } }
              ]
            },
            {
              AND: [
                { start_time: { lt: newEndTime } },
                { end_time: { gte: newEndTime } }
              ]
            },
            {
              AND: [
                { start_time: { gte: newStartTime } },
                { end_time: { lte: newEndTime } }
              ]
            }
          ]
        }
      });

      if (roomConflict) {
        return NextResponse.json(
          {
            error: 'ROOM_CONFLICT',
            message: 'Room is already booked on this day and time'
          } as ApiError,
          { status: 409 }
        );
      }
    }

    // Check for section conflicts (if time changed)
    if (dayOfWeek || startTime || endTime) {
      const sectionConflict = await prisma.class_schedule.findFirst({
        where: {
          id: { not: scheduleId },
          section_id: schedule.section_id,
          day_of_week: newDayOfWeek,
          academic_year: schedule.academic_year,
          semester: schedule.semester,
          status: 'active',
          OR: [
            {
              AND: [
                { start_time: { lte: newStartTime } },
                { end_time: { gt: newStartTime } }
              ]
            },
            {
              AND: [
                { start_time: { lt: newEndTime } },
                { end_time: { gte: newEndTime } }
              ]
            },
            {
              AND: [
                { start_time: { gte: newStartTime } },
                { end_time: { lte: newEndTime } }
              ]
            }
          ]
        }
      });

      if (sectionConflict) {
        return NextResponse.json(
          {
            error: 'SECTION_CONFLICT',
            message: 'Section has another class scheduled at this time'
          } as ApiError,
          { status: 409 }
        );
      }
    }

    // Build update object
    if (facultyId) updateData.faculty_id = newFacultyId;
    if (roomId) updateData.room_id = newRoomId;
    if (dayOfWeek) updateData.day_of_week = newDayOfWeek;
    if (startTime) updateData.start_time = newStartTime;
    if (endTime) updateData.end_time = newEndTime;

    // Update the schedule
    const updatedSchedule = await prisma.class_schedule.update({
      where: { id: scheduleId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedSchedule.id,
        sectionId: updatedSchedule.section_id,
        curriculumCourseId: updatedSchedule.curriculum_course_id,
        facultyId: updatedSchedule.faculty_id,
        roomId: updatedSchedule.room_id,
        dayOfWeek: updatedSchedule.day_of_week,
        startTime: updatedSchedule.start_time?.toISOString(),
        endTime: updatedSchedule.end_time?.toISOString(),
        academicYear: updatedSchedule.academic_year,
        semester: updatedSchedule.semester,
        status: updatedSchedule.status
      }
    });
  } catch (error) {
    console.error('Error updating class schedule:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to update schedule'
      } as ApiError,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/class-schedule/{id}
 * Delete a class schedule (only for draft sections)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid schedule ID'
        } as ApiError,
        { status: 400 }
      );
    }

    // Get the schedule
    const schedule = await prisma.class_schedule.findUnique({
      where: { id: scheduleId }
    });

    if (!schedule) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Schedule ${scheduleId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Get the section to check status
    const section = await prisma.sections.findUnique({
      where: { id: schedule.section_id }
    });

    if (!section) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Section ${schedule.section_id} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Check if section allows modifications (draft or active)
    if (section.status === 'locked' || section.status === 'closed') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Cannot delete schedule. Section is ${section.status}.`
        } as ApiError,
        { status: 400 }
      );
    }

    // Delete the schedule
    await prisma.class_schedule.delete({
      where: { id: scheduleId }
    });

    return NextResponse.json(
      { success: true, message: 'Schedule deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting class schedule:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to delete schedule'
      } as ApiError,
      { status: 500 }
    );
  }
}

