import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

/**
 * POST /api/student-section/manual
 * Manually assign a single student to a section (for irregular students)
 * 
 * Request Body:
 * - studentNumber: string
 * - sectionId: number
 * - academicYear: string
 * - semester: string
 * - assignmentType: 'regular' | 'irregular'
 * - classScheduleIds: number[] (required for irregular, optional for regular)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { studentNumber, sectionId, academicYear, semester, assignmentType, classScheduleIds } = body;

    // Validate required fields
    if (!studentNumber || !sectionId || !academicYear || !semester) {
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
          semester: semester
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
          semester: semester,
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
        const semesterNum = semester === 'first' ? 1 : semester === 'second' ? 2 : 3;

        const sectionSchedules = await tx.class_schedule.findMany({
          where: { section_id: sectionId, status: 'active' },
          select: { id: true, curriculum_course_id: true }
        });

        const studentEnrolledSubjects = await tx.enrolled_subjects.findMany({
          where: {
            student_number: studentNumber,
            academic_year: academicYear,
            semester: semesterNum,
            status: 'enrolled'
          },
          select: { curriculum_course_id: true }
        });

        // HARD BLOCK: student must have enrolled subjects before being assigned
        if (studentEnrolledSubjects.length === 0) {
          throw new Error('No enrolled subjects found for this term. Student must complete assessment first.');
        }

        // Resolve course_codes for both sides so we can match across different curriculum versions.
        // e.g. student enrolled under BSIT 2022 curriculum, section built on BSIT 2023 curriculum —
        // same subject "DMATH" has different curriculum_course_id in each version.
        const sectionCurriculumIds = [...new Set(sectionSchedules.map(s => s.curriculum_course_id))];
        const sectionCurriculumCourses = await tx.curriculum_course.findMany({
          where: { id: { in: sectionCurriculumIds } },
          select: { id: true, course_code: true }
        });
        const sectionCodeById = new Map(sectionCurriculumCourses.map(cc => [cc.id, cc.course_code]));

        // Map: course_code -> all schedule ids
        const schedulesByCourseCode = new Map<string, number[]>();
        for (const s of sectionSchedules) {
          const code = sectionCodeById.get(s.curriculum_course_id);
          if (code) {
            if (!schedulesByCourseCode.has(code)) schedulesByCourseCode.set(code, []);
            schedulesByCourseCode.get(code)!.push(s.id);
          }
        }

        const enrolledCurriculumIds = [...new Set(studentEnrolledSubjects.map(es => es.curriculum_course_id))];

        // Try direct id match first; if no results, enrolled_subjects.curriculum_course_id
        // actually stores subject_id, so bridge via curriculum_course.subject_id
        const enrolledCurriculumCourses = await tx.curriculum_course.findMany({
          where: { id: { in: enrolledCurriculumIds } },
          select: { id: true, subject_id: true, course_code: true }
        });
        const enrolledBySubjectId = enrolledCurriculumCourses.length === 0
          ? await tx.curriculum_course.findMany({
              where: { subject_id: { in: enrolledCurriculumIds } },
              select: { id: true, subject_id: true, course_code: true }
            })
          : [];
        // Last fallback: enrolled_subjects.curriculum_course_id is actually subject.id
        const enrolledBySubjectTable = (enrolledCurriculumCourses.length === 0 && enrolledBySubjectId.length === 0)
          ? await tx.subject.findMany({
              where: { id: { in: enrolledCurriculumIds } },
              select: { id: true, code: true }
            })
          : [];

        const enrolledCodeById = new Map<number, string>();
        if (enrolledCurriculumCourses.length > 0) {
          for (const cc of enrolledCurriculumCourses) enrolledCodeById.set(cc.id, cc.course_code);
        } else if (enrolledBySubjectId.length > 0) {
          for (const cc of enrolledBySubjectId) {
            if (cc.subject_id != null) enrolledCodeById.set(cc.subject_id, cc.course_code);
          }
        } else {
          for (const s of enrolledBySubjectTable) enrolledCodeById.set(s.id, s.code);
        }

        // Match by course_code across curriculum versions
        const rawMatchingIds: number[] = [];
        for (const es of studentEnrolledSubjects) {
          const code = enrolledCodeById.get(es.curriculum_course_id);
          if (code && schedulesByCourseCode.has(code)) {
            rawMatchingIds.push(...schedulesByCourseCode.get(code)!);
          }
        }
        const matchingScheduleIds = [...new Set(rawMatchingIds)];

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
