import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import {
  capacityValidator,
  termValidator
} from '../../utils/sectionService';
import {
  BulkAssignStudentsRequest,
  BulkAssignStudentsResponse,
  ApiError
} from '../../types/sectionTypes';

const normalizeSemesterValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'first' || normalized === 'first semester') return 'first';
  if (normalized === '2' || normalized === 'second' || normalized === 'second semester') return 'second';
  if (normalized === '3' || normalized === 'summer') return 'summer';
  return null;
};

/**
 * POST /api/student-section/bulk
 * Bulk assign students to a section
 *
 * Request Body:
 * - sectionId: number
 * - studentNumbers: string[]
 * - academicYear: string
 * - semester: string
 */
export async function POST(request: NextRequest) {
  try {
    const body: BulkAssignStudentsRequest = await request.json();

    // Validate required fields
    if (!body.sectionId || !body.studentNumbers || !Array.isArray(body.studentNumbers)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message:
            'Missing required fields: sectionId, studentNumbers (array), academicYear, semester'
        } as ApiError,
        { status: 400 }
      );
    }

    if (body.studentNumbers.length === 0) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'studentNumbers array cannot be empty'
        } as ApiError,
        { status: 400 }
      );
    }

    const normalizedSemester = body.semester ? normalizeSemesterValue(body.semester) : null;
    if (!normalizedSemester) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Semester must be "first", "second", or "summer"'
        } as ApiError,
        { status: 400 }
      );
    }

    // Check section exists and is active
    const section = await prisma.sections.findUnique({
      where: { id: body.sectionId }
    });

    if (!section) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Section ${body.sectionId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    if (section.status !== 'active') {
      const statusMessage = section.status === 'locked' 
        ? 'Section is locked. No student assignments allowed.'
        : section.status === 'draft'
        ? 'Section is in draft. Activate section before assigning students.'
        : `Can only assign students to active sections. Current status: ${section.status}`;
      
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: statusMessage
        } as ApiError,
        { status: 400 }
      );
    }

    const failed: Array<{ studentNumber: string; reason: string }> = [];
    let assigned = 0;

    // Process each student
    for (const studentNumber of body.studentNumbers) {
      try {
        // Verify student exists
        const student = await prisma.students.findUnique({
          where: { student_number: studentNumber }
        });

        if (!student) {
          failed.push({
            studentNumber,
            reason: 'Student not found'
          });
          continue;
        }

        // Check if student already assigned for this term
        const alreadyAssigned =
          await termValidator.checkStudentAlreadyAssigned(
            studentNumber,
            body.academicYear,
            normalizedSemester
          );

        if (alreadyAssigned) {
          failed.push({
            studentNumber,
            reason: 'Student already assigned for this term'
          });
          continue;
        }

        // Check capacity
        const { canAdd } = await capacityValidator.canAddStudents(
          body.sectionId,
          1
        );

        if (!canAdd) {
          failed.push({
            studentNumber,
            reason: 'Section is at capacity'
          });
          continue;
        }

        // Assign student in transaction
        await prisma.$transaction(async (tx: any) => {
          // Insert into student_section
          await tx.student_section.create({
            data: {
              student_number: studentNumber,
              section_id: body.sectionId,
              academic_year: body.academicYear,
              semester: normalizedSemester
            }
          });

          // Increment section student count
          await tx.sections.update({
            where: { id: body.sectionId },
            data: {
              student_count: {
                increment: 1
              }
            }
          });
        });

        assigned++;
      } catch (error) {
        console.error(`Error assigning student ${studentNumber}:`, error);
        failed.push({
          studentNumber,
          reason:
            error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }

    const response: BulkAssignStudentsResponse = {
      sectionId: body.sectionId,
      assigned,
      failed
    };

    const statusCode = assigned > 0 && failed.length > 0 ? 207 : 200;

    return NextResponse.json({ success: true, data: response }, { status: statusCode });
  } catch (error) {
    console.error('Error bulk assigning students:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to assign students'
      } as ApiError,
      { status: 500 }
    );
  }
}

/**
 * GET /api/student-section
 * Get student assignments with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const studentNumber = searchParams.get('studentNumber');

    const where: any = {};

    if (sectionId) where.section_id = parseInt(sectionId);
    if (academicYear) where.academic_year = academicYear;
    if (semester) {
      const normalized = normalizeSemesterValue(semester);
      if (normalized) {
        where.semester = normalized;
      }
    }
    if (studentNumber) where.student_number = studentNumber;

    const assignments = await prisma.student_section.findMany({
      where,
      orderBy: { student_number: 'asc' }
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch student assignments'
      } as ApiError,
      { status: 500 }
    );
  }
}
