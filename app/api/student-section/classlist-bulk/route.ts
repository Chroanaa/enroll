import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

const normalizeSemesterValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'first' || normalized === 'first semester') return 'first';
  if (normalized === '2' || normalized === 'second' || normalized === 'second semester') return 'second';
  if (normalized === '3' || normalized === 'summer') return 'summer';
  return null;
};

interface BulkClasslistRequest {
  sectionIds: number[];
  academicYear?: string;
  semester?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkClasslistRequest;
    const sectionIds = Array.isArray(body?.sectionIds)
      ? body.sectionIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];

    if (sectionIds.length === 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'sectionIds must be a non-empty number array' },
        { status: 400 }
      );
    }

    const where: any = {
      section_id: { in: sectionIds },
    };

    if (body.academicYear) {
      where.academic_year = body.academicYear;
    }

    if (body.semester) {
      const normalizedSemester = normalizeSemesterValue(body.semester);
      if (normalizedSemester) {
        where.semester = normalizedSemester;
      }
    }

    const assignments = await prisma.student_section.findMany({
      where,
      select: {
        id: true,
        section_id: true,
        student_number: true,
        assignment_type: true,
      },
      orderBy: [{ section_id: 'asc' }, { student_number: 'asc' }],
    });

    const studentNumbers = Array.from(
      new Set(assignments.map((assignment) => assignment.student_number).filter(Boolean))
    );

    const enrollments = studentNumbers.length
      ? await prisma.enrollment.findMany({
          where: { student_number: { in: studentNumbers } },
          select: {
            student_number: true,
            first_name: true,
            middle_name: true,
            family_name: true,
            email_address: true,
          },
        })
      : [];

    const enrollmentMap = new Map(enrollments.map((item) => [item.student_number, item]));
    const bySection: Record<
      string,
      Array<{
        studentNumber: string;
        name: string;
        assignmentType: string;
        email: string | null;
      }>
    > = {};

    for (const sectionId of sectionIds) {
      bySection[String(sectionId)] = [];
    }

    for (const assignment of assignments) {
      const enrollment = enrollmentMap.get(assignment.student_number);
      const composedName = enrollment
        ? `${enrollment.first_name || ''} ${enrollment.middle_name || ''} ${enrollment.family_name || ''}`.trim()
        : assignment.student_number;

      bySection[String(assignment.section_id)].push({
        studentNumber: assignment.student_number,
        name: composedName,
        assignmentType: assignment.assignment_type || 'regular',
        email: enrollment?.email_address ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        bySection,
      },
    });
  } catch (error) {
    console.error('Error fetching bulk classlist data:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch classlists',
      },
      { status: 500 }
    );
  }
}

