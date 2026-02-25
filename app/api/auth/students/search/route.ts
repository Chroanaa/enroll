import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

/**
 * GET /api/auth/students/search
 * Search students by name or student number
 * 
 * Query params:
 * - query: string (search term)
 * - academicStatus: 'all' | 'regular' | 'irregular' (default: 'all')
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const academicStatus = searchParams.get('academicStatus') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (query.length < 2) {
      return NextResponse.json({ data: [] });
    }

    const students = await prisma.enrollment.findMany({
      where: {
        AND: [
          // Search by name or student number
          {
            OR: [
              { student_number: { contains: query, mode: 'insensitive' } },
              { first_name: { contains: query, mode: 'insensitive' } },
              { family_name: { contains: query, mode: 'insensitive' } },
              { middle_name: { contains: query, mode: 'insensitive' } }
            ]
          },
          // Filter by academic status
          ...(academicStatus !== 'all' ? [{ academic_status: academicStatus }] : [])
        ]
      },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        email_address: true,
        course_program: true,
        year_level: true,
        academic_status: true,
        academic_year: true
      },
      take: limit,
      orderBy: { family_name: 'asc' }
    });

    // Get program details for each student
    const programIds = [...new Set(students.map(s => s.course_program).filter(Boolean))];
    const programs = await prisma.program.findMany({
      where: {
        OR: [
          { id: { in: programIds.map(p => parseInt(p!) || 0).filter(p => p > 0) } },
          { code: { in: programIds.filter(p => p && isNaN(parseInt(p))) as string[] } }
        ]
      },
      select: { id: true, code: true, name: true }
    });

    const programMap = new Map();
    programs.forEach(p => {
      programMap.set(p.id.toString(), p);
      programMap.set(p.code, p);
    });

    const formattedStudents = students.map(student => {
      const program = programMap.get(student.course_program || '');
      return {
        studentId: student.id,
        studentNumber: student.student_number || '',
        firstName: student.first_name || '',
        middleName: student.middle_name || '',
        lastName: student.family_name || '',
        name: `${student.first_name || ''} ${student.middle_name || ''} ${student.family_name || ''}`.trim(),
        email: student.email_address || '',
        programId: program?.id || 0,
        programCode: program?.code || student.course_program || '',
        programName: program?.name || '',
        yearLevel: student.year_level,
        academicStatus: student.academic_status || 'regular',
        academicYear: student.academic_year
      };
    });

    return NextResponse.json({ data: formattedStudents });

  } catch (error) {
    console.error('Error searching students:', error);
    return NextResponse.json(
      { error: 'Failed to search students' },
      { status: 500 }
    );
  }
}
