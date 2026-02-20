import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { ApiError, SectionResponse } from '../../../../types/sectionTypes';

/**
 * PATCH /api/sections/{id}/unlock
 * Unlock a locked section (allows modifications again)
 */
export async function PATCH(
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

    if (section.status !== 'locked') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Section must be in locked status to unlock. Current status: ${section.status}`
        } as ApiError,
        { status: 400 }
      );
    }

    // Unlock section - return to active status
    const updatedSection = await prisma.sections.update({
      where: { id: sectionId },
      data: {
        status: 'active'
      }
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
    console.error('Error unlocking section:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to unlock section'
      } as ApiError,
      { status: 500 }
    );
  }
}
