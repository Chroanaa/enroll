import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

/**
 * GET /api/section-schedules
 * Get schedules for a section
 *
 * Query params:
 * - sectionId: number
 * - academicYear: string
 * - semester: string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');

    if (!sectionId || !academicYear || !semester) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing required query parameters: sectionId, academicYear, semester'
        },
        { status: 400 }
      );
    }

    const schedules = await prisma.class_schedule.findMany({
      where: {
        section_id: parseInt(sectionId),
        academic_year: academicYear,
        semester: semester
      },
      orderBy: [
        { day_of_week: 'asc' },
        { start_time: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    console.error('Error fetching section schedules:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch schedules'
      },
      { status: 500 }
    );
  }
}
