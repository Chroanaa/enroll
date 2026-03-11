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

    // Fetch all active class schedules for this section once
    const sectionSchedules = await prisma.class_schedule.findMany({
      where: {
        section_id: body.sectionId,
        status: 'active'
      },
      select: { id: true, curriculum_course_id: true }
    });

    // Resolve course_codes for all curriculum_course_ids used by this section's schedules.
    // Different curriculum versions share the same course_code but have different IDs,
    // so we must match by course_code rather than by curriculum_course_id directly.
    const sectionCurriculumIds = [...new Set(sectionSchedules.map(s => s.curriculum_course_id))];
    const sectionCurriculumCourses = await prisma.curriculum_course.findMany({
      where: { id: { in: sectionCurriculumIds } },
      select: { id: true, course_code: true }
    });
    const sectionCourseCodeById = new Map(sectionCurriculumCourses.map(cc => [cc.id, cc.course_code]));

    // Map: course_code -> all schedule ids (handles both lecture + lab slots per course)
    const schedulesByCourseCode = new Map<string, number[]>();
    for (const s of sectionSchedules) {
      const code = sectionCourseCodeById.get(s.curriculum_course_id);
      if (code) {
        if (!schedulesByCourseCode.has(code)) schedulesByCourseCode.set(code, []);
        schedulesByCourseCode.get(code)!.push(s.id);
      }
    }

    console.log(`\n[StudentSection] Section ${body.sectionId} has ${sectionSchedules.length} active schedule(s):`);
    for (const [code, ids] of schedulesByCourseCode) {
      console.log(`  course_code=${code}  schedule_ids=[${ids.join(', ')}]`);
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

          // DEBUG: show all enrolled_subjects rows for this student regardless of filters
          const allEnrolledRaw = await tx.enrolled_subjects.findMany({
            where: { student_number: studentNumber },
            select: { id: true, academic_year: true, semester: true, status: true, curriculum_course_id: true }
          });
          console.log(`\n[DEBUG] All enrolled_subjects rows for ${studentNumber} (${allEnrolledRaw.length} total):`);
          allEnrolledRaw.forEach((r: any) => console.log(`  id=${r.id}  academic_year="${r.academic_year}"  semester=${r.semester}  status="${r.status}"  curriculum_course_id=${r.curriculum_course_id}`));
          console.log(`[DEBUG] Query filters: academic_year="${body.academicYear}"  semester=${semesterNum}  status="enrolled"`);

          const studentEnrolledSubjects = await tx.enrolled_subjects.findMany({
            where: {
              student_number: studentNumber,
              academic_year: body.academicYear,
              semester: semesterNum,
              status: 'enrolled'
            },
            select: { curriculum_course_id: true }
          });

          // HARD BLOCK: student must have enrolled subjects before being assigned to a section
          if (studentEnrolledSubjects.length === 0) {
            throw new Error('No enrolled subjects found for this term. Student must complete assessment first.');
          }

          // Resolve course_codes for student's enrolled curriculum_course_ids.
          // enrolled_subjects.curriculum_course_id may actually store subject_id values,
          // so we bridge: enrolled cc_id -> curriculum_course.subject_id -> course_code
          const enrolledCurriculumIds = [...new Set(studentEnrolledSubjects.map(es => es.curriculum_course_id))];

          // Try direct id match first
          const enrolledCurriculumCourses = await tx.curriculum_course.findMany({
            where: { id: { in: enrolledCurriculumIds } },
            select: { id: true, subject_id: true, course_code: true }
          });

          // If no direct match, try matching by subject_id (enrolled_subjects.curriculum_course_id stores subject_id)
          const enrolledBySubjectId = enrolledCurriculumCourses.length === 0
            ? await tx.curriculum_course.findMany({
                where: { subject_id: { in: enrolledCurriculumIds } },
                select: { id: true, subject_id: true, course_code: true }
              })
            : [];

          // If still no match, enrolled_subjects.curriculum_course_id is actually subject.id
          const enrolledBySubjectTable = (enrolledCurriculumCourses.length === 0 && enrolledBySubjectId.length === 0)
            ? await tx.subject.findMany({
                where: { id: { in: enrolledCurriculumIds } },
                select: { id: true, code: true }
              })
            : [];

          console.log(`[DEBUG] curriculum_course lookup by id: ${enrolledCurriculumCourses.length} rows`);
          console.log(`[DEBUG] curriculum_course lookup by subject_id: ${enrolledBySubjectId.length} rows`);
          console.log(`[DEBUG] subject table lookup by id: ${enrolledBySubjectTable.length} rows`);
          enrolledBySubjectTable.forEach((s: any) => console.log(`  subject.id=${s.id} -> subject.code=${s.code}`));

          // Build map: enrolled curriculum_course_id -> course_code
          const enrolledCodeById = new Map<number, string>();
          if (enrolledCurriculumCourses.length > 0) {
            for (const cc of enrolledCurriculumCourses) enrolledCodeById.set(cc.id, cc.course_code);
          } else if (enrolledBySubjectId.length > 0) {
            for (const cc of enrolledBySubjectId) {
              if (cc.subject_id != null) enrolledCodeById.set(cc.subject_id, cc.course_code);
            }
          } else {
            // enrolled_subjects.curriculum_course_id is actually subject.id
            for (const s of enrolledBySubjectTable) enrolledCodeById.set(s.id, s.code);
          }

          const enrolledCodesForStudent = [...enrolledCodeById.values()];
          console.log(`\n[StudentSection] Student ${studentNumber} enrolled subjects (${enrolledCodesForStudent.length}):`);
          enrolledCodesForStudent.forEach(code => console.log(`  course_code=${code}`));

          const sectionCodes = [...schedulesByCourseCode.keys()];
          const matchedCodes = enrolledCodesForStudent.filter(c => schedulesByCourseCode.has(c));
          const unmatchedCodes = enrolledCodesForStudent.filter(c => !schedulesByCourseCode.has(c));
          console.log(`  Section codes: [${sectionCodes.join(', ')}]`);
          console.log(`  Matched: [${matchedCodes.join(', ')}]`);
          console.log(`  Unmatched (student has but section doesn't): [${unmatchedCodes.join(', ')}]`);

          // Match by course_code across curriculum versions
          const rawMatchingIds: number[] = [];
          for (const es of studentEnrolledSubjects) {
            const code: string | undefined = enrolledCodeById.get(es.curriculum_course_id);
            if (code && schedulesByCourseCode.has(code)) {
              rawMatchingIds.push(...schedulesByCourseCode.get(code)!);
            }
          }
          const scheduleIdsToAssign = [...new Set(rawMatchingIds)];

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
