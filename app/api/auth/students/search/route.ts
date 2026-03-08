import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '../../../../lib/prisma';

/**
 * GET /api/auth/students/search
 * Search students by name or student number
 * 
 * Query params:
 * - query: string (search term)
 * - academicStatus: 'all' | 'regular' | 'irregular' (default: 'all')
 * - programId: number (filter by program)
 * - majorId: number (filter by major)
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const academicStatus = searchParams.get('academicStatus') || 'all';
    const programId = searchParams.get('programId');
    const majorId = searchParams.get('majorId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50
    const listAll = searchParams.get('listAll') === 'true';

    // If not listing all and query is too short, return empty
    if (!listAll && query.length < 2) {
      return NextResponse.json({ data: [] });
    }

    // Use retry wrapper for database operations
    const result = await withRetry(async () => {
      const whereConditions: any[] = [];

      // Optimized search: prioritize student_number exact/prefix match first
      if (query.length >= 2) {
        // Check if query looks like a student number (contains digits or dash)
        const isStudentNumberLike = /[\d-]/.test(query);
        
        if (isStudentNumberLike) {
          // Prioritize student number search with startsWith for better index usage
          whereConditions.push({
            OR: [
              { student_number: { startsWith: query, mode: 'insensitive' } },
              { student_number: { contains: query, mode: 'insensitive' } },
            ]
          });
        } else {
          // Name search - use contains but limit fields
          whereConditions.push({
            OR: [
              { family_name: { startsWith: query, mode: 'insensitive' } },
              { first_name: { startsWith: query, mode: 'insensitive' } },
              { family_name: { contains: query, mode: 'insensitive' } },
              { first_name: { contains: query, mode: 'insensitive' } },
            ]
          });
        }
      }

      // Filter by academic status
      if (academicStatus !== 'all') {
        whereConditions.push({ academic_status: academicStatus });
      }

      // Filter by major (takes precedence over program)
      if (majorId) {
        whereConditions.push({ major_id: parseInt(majorId) });
      } else if (programId) {
        whereConditions.push({ course_program: programId });
      }

      // Execute optimized query with minimal fields
      const students = await prisma.enrollment.findMany({
        where: whereConditions.length > 0 ? { AND: whereConditions } : {},
        select: {
          id: true,
          student_number: true,
          first_name: true,
          middle_name: true,
          family_name: true,
          email_address: true,
          course_program: true,
          major_id: true,
          year_level: true,
          academic_status: true,
          academic_year: true
        },
        take: limit,
        orderBy: { family_name: 'asc' }
      });

      // Get payment status for students (for the irregular enrollment page)
      const academicYear = searchParams.get('academicYear');
      const semester = searchParams.get('semester');
      
      let paymentStatusMap = new Map<string, { status: string; mode: string; totalDue: number; totalPaid: number }>();
      
      if (academicYear && semester) {
        const semesterNum = semester === 'first' ? 1 : semester === 'second' ? 2 : parseInt(semester);
        const studentNumbers = students.map(s => s.student_number).filter(Boolean) as string[];
        
        if (studentNumbers.length > 0) {
          // Fetch assessments and payments
          const assessments = await prisma.student_assessment.findMany({
            where: {
              student_number: { in: studentNumbers },
              academic_year: academicYear,
              semester: semesterNum,
              status: 'finalized'
            },
            select: {
              student_number: true,
              payment_mode: true,
              total_due_cash: true,
              total_due_installment: true,
              base_total: true,
              payments: {
                select: {
                  amount_paid: true
                }
              }
            }
          });

          // Calculate payment status for each student
          assessments.forEach(assessment => {
            const totalDue = assessment.payment_mode.toLowerCase() === 'installment'
              ? Number(assessment.total_due_installment || assessment.base_total)
              : Number(assessment.total_due_cash || assessment.base_total);
            
            const totalPaid = assessment.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
            
            let status: 'Unpaid' | 'Partial' | 'Fully Paid';
            if (totalPaid === 0) {
              status = 'Unpaid';
            } else if (totalPaid < totalDue) {
              status = 'Partial';
            } else {
              status = 'Fully Paid';
            }
            
            paymentStatusMap.set(assessment.student_number, {
              status,
              mode: assessment.payment_mode,
              totalDue,
              totalPaid
            });
          });
        }
      }

      // Only fetch programs if we have students with programs
      const programIds = [...new Set(students.map(s => s.course_program).filter(Boolean))];
      
      let programMap = new Map();
      if (programIds.length > 0) {
        const programs = await prisma.program.findMany({
          where: {
            OR: [
              { id: { in: programIds.map(p => parseInt(p!) || 0).filter(p => p > 0) } },
              { code: { in: programIds.filter(p => p && isNaN(parseInt(p))) as string[] } }
            ]
          },
          select: { id: true, code: true, name: true }
        });

        programs.forEach(p => {
          programMap.set(p.id.toString(), p);
          programMap.set(p.code, p);
        });
      }

      return students.map(student => {
        const program = programMap.get(student.course_program || '');
        const paymentInfo = student.student_number ? paymentStatusMap.get(student.student_number) : null;
        
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
          majorId: student.major_id,
          yearLevel: student.year_level,
          academicStatus: student.academic_status || 'regular',
          academicYear: student.academic_year,
          paymentStatus: paymentInfo?.status || null,
          paymentMode: paymentInfo?.mode || null,
          totalDue: paymentInfo?.totalDue || null,
          totalPaid: paymentInfo?.totalPaid || null
        };
      });
    });

    return NextResponse.json({ data: result });

  } catch (error) {
    console.error('Error searching students:', error);
    return NextResponse.json(
      { error: 'Failed to search students' },
      { status: 500 }
    );
  }
}
