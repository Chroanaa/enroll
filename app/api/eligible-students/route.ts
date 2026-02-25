import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

/**
 * GET /api/eligible-students
 * Get students eligible for section assignment
 *
 * Query params:
 * - sectionId: number (OR programId, yearLevel, academicYear, semester for backward compatibility)
 * - programId: number
 * - yearLevel: number
 * - academicYear: string
 * - semester: string
 * - academicStatus: 'regular' | 'irregular' | 'all' (default: 'regular')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const programId = searchParams.get('programId');
    const yearLevel = searchParams.get('yearLevel');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const academicStatus = searchParams.get('academicStatus') || 'regular'; // NEW: Filter by academic status

    let targetProgramId = programId ? parseInt(programId) : null;
    let targetYearLevel = yearLevel;
    let targetAcademicYear = academicYear || null;
    let targetSemester = semester || null;

    // If sectionId provided, fetch section details
    if (sectionId) {
      const section = await prisma.sections.findUnique({
        where: { id: parseInt(sectionId) }
      });

      if (!section) {
        return NextResponse.json(
          {
            error: 'NOT_FOUND',
            message: `Section ${sectionId} not found`
          },
          { status: 404 }
        );
      }

      targetProgramId = section.program_id;
      targetYearLevel = section.year_level?.toString() || null;
      targetAcademicYear = section.academic_year ?? null;
      targetSemester = section.semester ?? null;
    } else if (!programId || !yearLevel || !academicYear || !semester) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing required query parameters: (sectionId) OR (programId, yearLevel, academicYear, semester)'
        },
        { status: 400 }
      );
    }

    // Fetch section to get program details if needed
    const program = await prisma.program.findUnique({
      where: { id: targetProgramId! }
    });

    if (!program) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Program ${targetProgramId} not found`
        },
        { status: 404 }
      );
    }

    const normalizeSemesterValue = (value: string | null) => {
      if (!value) return null;
      const normalized = value.trim().toLowerCase();
      if (normalized === '1' || normalized === 'first' || normalized === 'first semester') return 'first';
      if (normalized === '2' || normalized === 'second' || normalized === 'second semester') return 'second';
      if (normalized === '3' || normalized === 'summer') return 'summer';
      return value;
    };

    const normalizedSemester = normalizeSemesterValue(targetSemester);

    if (!normalizedSemester) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid semester value'
        },
        { status: 400 }
      );
    }

    // Get all enrolled students matching criteria from enrollment table
    // Note: enrollment table uses 'term' field for semester
    console.log('Searching for eligible students with:', {
      programId: targetProgramId,
      yearLevel: targetYearLevel,
      academicYear: targetAcademicYear,
      semester: normalizedSemester
    });

    // First, let's check what students exist with this program
    const allEnrollments = await prisma.enrollment.findMany({
      where: {
        OR: [
          { course_program: targetProgramId!.toString() },
          { course_program: program.code }, // Try program code
          { course_program: program.name }, // Try program name
        ],
        year_level: parseInt(targetYearLevel!)
      },
      select: {
        id: true,
        student_number: true,
        course_program: true,
        year_level: true,
        academic_year: true,
        term: true,
        status: true
      },
      take: 5
    });
    
    console.log('Sample enrollments found:', allEnrollments);

    const enrolledStudents = await prisma.enrollment.findMany({
      where: {
        OR: [
          { course_program: targetProgramId!.toString() },
          { course_program: program.code }, // Try program code like "BSIT"
          { course_program: program.name }, // Try program name
        ],
        year_level: parseInt(targetYearLevel!),
        // Filter by academic status (regular/irregular)
        ...(academicStatus !== 'all' && { academic_status: academicStatus })
      },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        email_address: true,
        course_program: true,
        academic_year: true,
        term: true,
        academic_status: true
      }
    });

    console.log(`Found ${enrolledStudents.length} enrolled students`);

    // Filter students by academic year and term
    const matchingStudents = enrolledStudents.filter(enrollment => {
      // Check if academic year matches (could be "2024", "2024-2025", or "2025-2026" format)
      const enrollmentYear = enrollment.academic_year;
      let yearMatches = false;
      
      if (enrollmentYear) {
        const targetYear = targetAcademicYear!;
        // Check if enrollment year contains target year
        // e.g., "2025-2026" contains "2025" or "2026"
        yearMatches = enrollmentYear.includes(targetYear);
        
        // Also check if target year is the start of the range
        // e.g., target "2025" matches "2025-2026"
        if (!yearMatches && enrollmentYear.includes('-')) {
          const [startYear] = enrollmentYear.split('-');
          yearMatches = startYear === targetYear;
        }
      }
      
      // Check if term matches - normalize both sides for comparison
      const enrollmentTerm = normalizeSemesterValue(enrollment.term);
      const termMatches = enrollmentTerm === normalizedSemester;
      
      console.log(`Student ${enrollment.student_number}: year=${enrollmentYear} (matches: ${yearMatches}), term=${enrollment.term} -> ${enrollmentTerm} (matches: ${termMatches})`);
      
      return yearMatches && termMatches;
    });

    console.log(`After filtering by year/term: ${matchingStudents.length} students`);

    // Filter out already assigned students for this term
    const eligibleStudents = [];
    for (const enrollment of matchingStudents) {
      if (!enrollment.student_number) continue; // Skip if no student number

      const isAssigned = await prisma.student_section.findUnique({
        where: {
          student_number_academic_year_semester: {
            student_number: enrollment.student_number,
            academic_year: targetAcademicYear!,
            semester: normalizedSemester
          }
        }
      });

      console.log(`Student ${enrollment.student_number}: assigned = ${!!isAssigned}`);

      if (!isAssigned) {
        eligibleStudents.push({
          studentId: enrollment.id, // Use enrollment ID
          studentNumber: enrollment.student_number,
          firstName: enrollment.first_name,
          middleName: enrollment.middle_name,
          lastName: enrollment.family_name,
          name: `${enrollment.first_name || ''} ${enrollment.middle_name || ''} ${enrollment.family_name || ''}`.trim(),
          email: enrollment.email_address,
          programId: targetProgramId!,
          programCode: program.code,
          programName: program.name,
          academicStatus: enrollment.academic_status || 'regular'
        });
      }
    }

    console.log(`Returning ${eligibleStudents.length} eligible students`);

    return NextResponse.json({ 
      success: true, 
      data: eligibleStudents,
      debug: {
        totalEnrolled: enrolledStudents.length,
        matchingYearTerm: matchingStudents.length,
        totalEligible: eligibleStudents.length,
        filters: {
          programId: targetProgramId,
          programCode: program.code,
          programName: program.name,
          yearLevel: targetYearLevel,
          academicYear: targetAcademicYear,
          semester: normalizedSemester,
          academicStatus: academicStatus
        },
        sampleData: enrolledStudents.slice(0, 2).map(e => ({
          student_number: e.student_number,
          academic_year: e.academic_year,
          term: e.term,
          year_level: e.year_level,
          course_program: e.course_program
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching eligible students:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch eligible students'
      },
      { status: 500 }
    );
  }
}
