import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

interface EnrollmentReportBulkRequest {
  verificationTab?: 'pending' | 'verified' | 'all';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as EnrollmentReportBulkRequest;
    const verificationTab = body?.verificationTab || 'all';

    const where: any = {};
    if (verificationTab === 'pending') {
      where.verification_status = 'pending';
    } else if (verificationTab === 'verified') {
      where.NOT = { verification_status: 'pending' };
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      orderBy: [{ admission_date: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        student_number: true,
        family_name: true,
        first_name: true,
        middle_name: true,
        email_address: true,
        sex: true,
        status: true,
        admission_date: true,
        course_program: true,
        major_id: true,
        verification_status: true,
        academic_year: true,
        term: true,
      },
    });

    const programIds = Array.from(
      new Set(
        enrollments
          .map((enrollment) => Number.parseInt(enrollment.course_program || '', 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );
    const majorIds = Array.from(
      new Set(
        enrollments
          .map((enrollment) => enrollment.major_id)
          .filter((id): id is number => typeof id === 'number' && id > 0)
      )
    );

    const [programs, majors] = await Promise.all([
      programIds.length
        ? prisma.program.findMany({
            where: { id: { in: programIds } },
            select: { id: true, code: true, name: true },
          })
        : [],
      majorIds.length
        ? prisma.major.findMany({
            where: { id: { in: majorIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const programsById = new Map<number, any>(
      (programs as any[]).map((program: any) => [program.id, program])
    );
    const majorsById = new Map<number, any>((majors as any[]).map((major: any) => [major.id, major]));

    const rows = enrollments.map((enrollment) => {
      const programId = Number.parseInt(enrollment.course_program || '', 10);
      const program = Number.isNaN(programId) ? null : programsById.get(programId) || null;
      const major =
        enrollment.major_id !== null && enrollment.major_id !== undefined
          ? majorsById.get(enrollment.major_id) || null
          : null;

      return {
        ...enrollment,
        program_id: program?.id ?? null,
        program_name: program?.name ?? null,
        program_code: program?.code ?? null,
        major_name: major?.name ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching enrollment report data in bulk:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch enrollment report data',
      },
      { status: 500 }
    );
  }
}
