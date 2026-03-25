import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { getSessionScope } from '@/app/lib/accessScope';
import {
  capacityValidator,
  termValidator
} from '../../utils/sectionService';
import {
  BulkAssignStudentsRequest,
  BulkAssignStudentsResponse,
  ApiError
} from '../../types/sectionTypes';
import {
  getEnrolledSubjectIdsForTerm,
  getMatchingScheduleIdsForSection,
} from '../../utils/studentSectionMatching';

const normalizeSemesterValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'first' || normalized === 'first semester') return 'first';
  if (normalized === '2' || normalized === 'second' || normalized === 'second semester') return 'second';
  if (normalized === '3' || normalized === 'summer') return 'summer';
  return null;
};

const semesterLabelToNumber = (semester: 'first' | 'second' | 'summer') => {
  if (semester === 'first') return 1;
  if (semester === 'second') return 2;
  return 3;
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

        const assessmentSemester = semesterLabelToNumber(
          normalizedSemester as 'first' | 'second' | 'summer'
        );

        const finalizedAssessment = await prisma.student_assessment.findFirst({
          where: {
            student_number: studentNumber,
            academic_year: body.academicYear,
            semester: assessmentSemester,
            status: 'finalized',
          },
          select: { id: true },
        });

        if (!finalizedAssessment) {
          failed.push({
            studentNumber,
            reason: 'Student must have a finalized assessment before section assignment',
          });
          continue;
        }

        const paymentCount = await prisma.student_payment.count({
          where: {
            assessment_id: finalizedAssessment.id,
          },
        });

        if (paymentCount === 0) {
          failed.push({
            studentNumber,
            reason: 'Student must have a recorded payment before section assignment',
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

          const enrolledSubjectIds = await getEnrolledSubjectIdsForTerm(
            tx,
            studentNumber,
            body.academicYear,
            normalizedSemester,
          );

          if (enrolledSubjectIds.length === 0) {
            throw new Error('No enrolled subjects found for this term. Student must complete assessment first.');
          }
          const scheduleIdsToAssign = await getMatchingScheduleIdsForSection(
            tx,
            body.sectionId,
            enrolledSubjectIds,
          );

          // Only assign schedules that match enrolled subjects — no fallback to all section schedules
          if (scheduleIdsToAssign.length === 0) {
            throw new Error("None of the student's enrolled subjects match this section's class schedules.");
          }

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

          // Update enrollment status to 1 (Enrolled)
          await tx.enrollment.updateMany({
            where: { student_number: studentNumber },
            data: { status: 1 }
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
    const scope = await getSessionScope();
    if (scope?.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Dean account is not linked to a department.',
        } as ApiError,
        { status: 403 }
      );
    }

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

    let assignments = await prisma.student_section.findMany({
      where,
      orderBy: { student_number: 'asc' }
    });

    if (scope?.isDean && scope.deanDepartmentId && assignments.length > 0) {
      const allowedEnrollments = await prisma.enrollment.findMany({
        where: {
          student_number: { in: assignments.map((assignment) => assignment.student_number) },
          department: scope.deanDepartmentId,
        },
        select: {
          student_number: true,
        },
        distinct: ['student_number'],
      });

      const allowedStudentNumbers = new Set(
        allowedEnrollments.map((enrollment) => enrollment.student_number).filter(Boolean)
      );

      assignments = assignments.filter((assignment) =>
        allowedStudentNumbers.has(assignment.student_number)
      );
    }

    // Get student details from enrollment table
    const studentNumbers = assignments.map(a => a.student_number);
    const enrollments = await prisma.enrollment.findMany({
      where: { student_number: { in: studentNumbers } },
      select: {
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        academic_status: true,
        email_address: true
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
        email: enrollment?.email_address ?? null,
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
