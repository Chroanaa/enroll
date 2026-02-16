import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

/**
 * GET /api/section-curriculum
 * Get curriculum courses for section scheduling
 *
 * Query params:
 * - programId: number (required)
 * - yearLevel: number (required)
 * - semester: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const yearLevel = searchParams.get('yearLevel');
    const semester = searchParams.get('semester');

    if (!programId || !yearLevel || !semester) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing required query parameters: programId, yearLevel, semester'
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

    // Find program to get program code
    const program = await prisma.program.findUnique({
      where: { id: parseInt(programId) },
      select: { code: true, name: true }
    });

    if (!program) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Program ${programId} not found`
        },
        { status: 404 }
      );
    }

    // Find active curriculum for this program
    const activeCurriculum = await prisma.curriculum.findFirst({
      where: {
        program_code: program.code,
        status: 'active'
      },
      orderBy: {
        effective_year: 'desc'
      }
    });

    if (!activeCurriculum) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'No active curriculum found for this program'
        },
        { status: 404 }
      );
    }

    // Get curriculum courses
    const curriculum = await prisma.curriculum_course.findMany({
      where: {
        curriculum_id: activeCurriculum.id,
        year_level: parseInt(yearLevel),
        semester: semesterNumber
      },
      include: {
        curriculum: {
          select: {
            program_name: true,
            program_code: true,
            effective_year: true
          }
        }
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
