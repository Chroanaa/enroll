import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { termValidator } from '../../../../utils/sectionService';
import { ApiError, SectionResponse } from '../../../../types/sectionTypes';

/**
 * PATCH /api/sections/{id}/activate
 * Activate a draft section after schedule is built
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

    // Validate section can be activated
    const validation = await termValidator.validateSectionForActivation(
      sectionId
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'ACTIVATION_ERROR',
          message: validation.errors.join('; ')
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

    if (section.status !== 'draft') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Section must be in draft status to activate. Current status: ${section.status}`
        } as ApiError,
        { status: 400 }
      );
    }

    // Activate section in transaction
    const updatedSection = await prisma.$transaction(async (tx: any) => {
      return await tx.sections.update({
        where: { id: sectionId },
        data: {
          status: 'active'
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
    console.error('Error activating section:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to activate section'
      } as ApiError,
      { status: 500 }
    );
  }
}

