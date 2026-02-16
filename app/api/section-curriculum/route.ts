import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

/**
 * GET /api/section-curriculum
 * Get curriculum courses for section scheduling
 *
 * Query params:
 * - programId: number
 * - yearLevel: number
 * - semester: string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearLevel = searchParams.get('yearLevel');
    const semester = searchParams.get('semester');

    if (!yearLevel || !semester) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing required query parameters: yearLevel, semester'
        },
        { status: 400 }
      );
    }

    const normalizedSemester = semester.toLowerCase();
    const semesterNumber =
      normalizedSemester === 'first' ? 1 :
      normalizedSemester === 'second' ? 2 :
      normalizedSemester === 'summer' ? 3 :
      parseInt(semester, 10);

    if (Number.isNaN(semesterNumber)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid semester value'
        },
        { status: 400 }
      );
    }

    const curriculum = await prisma.curriculum_course.findMany({
      where: {
        year_level: parseInt(yearLevel),
        semester: semesterNumber,
        curriculum: {
          status: 'active'
        }
      },
      include: {
        curriculum: true
      },
      orderBy: { course_code: 'asc' }
    });

    return NextResponse.json({ success: true, data: curriculum });
  } catch (error) {
    console.error('Error fetching section curriculum:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch curriculum'
      },
      { status: 500 }
    );
  }
}
