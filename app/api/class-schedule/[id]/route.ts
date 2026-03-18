import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../types/sectionTypes';

const toMinutes = (value: Date): number => {
  return value.getHours() * 60 + value.getMinutes();
};

/**
 * PATCH /api/class-schedule/{id}
 * Update a class schedule (faculty, room, day, time changes allowed for draft/active sections)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid schedule ID",
        } as ApiError,
        { status: 400 },
      );
    }

    const body = await request.json();
    const { facultyId, roomId, dayOfWeek, startTime, endTime } = body;

    // Get the schedule
    const schedule = await prisma.class_schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: `Schedule ${scheduleId} not found`,
        } as ApiError,
        { status: 404 },
      );
    }

    // Get the section to check status
    const section = await prisma.sections.findUnique({
      where: { id: schedule.section_id },
    });

    if (!section) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: `Section ${schedule.section_id} not found`,
        } as ApiError,
        { status: 404 },
      );
    }

    // Check if section allows modifications (draft or active)
    if (section.status === "locked" || section.status === "closed") {
      return NextResponse.json(
        {
          error: "INVALID_STATE",
          message: `Cannot update schedule. Section is ${section.status}.`,
        } as ApiError,
        { status: 400 },
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
          error: "VALIDATION_ERROR",
          message: "Start time must be before end time",
        } as ApiError,
        { status: 400 },
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
          status: "active",
          OR: [
            {
              AND: [
                { start_time: { lte: newStartTime } },
                { end_time: { gt: newStartTime } },
              ],
            },
            {
              AND: [
                { start_time: { lt: newEndTime } },
                { end_time: { gte: newEndTime } },
              ],
            },
            {
              AND: [
                { start_time: { gte: newStartTime } },
                { end_time: { lte: newEndTime } },
              ],
            },
          ],
        },
      });

      if (facultyConflict) {
        return NextResponse.json(
          {
            error: "FACULTY_CONFLICT",
            message: "Faculty has schedule conflict on this day and time",
          } as ApiError,
          { status: 409 },
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
          status: "active",
          OR: [
            {
              AND: [
                { start_time: { lte: newStartTime } },
                { end_time: { gt: newStartTime } },
              ],
            },
            {
              AND: [
                { start_time: { lt: newEndTime } },
                { end_time: { gte: newEndTime } },
              ],
            },
            {
              AND: [
                { start_time: { gte: newStartTime } },
                { end_time: { lte: newEndTime } },
              ],
            },
          ],
        },
      });

      if (roomConflict) {
        return NextResponse.json(
          {
            error: "ROOM_CONFLICT",
            message: "Room is already booked on this day and time",
          } as ApiError,
          { status: 409 },
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
          status: "active",
          OR: [
            {
              AND: [
                { start_time: { lte: newStartTime } },
                { end_time: { gt: newStartTime } },
              ],
            },
            {
              AND: [
                { start_time: { lt: newEndTime } },
                { end_time: { gte: newEndTime } },
              ],
            },
            {
              AND: [
                { start_time: { gte: newStartTime } },
                { end_time: { lte: newEndTime } },
              ],
            },
          ],
        },
      });

      if (sectionConflict) {
        return NextResponse.json(
          {
            error: "SECTION_CONFLICT",
            message: "Section has another class scheduled at this time",
          } as ApiError,
          { status: 409 },
        );
      }
    }

    // Protect assigned students (regular + irregular): do not allow schedule updates
    // that create conflicts with their other enrolled class schedules.
    if (dayOfWeek || startTime || endTime) {
      const affectedStudentRows = await prisma.$queryRaw<any[]>`
        SELECT
          ss.student_number,
          cs.day_of_week,
          cs.start_time,
          cs.end_time
        FROM student_section_subjects current_sss
        JOIN student_section ss ON ss.id = current_sss.student_section_id
        JOIN student_section_subjects other_sss ON other_sss.student_section_id = ss.id
        JOIN class_schedule cs ON cs.id = other_sss.class_schedule_id
        WHERE current_sss.class_schedule_id = ${scheduleId}
          AND other_sss.class_schedule_id <> ${scheduleId}
          AND cs.status = 'active'
      `;

      const targetDay = String(newDayOfWeek || '').trim().toLowerCase();
      const targetStart = toMinutes(newStartTime);
      const targetEnd = toMinutes(newEndTime);

      const conflictedStudents = new Set<string>();
      for (const row of affectedStudentRows) {
        const rowDay = String(row.day_of_week || '').trim().toLowerCase();
        if (rowDay !== targetDay) continue;

        const rowStart = toMinutes(new Date(row.start_time));
        const rowEnd = toMinutes(new Date(row.end_time));
        const hasOverlap = targetStart < rowEnd && targetEnd > rowStart;
        if (hasOverlap) {
          conflictedStudents.add(String(row.student_number));
        }
      }

      if (conflictedStudents.size > 0) {
        const previewStudents = Array.from(conflictedStudents).slice(0, 8);
        return NextResponse.json(
          {
            error: "STUDENT_CONFLICT",
            message: `Cannot update schedule. It conflicts with other classes of ${conflictedStudents.size} enrolled student(s): ${previewStudents.join(', ')}${conflictedStudents.size > previewStudents.length ? ', ...' : ''}`,
          } as ApiError,
          { status: 409 },
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
      data: updateData,
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
        status: updatedSchedule.status,
      },
    });
  } catch (error) {
    console.error("Error updating class schedule:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to update schedule",
      } as ApiError,
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/class-schedule/{id}
 * Delete a class schedule (only for draft sections)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid schedule ID",
        } as ApiError,
        { status: 400 },
      );
    }

    // Get the schedule
    const schedule = await prisma.class_schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: `Schedule ${scheduleId} not found`,
        } as ApiError,
        { status: 404 },
      );
    }

    // Get the section to check status
    const section = await prisma.sections.findUnique({
      where: { id: schedule.section_id },
    });

    if (!section) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: `Section ${schedule.section_id} not found`,
        } as ApiError,
        { status: 404 },
      );
    }

    // Check if section allows modifications (draft or active)
    if (section.status === "locked" || section.status === "closed") {
      return NextResponse.json(
        {
          error: "INVALID_STATE",
          message: `Cannot delete schedule. Section is ${section.status}.`,
        } as ApiError,
        { status: 400 },
      );
    }

    // Delete schedule and cleanup orphan irregular assignments.
    // student_section_subjects rows are removed by FK cascade.
    await prisma.$transaction(async (tx) => {
      const affectedStudentSections = await tx.student_section_subjects.findMany({
        where: { class_schedule_id: scheduleId },
        distinct: ['student_section_id'],
        select: { student_section_id: true }
      });

      const affectedIds = affectedStudentSections.map((row: any) => row.student_section_id);

      await tx.class_schedule.delete({
        where: { id: scheduleId },
      });

      if (affectedIds.length === 0) return;

      const irregularRows = await tx.student_section.findMany({
        where: {
          id: { in: affectedIds },
          assignment_type: 'irregular'
        },
        select: {
          id: true,
          section_id: true
        }
      });

      if (irregularRows.length === 0) return;

      const irregularIds = irregularRows.map((row: any) => row.id);
      const remaining = await tx.student_section_subjects.groupBy({
        by: ['student_section_id'],
        where: {
          student_section_id: { in: irregularIds }
        },
        _count: {
          student_section_id: true
        }
      });

      const stillHasSubjects = new Set(
        remaining
          .filter((row: any) => row._count.student_section_id > 0)
          .map((row: any) => row.student_section_id)
      );

      const orphanRows = irregularRows.filter((row: any) => !stillHasSubjects.has(row.id));
      if (orphanRows.length === 0) return;

      await tx.student_section.deleteMany({
        where: {
          id: { in: orphanRows.map((row: any) => row.id) }
        }
      });

      const decrementBySection = new Map<number, number>();
      for (const row of orphanRows) {
        decrementBySection.set(
          row.section_id,
          (decrementBySection.get(row.section_id) || 0) + 1
        );
      }

      for (const [sectionId, count] of decrementBySection.entries()) {
        await tx.sections.update({
          where: { id: sectionId },
          data: {
            student_count: { decrement: count }
          }
        });
      }
    });

    return NextResponse.json(
      { success: true, message: "Schedule deleted successfully and affected irregular assignments were reconciled" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting class schedule:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete schedule",
      } as ApiError,
      { status: 500 },
    );
  }
}
