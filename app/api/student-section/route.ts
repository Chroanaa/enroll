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

    // Fetch all active class schedules for this section once (includes curriculum_course_id for matching)
    const sectionSchedules = await prisma.class_schedule.findMany({
      where: {
        section_id: body.sectionId,
        status: 'active'
      },
      select: { id: true, curriculum_course_id: true }
    });

    // Build a map: curriculum_course_id -> class_schedule_id for quick lookup
    const schedulesByCourse = new Map<number, number>();
    for (const s of sectionSchedules) {
      // Keep first schedule per course (lecture block) to avoid duplicates
      if (!schedulesByCourse.has(s.curriculum_course_id)) {
        schedulesByCourse.set(s.curriculum_course_id, s.id);
      }
    }

    // Process each student
    for (const studentNumber of body.studentNumbers) {
      try {
        // Verify student exists in enrollment (same table used by eligible-students API)
        const student = await prisma.enrollment.findFirst({
          where: { student_number: studentNumber }
        });

        if (!student) {
          failed.push({
            studentNumber,
            reason: 'Student not found in enrollment'
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

        // Check capacity (skip when override is requested by admin)
        if (!body.overrideCapacity) {
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
        }

        // Assign student in transaction
        await prisma.$transaction(async (tx: any) => {
          // Insert into student_section
          const studentSection = await tx.student_section.create({
            data: {
              student_number: studentNumber,
              section_id: body.sectionId,
              academic_year: body.academicYear,
              semester: normalizedSemester,
              assignment_type: 'regular'
            }
          });

          // Get this student's enrolled_subjects for the term to match against section schedules
          const semesterNum = normalizedSemester === 'first' ? 1 : normalizedSemester === 'second' ? 2 : 3;
          const studentEnrolledSubjects = await tx.enrolled_subjects.findMany({
            where: {
              student_number: studentNumber,
              academic_year: body.academicYear,
              semester: semesterNum,
              status: 'enrolled'
            },
            select: { curriculum_course_id: true }
          });

          // Match enrolled subjects to section class schedules by curriculum_course_id
          const matchingScheduleIds: number[] = [];
          for (const es of studentEnrolledSubjects) {
            // A subject may have both lecture + lab schedules — add ALL matching ones
            for (const s of sectionSchedules) {
              if (s.curriculum_course_id === es.curriculum_course_id) {
                matchingScheduleIds.push(s.id);
              }
            }
          }

          // If student has enrolled subjects that match section schedules, use those
          // Otherwise fall back to all section schedules (no enrolled_subjects data yet)
          const scheduleIdsToAssign = matchingScheduleIds.length > 0
            ? matchingScheduleIds
            : sectionSchedules.map(s => s.id);

          if (scheduleIdsToAssign.length > 0) {
            await tx.student_section_subjects.createMany({
              data: scheduleIdsToAssign.map(scheduleId => ({
                student_section_id: studentSection.id,
                class_schedule_id: scheduleId
              })),
              skipDuplicates: true
            });
          }

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

    // Get student details from enrollment table
    const studentNumbers = assignments.map(a => a.student_number);
    const enrollments = await prisma.enrollment.findMany({
      where: { student_number: { in: studentNumbers } },
      select: {
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        academic_status: true
      }
    });

    const enrollmentMap = new Map(enrollments.map(e => [e.student_number, e]));

    // Get subject counts for ALL students (regular now also populates student_section_subjects)
    const allAssignmentIds = assignments.map(a => a.id);
    let subjectCounts: Map<number, number> = new Map();
    
    if (allAssignmentIds.length > 0) {
      try {
        const subjectAssignments = await prisma.student_section_subjects.groupBy({
          by: ['student_section_id'],
          where: { student_section_id: { in: allAssignmentIds } },
          _count: { class_schedule_id: true }
        });
        subjectCounts = new Map(subjectAssignments.map(s => [s.student_section_id, s._count.class_schedule_id]));
      } catch (e) {
        // Table might not exist yet
        console.log('student_section_subjects table not available');
      }
    }

    const formattedAssignments = assignments.map(assignment => {
      const enrollment = enrollmentMap.get(assignment.student_number);
      return {
        id: assignment.id,
        studentNumber: assignment.student_number,
        sectionId: assignment.section_id,
        academicYear: assignment.academic_year,
        semester: assignment.semester,
        assignmentType: assignment.assignment_type || 'regular',
        name: enrollment 
          ? `${enrollment.first_name || ''} ${enrollment.middle_name || ''} ${enrollment.family_name || ''}`.trim()
          : assignment.student_number,
        subjectCount: subjectCounts.get(assignment.id) || 0
      };
    });

    return NextResponse.json({ success: true, data: formattedAssignments });
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
