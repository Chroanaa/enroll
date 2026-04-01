import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  conflictChecker,
  sectionService
} from '../../utils/sectionService';
import {
  CreateClassScheduleRequest,
  ClassScheduleResponse,
  ApiError
} from '../../types/sectionTypes';

type PetitionStudentScheduleRow = {
  student_number: string;
  day_of_week: string;
  start_time: Date;
  end_time: Date;
  course_code: string | null;
  descriptive_title: string | null;
  section_name: string | null;
};

const semesterToNumber = (semester: string): number => {
  const normalized = semester.trim().toLowerCase();
  if (normalized === '1' || normalized === 'first' || normalized === 'first semester') return 1;
  if (normalized === '2' || normalized === 'second' || normalized === 'second semester') return 2;
  return 3;
};

const toMinutes = (value: Date): number => value.getHours() * 60 + value.getMinutes();
const formatHHmm = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const semesterAliases = (semesterNum: number): string[] => {
  if (semesterNum === 1) return ['first', 'first semester', '1', '1st semester'];
  if (semesterNum === 2) return ['second', 'second semester', '2', '2nd semester'];
  return ['third', 'third semester', '3', '3rd semester', 'summer'];
};

async function getPendingPetitionStudentsForSubject(
  curriculumCourseId: number,
  academicYear: string,
  semesterNum: number,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ student_number: string }[]>`
    SELECT DISTINCT psr.student_number
    FROM student_petition_subject_requests psr
    WHERE psr.curriculum_course_id = ${curriculumCourseId}
      AND psr.academic_year = ${academicYear}
      AND psr.semester = ${semesterNum}
      AND LOWER(COALESCE(psr.status, '')) = 'pending_approval'
    ORDER BY psr.student_number
  `;
  return rows.map((row) => String(row.student_number)).filter(Boolean);
}

async function getSchedulesByStudent(
  studentNumbers: string[],
  academicYear: string,
  semesterNum: number,
): Promise<Map<string, PetitionStudentScheduleRow[]>> {
  if (studentNumbers.length === 0) return new Map();
  const aliases = semesterAliases(semesterNum);
  const rows = await prisma.$queryRaw<PetitionStudentScheduleRow[]>`
    SELECT
      ss.student_number,
      cs.day_of_week,
      cs.start_time,
      cs.end_time,
      COALESCE(cc.course_code, 'N/A') AS course_code,
      COALESCE(cc.descriptive_title, '') AS descriptive_title,
      sec.section_name
    FROM student_section ss
    INNER JOIN student_section_subjects sss ON sss.student_section_id = ss.id
    INNER JOIN class_schedule cs ON cs.id = sss.class_schedule_id
    LEFT JOIN curriculum_course cc ON cc.id = cs.curriculum_course_id
    LEFT JOIN sections sec ON sec.id = cs.section_id
    WHERE ss.student_number IN (${Prisma.join(studentNumbers)})
      AND ss.academic_year = ${academicYear}
      AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(aliases)})
      AND LOWER(COALESCE(cs.status, '')) = 'active'
  `;
  const byStudent = new Map<string, PetitionStudentScheduleRow[]>();
  for (const row of rows) {
    const key = String(row.student_number || '');
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key)!.push(row);
  }
  return byStudent;
}

function computePetitionConflicts(
  studentNumbers: string[],
  byStudent: Map<string, PetitionStudentScheduleRow[]>,
  dayOfWeek: string,
  startTime: Date,
  endTime: Date,
) {
  const slotStart = toMinutes(startTime);
  const slotEnd = toMinutes(endTime);
  const details: string[] = [];
  let conflictCount = 0;

  for (const studentNumber of studentNumbers) {
    const schedules = byStudent.get(studentNumber) || [];
    const overlaps = schedules.filter((row) => {
      const sameDay = String(row.day_of_week || '').trim().toLowerCase() === dayOfWeek.toLowerCase();
      if (!sameDay) return false;
      const rowStart = toMinutes(new Date(row.start_time));
      const rowEnd = toMinutes(new Date(row.end_time));
      return slotStart < rowEnd && slotEnd > rowStart;
    });
    if (overlaps.length > 0) {
      conflictCount += 1;
      const overlapText = overlaps
        .slice(0, 2)
        .map(
          (item) =>
            `${String(item.course_code || 'N/A')} ${String(item.day_of_week || dayOfWeek)} ${formatHHmm(
              toMinutes(new Date(item.start_time)),
            )}-${formatHHmm(toMinutes(new Date(item.end_time)))}`,
        )
        .join(' | ');
      details.push(`${studentNumber}: ${overlapText}`);
    }
  }

  return { conflictCount, details };
}

