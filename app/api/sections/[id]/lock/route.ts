import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { ApiError, SectionResponse } from '../../../../types/sectionTypes';

/**
 * PATCH /api/sections/{id}/lock
 * Lock an active section (prevents further modifications)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sectionId = parseInt(params.id);

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

    if (section.status !== 'active') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Section must be in active status to lock. Current status: ${section.status}`
        } as ApiError,
        { status: 400 }
      );
    }

    // Lock section in transaction
    const updatedSection = await prisma.$transaction(async (tx: any) => {
      return await tx.sections.update({
        where: { id: sectionId },
        data: {
          status: 'locked'
        }
      });
    });

    const response: SectionResponse = {
      id: updatedSection.id,
      programId: updatedSection.program_id,
      yearLevel: updatedSection.year_level ?? 0,
      academicYear: updatedSection.academic_year ?? '',
      semester: updatedSection.semester ?? '',
      sectionName: updatedSection.section_name,
      advisor: updatedSection.advisor,
      maxCapacity: updatedSection.max_capacity ?? 0,
      studentCount: updatedSection.student_count ?? 0,
      status: updatedSection.status as 'draft' | 'active' | 'locked' | 'closed',
      createdAt: updatedSection.created_at?.toISOString() ?? ''
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error locking section:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to lock section'
      } as ApiError,
      { status: 500 }
    );
  }
}

