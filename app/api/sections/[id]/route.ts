import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { termValidator } from '../../../utils/sectionService';
import { ApiError, SectionResponse } from '../../../types/sectionTypes';

/**
 * GET /api/sections/{id}
 * Get section details
 */

/**
 * GET /api/sections/{id}
 * Get section details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sectionId = parseInt(id);

    if (isNaN(sectionId)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid section ID'
        } as ApiError,
        { status: 400 }
      );
    }

    const section = await prisma.sections.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Section ${sectionId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    const response: SectionResponse = {
      id: section.id,
      programId: section.program_id,
      yearLevel: section.year_level ?? 0,
      academicYear: section.academic_year ?? '',
      semester: section.semester ?? '',
      sectionName: section.section_name,
      advisor: section.advisor,
      maxCapacity: section.max_capacity ?? 0,
      studentCount: section.student_count ?? 0,
      status: section.status as 'draft' | 'active' | 'locked' | 'closed',
      createdAt: section.created_at?.toISOString() ?? ''
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching section:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to fetch section'
      } as ApiError,
      { status: 500 }
    );
  }
}