/**
 * POST /api/class-schedule
 * Create a class schedule for a section
 *
 * Request Body:
 * - sectionId: number
 * - curriculumCourseId: number
 * - facultyId: number
 * - roomId: number
 * - dayOfWeek: string
 * - startTime: string (ISO 8601)
 * - endTime: string (ISO 8601)
 * - academicYear: string
 * - semester: string
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateClassScheduleRequest & {
      isLabSchedule?: boolean;
      includeIrregularStudents?: boolean;
    } = await request.json();

    // Validate required fields - Faculty is optional
    if (
      !body.sectionId ||
      !body.curriculumCourseId ||
      !body.roomId ||
      !body.dayOfWeek ||
      !body.startTime ||
      !body.endTime ||
      !body.academicYear ||
      !body.semester
    ) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields (faculty is optional)'
        } as ApiError,
        { status: 400 }
      );
    }

    const validSemesters = ['first', 'second', 'summer'];
    if (!validSemesters.includes(body.semester)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Semester must be "first", "second", or "summer"'
        } as ApiError,
        { status: 400 }
      );
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid startTime or endTime format'
        } as ApiError,
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Start time must be before end time'
        } as ApiError,
        { status: 400 }
      );
    }

    // Check section exists and is draft
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

    // Allow schedule modifications for draft and active sections, not locked/closed
    if (section.status === 'locked' || section.status === 'closed') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Cannot modify schedule. Section is ${section.status}.`
        } as ApiError,
        { status: 400 }
      );
    }

    // Verify subject belongs to section's curriculum
    const curriculumCourse = await prisma.curriculum_course.findUnique({
      where: { id: body.curriculumCourseId },
      include: { curriculum: true }
    });

    if (!curriculumCourse) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Curriculum course ${body.curriculumCourseId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Verify faculty exists (only if provided)
    if (body.facultyId) {
      const faculty = await prisma.faculty.findUnique({
        where: { id: body.facultyId }
      });

      if (!faculty) {
        return NextResponse.json(
          {
            error: 'NOT_FOUND',
            message: `Faculty ${body.facultyId} not found`
          } as ApiError,
          { status: 404 }
        );
      }
    }

    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: body.roomId }
    });

    if (!room) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Room ${body.roomId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Run conflict checks - REMOVED room conflict, keep faculty conflict only if faculty assigned
    const conflictChecks = [
      conflictChecker.checkSectionConflict(
        body.sectionId,
        body.dayOfWeek,
        startTime,
        endTime,
        body.academicYear,
        body.semester
      ),
      conflictChecker.checkSubjectDuplication(
        body.sectionId,
        body.curriculumCourseId,
        body.academicYear,
        body.semester,
        undefined,
        body.isLabSchedule ? 2 : 1
      )
    ];

    // Only check faculty conflict if faculty is assigned
    if (body.facultyId) {
      conflictChecks.push(
        conflictChecker.checkFacultyConflict(
          body.facultyId,
          body.dayOfWeek,
          startTime,
          endTime,
          body.academicYear,
          body.semester
        )
      );
    }

    const results = await Promise.all(conflictChecks);
    const sectionConflict = results[0];
    const subjectDuplicate = results[1];
    const facultyConflict = results[2]; // Will be undefined if faculty not assigned

    // Room conflict check removed - allow scheduling even with room conflicts

    if (facultyConflict) {
      return NextResponse.json(
        {
          error: 'FACULTY_CONFLICT',
          message: `Faculty has schedule conflict on ${body.dayOfWeek} from ${startTime} to ${endTime}`
        } as ApiError,
        { status: 409 }
      );
    }

    if (sectionConflict) {
      return NextResponse.json(
        {
          error: 'SECTION_CONFLICT',
          message: `Section has internal time overlap on ${body.dayOfWeek} from ${startTime} to ${endTime}`
        } as ApiError,
        { status: 409 }
      );
    }

    if (subjectDuplicate) {
      return NextResponse.json(
        {
          error: 'SUBJECT_DUPLICATE',
          message: `Subject is already scheduled in this section for this term`
        } as ApiError,
        { status: 409 }
      );
    }

    // Petition mode protection:
    // For petition sections, block creation if this slot conflicts with pending petition students.
    // For lab creation, also block if an existing sibling schedule already has petition conflicts.
    const isPetitionSection = String(section.section_name || '').toUpperCase().startsWith('PET-');
    if (isPetitionSection) {
      const semesterNum = semesterToNumber(body.semester);
      const pendingPetitionStudents = await getPendingPetitionStudentsForSubject(
        body.curriculumCourseId,
        body.academicYear,
        semesterNum,
      );
      if (pendingPetitionStudents.length > 0) {
        const schedulesByStudent = await getSchedulesByStudent(
          pendingPetitionStudents,
          body.academicYear,
          semesterNum,
        );

        const directConflict = computePetitionConflicts(
          pendingPetitionStudents,
          schedulesByStudent,
          body.dayOfWeek,
          startTime,
          endTime,
        );
        if (directConflict.conflictCount > 0) {
          return NextResponse.json(
            {
              error: 'PETITION_STUDENT_CONFLICT',
              message: `Petition schedule conflict: ${directConflict.conflictCount}/${pendingPetitionStudents.length} pending students overlap this slot.`,
              statusCode: 409,
              details: directConflict.details.slice(0, 6).join(' || ')
            } as ApiError,
            { status: 409 }
          );
        }

        const siblingSchedules = await prisma.class_schedule.findMany({
          where: {
            section_id: body.sectionId,
            curriculum_course_id: body.curriculumCourseId,
            academic_year: body.academicYear,
            semester: body.semester,
            status: 'active',
          },
          select: {
            id: true,
            day_of_week: true,
            start_time: true,
            end_time: true,
          }
        });

        for (const sibling of siblingSchedules) {
          const siblingConflict = computePetitionConflicts(
            pendingPetitionStudents,
            schedulesByStudent,
            sibling.day_of_week,
            sibling.start_time,
            sibling.end_time,
          );
          if (siblingConflict.conflictCount > 0) {
            const tryingLab = !!body.isLabSchedule;
            return NextResponse.json(
              {
                error: tryingLab ? 'PETITION_LECTURE_CONFLICT' : 'PETITION_LAB_CONFLICT',
                message: tryingLab
                  ? `Cannot submit lab yet. Existing lecture/sibling schedule still conflicts with ${siblingConflict.conflictCount} pending students.`
                  : `Cannot submit lecture yet. Existing lab/sibling schedule still conflicts with ${siblingConflict.conflictCount} pending students.`,
                statusCode: 409,
                details: siblingConflict.details.slice(0, 6).join(' || ')
              } as ApiError,
              { status: 409 }
            );
          }
        }
      }
    }

    // Create class schedule - faculty_id can be null
    // and auto-link it to regular students in this section who already enrolled this subject.
    const schedule = await prisma.$transaction(async (tx: any) => {
      const createdSchedule = await tx.class_schedule.create({
        data: {
          section_id: body.sectionId,
          curriculum_course_id: body.curriculumCourseId,
          faculty_id: body.facultyId || null, // Allow null faculty
          room_id: body.roomId,
          day_of_week: body.dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          academic_year: body.academicYear,
          semester: body.semester,
          status: 'active'
        }
      });

      const regularAssignments = await tx.student_section.findMany({
        where: {
          section_id: body.sectionId,
          academic_year: body.academicYear,
          semester: body.semester,
          ...(body.includeIrregularStudents
            ? {}
            : {
                OR: [
                  { assignment_type: null },
                  { assignment_type: { not: 'irregular' } }
                ]
              })
        },
        select: {
          id: true,
          student_number: true
        }
      });

      if (regularAssignments.length > 0) {
        const semesterNum = semesterToNumber(body.semester);
        const studentNumbers = regularAssignments.map((row: any) => row.student_number);

        const enrolledRows = await tx.enrolled_subjects.findMany({
          where: {
            student_number: { in: studentNumbers },
            academic_year: body.academicYear,
            semester: semesterNum,
            curriculum_course_id: body.curriculumCourseId,
            status: 'enrolled'
          },
          select: { student_number: true }
        });

        const eligibleStudents = new Set(
          enrolledRows.map((row: any) => row.student_number)
        );

        const eligibleAssignments = regularAssignments.filter((row: any) =>
          eligibleStudents.has(row.student_number)
        );

        // Do not auto-modify students who already have this same subject
        // assigned from another section/schedule (manual or irregular handling).
        const existingSameSubjectRows = eligibleAssignments.length > 0
          ? await tx.$queryRaw<any[]>`
              SELECT DISTINCT sss.student_section_id
              FROM student_section_subjects sss
              JOIN class_schedule cs ON cs.id = sss.class_schedule_id
              WHERE sss.student_section_id IN (${Prisma.join(eligibleAssignments.map((row: any) => row.id))})
                AND cs.curriculum_course_id = ${body.curriculumCourseId}
                AND cs.status = 'active'
            `
          : [];

        const lockedStudentSectionIds = new Set(
          existingSameSubjectRows.map((row: any) => row.student_section_id)
        );

        const linksToCreate = eligibleAssignments
          .filter((row: any) => !lockedStudentSectionIds.has(row.id))
          .map((row: any) => ({
            student_section_id: row.id,
            class_schedule_id: createdSchedule.id
          }));

        if (linksToCreate.length > 0) {
          await tx.student_section_subjects.createMany({
            data: linksToCreate,
            skipDuplicates: true
          });
        }
      }

      return createdSchedule;
    });

    const response: ClassScheduleResponse = {
      id: schedule.id,
      sectionId: schedule.section_id,
      curriculumCourseId: schedule.curriculum_course_id,
      facultyId: schedule.faculty_id,
      roomId: schedule.room_id,
      dayOfWeek: schedule.day_of_week,
      startTime: schedule.start_time.toISOString(),
      endTime: schedule.end_time.toISOString(),
      academicYear: schedule.academic_year,
      semester: schedule.semester,
      status: schedule.status as 'active' | 'cancelled'
    };

    return NextResponse.json(
      { success: true, data: response },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating class schedule:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create class schedule'
      } as ApiError,
      { status: 500 }
    );
  }
}

/**
 * GET /api/class-schedule
 * List schedules with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const facultyId = searchParams.get('facultyId');
    const curriculumCourseId = searchParams.get('curriculumCourseId');
    const matchByCourseCode = searchParams.get('matchByCourseCode');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');

    const where: any = {};

    if (sectionId) where.section_id = parseInt(sectionId);
    if (facultyId) where.faculty_id = parseInt(facultyId);
    if (curriculumCourseId) {
      const parsedCurriculumCourseId = parseInt(curriculumCourseId);
      if (matchByCourseCode === '1') {
        const sourceCourse = await prisma.curriculum_course.findUnique({
          where: { id: parsedCurriculumCourseId },
          select: { course_code: true, subject_id: true },
        });

        if (sourceCourse) {
          const relatedCourses = await prisma.curriculum_course.findMany({
            where: sourceCourse.subject_id
              ? {
                  OR: [
                    { subject_id: sourceCourse.subject_id },
                    sourceCourse.course_code
                      ? { course_code: { equals: sourceCourse.course_code, mode: 'insensitive' } }
                      : undefined,
                  ].filter(Boolean) as any,
                }
              : sourceCourse.course_code
                ? { course_code: { equals: sourceCourse.course_code, mode: 'insensitive' } }
                : { id: parsedCurriculumCourseId },
            select: { id: true },
          });
          const relatedIds = relatedCourses
            .map((course) => Number(course.id))
            .filter((id) => Number.isFinite(id));

          where.curriculum_course_id = {
            in: relatedIds.length > 0 ? relatedIds : [parsedCurriculumCourseId],
          };
        } else {
          where.curriculum_course_id = parsedCurriculumCourseId;
        }
      } else {
        where.curriculum_course_id = parsedCurriculumCourseId;
      }
    }
    if (academicYear) where.academic_year = academicYear;
    if (semester) where.semester = semester;
    if (status) where.status = status;

    const schedules = await prisma.class_schedule.findMany({
      where,
      orderBy: [
        { day_of_week: 'asc' },
        { start_time: 'asc' }
      ]
    });

    // Fetch faculty, room, curriculum course, and section data for all schedules
    // Filter out null faculty_ids since faculty assignment is optional
    const facultyIds = [...new Set(schedules.map((s: any) => s.faculty_id).filter((id: any) => id !== null))];
    const roomIds = [...new Set(schedules.map((s: any) => s.room_id))];
    const curriculumCourseIds = [...new Set(schedules.map((s: any) => s.curriculum_course_id))];
    const sectionIds = [...new Set(schedules.map((s: any) => s.section_id))];

    const [facultyList, roomList, curriculumCourseList, sectionList] = await Promise.all([
      facultyIds.length > 0 
        ? prisma.faculty.findMany({
            where: { id: { in: facultyIds } },
            select: { id: true, first_name: true, last_name: true }
          })
        : [],
      prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, room_number: true, capacity: true }
      }),
      prisma.curriculum_course.findMany({
        where: { id: { in: curriculumCourseIds } },
        select: { 
          id: true, 
          course_code: true, 
          descriptive_title: true, 
          prerequisite: true,
          year_level: true,
          semester: true,
          units_lec: true,
          units_lab: true,
          units_total: true
        }
      }),
      prisma.sections.findMany({
        where: { id: { in: sectionIds } },
        select: { id: true, section_name: true }
      })
    ]);

    const facultyMap = new Map(facultyList.map((f: any) => [f.id, f] as [number, any]));
    const roomMap = new Map(roomList.map((r: any) => [r.id, r] as [number, any]));
    const curriculumCourseMap = new Map(curriculumCourseList.map((c: any) => [c.id, c] as [number, any]));
    const sectionMap = new Map(sectionList.map((s: any) => [s.id, s] as [number, any]));

    const response = schedules.map((schedule: any) => {
      const curriculumCourse = curriculumCourseMap.get(schedule.curriculum_course_id);
      const section = sectionMap.get(schedule.section_id);
      return {
        id: schedule.id,
        sectionId: schedule.section_id,
        sectionName: section?.section_name || 'Unknown',
        curriculumCourseId: schedule.curriculum_course_id,
        facultyId: schedule.faculty_id,
        roomId: schedule.room_id,
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time.toISOString(),
        endTime: schedule.end_time.toISOString(),
        academicYear: schedule.academic_year,
        semester: schedule.semester,
        status: schedule.status as 'active' | 'cancelled',
        faculty: facultyMap.get(schedule.faculty_id) || null,
        room: roomMap.get(schedule.room_id) || null,
        section: section || null,
        // Subject details from curriculum_course
        courseCode: curriculumCourse?.course_code || `Course ${schedule.curriculum_course_id}`,
        courseTitle: curriculumCourse?.descriptive_title || '',
        prerequisite: curriculumCourse?.prerequisite || null,
        subjectYearLevel: curriculumCourse?.year_level || null,
        subjectSemester: curriculumCourse?.semester || null,
        unitsLec: curriculumCourse?.units_lec || 0,
        unitsLab: curriculumCourse?.units_lab || 0,
        unitsTotal: curriculumCourse?.units_total || 0
      };
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching class schedules:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch class schedules'
      } as ApiError,
      { status: 500 }
    );
  }
}
