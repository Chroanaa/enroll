import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

/**
 * GET /api/irregular-enrollment
 * Get enrolled subjects for an irregular student
 * 
 * Query params:
 * - studentNumber: string
 * - academicYear: string
 * - semester: string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentNumber = searchParams.get('studentNumber');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');

    console.log('[irregular-enrollment GET] Request params:', { studentNumber, academicYear, semester });

    if (!studentNumber) {
      return NextResponse.json({ data: [] });
    }

    // Get student's section assignments for this term
    const studentSections = await prisma.student_section.findMany({
      where: {
        student_number: studentNumber,
        ...(academicYear && { academic_year: academicYear }),
        ...(semester && { semester: semester })
      }
    });

    console.log('[irregular-enrollment GET] Found student_sections:', studentSections.length);

    if (studentSections.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get subject assignments for irregular students
    const studentSectionIds = studentSections.map(ss => ss.id);
    
    let subjectAssignments: any[] = [];
    try {
      subjectAssignments = await prisma.student_section_subjects.findMany({
        where: {
          student_section_id: { in: studentSectionIds }
        }
      });
      console.log('[irregular-enrollment GET] Found subject assignments:', subjectAssignments.length);
    } catch (e) {
      // Table might not exist yet
      console.log('[irregular-enrollment GET] student_section_subjects table not available:', e);
    }

    if (subjectAssignments.length === 0) {
      console.log('[irregular-enrollment GET] No subject assignments found, returning empty array');
      return NextResponse.json({ data: [] });
    }

    // Get class schedule details
    const scheduleIds = subjectAssignments.map(sa => sa.class_schedule_id);
    const schedules = await prisma.class_schedule.findMany({
      where: { id: { in: scheduleIds } }
    });

    console.log('[irregular-enrollment GET] Found schedules:', schedules.length);

    // Get section details
    const sectionIds = [...new Set(schedules.map(s => s.section_id))];
    const sections = await prisma.sections.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true, section_name: true }
    });
    const sectionMap = new Map(sections.map(s => [s.id, s]));

    // Get curriculum course details
    const curriculumCourseIds = [...new Set(schedules.map(s => s.curriculum_course_id))];
    const curriculumCourses = await prisma.curriculum_course.findMany({
      where: { id: { in: curriculumCourseIds } },
      select: { id: true, course_code: true, descriptive_title: true, units_total: true }
    });
    const courseMap = new Map(curriculumCourses.map(c => [c.id, c]));

    // Get faculty and room details (filter out nulls)
    const facultyIds = [...new Set(schedules.map(s => s.faculty_id).filter((id): id is number => id !== null))];
    const roomIds = [...new Set(schedules.map(s => s.room_id))];

    const [facultyList, roomList] = await Promise.all([
      facultyIds.length > 0 
        ? prisma.faculty.findMany({
            where: { id: { in: facultyIds } },
            select: { id: true, first_name: true, last_name: true }
          })
        : [],
      prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, room_number: true }
      })
    ]);

    const facultyMap = new Map<number, { id: number; first_name: string; last_name: string }>(
      facultyList.map(f => [f.id, f] as [number, { id: number; first_name: string; last_name: string }])
    );
    const roomMap = new Map<number, { id: number; room_number: string }>(
      roomList.map(r => [r.id, r] as [number, { id: number; room_number: string }])
    );

    // Build response
    const enrolledSubjects = subjectAssignments.map(sa => {
      const schedule = schedules.find(s => s.id === sa.class_schedule_id);
      if (!schedule) return null;

      const section = sectionMap.get(schedule.section_id);
      const course = courseMap.get(schedule.curriculum_course_id);
      const faculty = schedule.faculty_id ? facultyMap.get(schedule.faculty_id) : null;
      const room = roomMap.get(schedule.room_id);

      return {
        id: sa.id,
        classScheduleId: schedule.id,
        sectionId: schedule.section_id,
        sectionName: section?.section_name || '',
        courseCode: course?.course_code || `Course ${schedule.curriculum_course_id}`,
        courseTitle: course?.descriptive_title || '',
        dayOfWeek: schedule.day_of_week,
        startTime: formatTime(schedule.start_time),
        endTime: formatTime(schedule.end_time),
        roomNumber: room?.room_number || 'TBA',
        facultyName: faculty ? `${faculty.first_name} ${faculty.last_name}` : 'TBA',
        unitsTotal: course?.units_total || 0
      };
    }).filter(Boolean);

    console.log('[irregular-enrollment GET] Returning enrolled subjects:', enrolledSubjects.length);

    return NextResponse.json({ data: enrolledSubjects });

  } catch (error) {
    console.error('[irregular-enrollment GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrolled subjects' },
      { status: 500 }
    );
  }
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}


/**
 * POST /api/irregular-enrollment
 * Add a subject to an irregular student's enrollment
 * 
 * Request Body:
 * - studentNumber: string
 * - classScheduleId: number
 * - sectionId: number
 * - academicYear: string
 * - semester: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentNumber, classScheduleId, sectionId, academicYear, semester } = body;

    if (!studentNumber || !classScheduleId || !sectionId || !academicYear || !semester) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if student exists
    const enrollment = await prisma.enrollment.findFirst({
      where: { student_number: studentNumber }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Check if class schedule exists and is active
    const schedule = await prisma.class_schedule.findUnique({
      where: { id: classScheduleId }
    });

    if (!schedule || schedule.status !== 'active') {
      return NextResponse.json(
        { error: 'Class schedule not found or not active' },
        { status: 404 }
      );
    }

    // Get curriculum course details for better error messages
    const curriculumCourse = await prisma.curriculum_course.findUnique({
      where: { id: schedule.curriculum_course_id },
      select: {
        id: true,
        course_code: true,
        descriptive_title: true
      }
    });

    // CRITICAL VALIDATION: Check if subject is in enrolled_subjects
    // Students can only be assigned to schedules for subjects they've selected in assessment
    const semesterNum = semester === 'first' ? 1 : semester === 'second' ? 2 : parseInt(semester);
    
    const enrolledSubject = await prisma.enrolled_subjects.findFirst({
      where: {
        student_number: studentNumber,
        curriculum_course_id: schedule.curriculum_course_id,
        academic_year: academicYear,
        semester: semesterNum
      }
    });

    if (!enrolledSubject) {
      const courseName = curriculumCourse?.course_code || 'this subject';
      const courseTitle = curriculumCourse?.descriptive_title || '';
      return NextResponse.json(
        { 
          error: 'Subject not in enrolled subjects',
          message: `Cannot assign schedule for ${courseName}${courseTitle ? ' - ' + courseTitle : ''}. Student must first select this subject in Assessment Management before assigning a class schedule.`
        },
        { status: 400 }
      );
    }

    // Get or create student_section record
    let studentSection = await prisma.student_section.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: semester
        }
      }
    });

    if (!studentSection) {
      // Create new student_section with irregular type
      studentSection = await prisma.student_section.create({
        data: {
          student_number: studentNumber,
          section_id: sectionId,
          academic_year: academicYear,
          semester: semester,
          assignment_type: 'irregular'
        }
      });

      // Update section student count
      await prisma.sections.update({
        where: { id: sectionId },
        data: { student_count: { increment: 1 } }
      });
    }

    // Check if already enrolled in this class schedule
    const existingSchedule = await prisma.student_section_subjects.findFirst({
      where: {
        student_section_id: studentSection.id,
        class_schedule_id: classScheduleId
      }
    });

    if (existingSchedule) {
      return NextResponse.json(
        { error: 'Student is already enrolled in this class schedule' },
        { status: 409 }
      );
    }

    // Check if already enrolled in the same subject (by curriculum_course_id)
    // Get all enrolled class schedules for this student
    const enrolledSchedules = await prisma.student_section_subjects.findMany({
      where: {
        student_section_id: studentSection.id
      },
      include: {
        class_schedule: {
          select: {
            curriculum_course_id: true
          }
        }
      }
    });

    // Check if any enrolled schedule has the same curriculum_course_id
    const isDuplicateSubject = enrolledSchedules.some(
      (enrolled) => enrolled.class_schedule.curriculum_course_id === schedule.curriculum_course_id
    );

    if (isDuplicateSubject) {
      // Get the course details for better error message
      const course = await prisma.curriculum_course.findUnique({
        where: { id: schedule.curriculum_course_id },
        select: { course_code: true, descriptive_title: true }
      });

      return NextResponse.json(
        { 
          error: 'Student is already enrolled in this subject',
          message: `Student is already enrolled in ${course?.course_code || 'this subject'} (${course?.descriptive_title || ''})` 
        },
        { status: 409 }
      );
    }

    // Add subject assignment
    const subjectAssignment = await prisma.student_section_subjects.create({
      data: {
        student_section_id: studentSection.id,
        class_schedule_id: classScheduleId
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: subjectAssignment.id,
        studentSectionId: studentSection.id,
        classScheduleId: classScheduleId
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding subject:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add subject' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/irregular-enrollment
 * Remove a subject from an irregular student's enrollment
 * 
 * Query params:
 * - id: number (student_section_subjects id)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      );
    }

    // Delete the subject assignment
    await prisma.student_section_subjects.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing subject:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove subject' },
      { status: 500 }
    );
  }
}
