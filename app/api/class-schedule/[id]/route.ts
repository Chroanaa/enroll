import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../../types/sectionTypes';

/**
 * DELETE /api/class-schedule/{id}
 * Delete a class schedule (only for draft sections)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scheduleId = parseInt(params.id);

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

    // Check if section is in draft status
    if (section.status !== 'draft') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Cannot delete schedule. Section must be in draft status. Current status: ${section.status}`
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

