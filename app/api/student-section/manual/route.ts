import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import {
  getEnrolledSubjectIdsForTerm,
  getMatchingScheduleIdsForSection,
  normalizeSemesterValue,
} from '../../../utils/studentSectionMatching';

/**
 * POST /api/student-section/manual
 * Manually assign a single student to a section (for irregular students)
 * 
 * Request Body:
 * - studentNumber: string
 * - sectionId: number
 * - academicYear: strings
 * - semester: string
 * - assignmentType: 'regular' | 'irregular'
 * - classScheduleIds: number[] (required for irregular, optional for regular)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentNumber, sectionId, academicYear, semester, assignmentType, classScheduleIds } = body;
    const normalizedSemester = normalizeSemesterValue(String(semester || ''));

    // Validate required fields
    if (!studentNumber || !sectionId || !academicYear || !normalizedSemester) {
      return NextResponse.json(
        { error: 'Missing required fields: studentNumber, sectionId, academicYear, semester' },
        { status: 400 }
      );
    }

    // Validate assignment type
    const type = assignmentType || 'regular';
    if (!['regular', 'irregular'].includes(type)) {
      return NextResponse.json(
        { error: 'assignmentType must be "regular" or "irregular"' },
        { status: 400 }
      );
    }

    // For irregular students, classScheduleIds is required
    if (type === 'irregular' && (!classScheduleIds || classScheduleIds.length === 0)) {
      return NextResponse.json(
        { error: 'classScheduleIds is required for irregular students' },
        { status: 400 }
      );
    }

    // Check if section exists and is active
    const section = await prisma.sections.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      return NextResponse.json(
        { error: `Section ${sectionId} not found` },
        { status: 404 }
      );
    }

    if (section.status !== 'active') {
      return NextResponse.json(
        { error: `Section must be active to assign students. Current status: ${section.status}` },
        { status: 400 }
      );
    }

    // Check if student exists in enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { student_number: studentNumber }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: `Student ${studentNumber} not found in enrollment` },
        { status: 404 }
      );
    }

    // Check if student is already assigned for this term
    const existingAssignment = await prisma.student_section.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: normalizedSemester
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: `Student ${studentNumber} is already assigned to a section for ${academicYear} ${semester}` },
        { status: 409 }
      );
    }

    // Check section capacity (allow override for irregular; maxCapacity=0 means unlimited)
    const currentCount = section.student_count || 0;
    const maxCapacity = section.max_capacity || 0;
    
    if (maxCapacity > 0 && currentCount >= maxCapacity && type === 'regular') {
      return NextResponse.json(
        { error: `Section is at full capacity (${currentCount}/${maxCapacity})` },
        { status: 400 }
      );
    }

    // Validate class schedule IDs if provided
    if (classScheduleIds && classScheduleIds.length > 0) {
      const schedules = await prisma.class_schedule.findMany({
        where: {
          id: { in: classScheduleIds },
          section_id: sectionId,
          status: 'active'
        }
      });

      if (schedules.length !== classScheduleIds.length) {
        return NextResponse.json(
          { error: 'Some class schedule IDs are invalid or do not belong to this section' },
          { status: 400 }
        );
      }
    }

    // Create assignment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create student_section record
      const studentSection = await tx.student_section.create({
        data: {
          student_number: studentNumber,
          section_id: sectionId,
          academic_year: academicYear,
          semester: normalizedSemester,
          assignment_type: type
        }
      });

      // For irregular students, create subject assignments from provided classScheduleIds
      if (type === 'irregular' && classScheduleIds && classScheduleIds.length > 0) {
        await tx.student_section_subjects.createMany({
          data: classScheduleIds.map((scheduleId: number) => ({
            student_section_id: studentSection.id,
            class_schedule_id: scheduleId
          }))
        });
      }

      // For regular students, auto-fill student_section_subjects from enrolled_subjects
      if (type === 'regular') {
        const enrolledSubjectIds = await getEnrolledSubjectIdsForTerm(
          tx,
          studentNumber,
          academicYear,
          normalizedSemester,
        );

        // HARD BLOCK: student must have enrolled subjects before being assigned
        if (enrolledSubjectIds.length === 0) {
          throw new Error('No enrolled subjects found for this term. Student must complete assessment first.');
        }
        const matchingScheduleIds = await getMatchingScheduleIdsForSection(
          tx,
          sectionId,
          enrolledSubjectIds,
        );

        // Only assign schedules that match enrolled subjects — no fallback to all section schedules
        if (matchingScheduleIds.length === 0) {
          throw new Error("None of the student's enrolled subjects match this section's class schedules.");
        }

        await tx.student_section_subjects.createMany({
          data: matchingScheduleIds.map((id: number) => ({
            student_section_id: studentSection.id,
            class_schedule_id: id
          })),
          skipDuplicates: true
        });
      }

      // Update section student count
      await tx.sections.update({
        where: { id: sectionId },
        data: { student_count: { increment: 1 } }
      });

      return studentSection;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        studentNumber: result.student_number,
        sectionId: result.section_id,
        academicYear: result.academic_year,
        semester: result.semester,
        assignmentType: result.assignment_type,
        subjectsAssigned: classScheduleIds?.length || 0
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in manual student assignment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign student' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student-section/manual
 * Remove a student from a section
 * 
 * Query params:
 * - studentNumber: string
 * - academicYear: string
 * - semester: string
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentNumber = searchParams.get('studentNumber');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');

    if (!studentNumber || !academicYear || !semester) {
      return NextResponse.json(
        { error: 'Missing required params: studentNumber, academicYear, semester' },
        { status: 400 }
      );
    }

    // Find the assignment
    const assignment = await prisma.student_section.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: semester
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete subject assignments first (cascade should handle this, but being explicit)
      await tx.student_section_subjects.deleteMany({
        where: { student_section_id: assignment.id }
      });

      // Delete the assignment
      await tx.student_section.delete({
        where: { id: assignment.id }
      });

      // Decrement section count
      await tx.sections.update({
        where: { id: assignment.section_id },
        data: { student_count: { decrement: 1 } }
      });
    });

    return NextResponse.json({ success: true, message: 'Student removed from section' });

  } catch (error) {
    console.error('Error removing student from section:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove student' },
      { status: 500 }
    );
  }
}
