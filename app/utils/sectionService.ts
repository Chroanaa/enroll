import { prisma } from '../lib/prisma';

/**
 * CONFLICT CHECKER SERVICE
 * Validates scheduling conflicts: room, faculty, section
 */
export const conflictChecker = {
  /**
   * Check if room is available at given time
   */
  async checkRoomConflict(
    roomId: number,
    dayOfWeek: string,
    startTime: Date,
    endTime: Date,
    academicYear: string,
    semester: string,
    excludeScheduleId?: number
  ): Promise<boolean> {
    const overlappingSchedule = await prisma.class_schedule.findFirst({
      where: {
        room_id: roomId,
        day_of_week: dayOfWeek,
        academic_year: academicYear,
        semester: semester,
        status: 'active',
        ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        // Time overlap: (newStart < existingEnd) AND (newEnd > existingStart)
        AND: [
          { start_time: { lt: endTime } },
          { end_time: { gt: startTime } }
        ]
      }
    });
    return !!overlappingSchedule;
  },

  /**
   * Check if faculty has scheduling conflict
   */
  async checkFacultyConflict(
    facultyId: number,
    dayOfWeek: string,
    startTime: Date,
    endTime: Date,
    academicYear: string,
    semester: string,
    excludeScheduleId?: number
  ): Promise<boolean> {
    const overlappingSchedule = await prisma.class_schedule.findFirst({
      where: {
        faculty_id: facultyId,
        day_of_week: dayOfWeek,
        academic_year: academicYear,
        semester: semester,
        status: 'active',
        ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        AND: [
          { start_time: { lt: endTime } },
          { end_time: { gt: startTime } }
        ]
      }
    });
    return !!overlappingSchedule;
  },

  /**
   * Check if section has internal time overlap
   */
  async checkSectionConflict(
    sectionId: number,
    dayOfWeek: string,
    startTime: Date,
    endTime: Date,
    academicYear: string,
    semester: string,
    excludeScheduleId?: number
  ): Promise<boolean> {
    const overlappingSchedule = await prisma.class_schedule.findFirst({
      where: {
        section_id: sectionId,
        day_of_week: dayOfWeek,
        academic_year: academicYear,
        semester: semester,
        status: 'active',
        ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        AND: [
          { start_time: { lt: endTime } },
          { end_time: { gt: startTime } }
        ]
      }
    });
    return !!overlappingSchedule;
  },

  /**
   * Check if subject is already scheduled in this section
   */
  async checkSubjectDuplication(
    sectionId: number,
    curriculumCourseId: number,
    academicYear: string,
    semester: string,
    excludeScheduleId?: number
  ): Promise<boolean> {
    const existingSchedule = await prisma.class_schedule.findFirst({
      where: {
        section_id: sectionId,
        curriculum_course_id: curriculumCourseId,
        academic_year: academicYear,
        semester: semester,
        status: 'active',
        ...(excludeScheduleId && { id: { not: excludeScheduleId } })
      }
    });
    return !!existingSchedule;
  }
};

/**
 * CAPACITY VALIDATOR SERVICE
 * Validates section capacity constraints
 */
export const capacityValidator = {
  /**
   * Check if section has capacity for more students
   */
  async canAddStudents(
    sectionId: number,
    numberToAdd: number = 1
  ): Promise<{ canAdd: boolean; currentCount: number; maxCapacity: number }> {
    const section = await prisma.sections.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      throw new Error(`Section ${sectionId} not found`);
    }

    const currentCount = section.student_count || 0;
    const maxCapacity = section.max_capacity || 0;
    const canAdd = currentCount + numberToAdd <= maxCapacity;

    return { canAdd, currentCount, maxCapacity };
  },

  /**
   * Get capacity info
   */
  async getCapacityInfo(sectionId: number): Promise<{
    currentCount: number;
    maxCapacity: number;
    available: number;
    isFull: boolean;
  }> {
    const section = await prisma.sections.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      throw new Error(`Section ${sectionId} not found`);
    }

    const currentCount = section.student_count || 0;
    const maxCapacity = section.max_capacity || 0;
    const available = Math.max(0, maxCapacity - currentCount);
    const isFull = currentCount >= maxCapacity;

    return { currentCount, maxCapacity, available, isFull };
  }
};

/**
 * TERM VALIDATOR SERVICE
 * Validates academic term constraints
 */
export const termValidator = {
  /**
   * Check if section already exists with same identifiers
   */
  async checkDuplicateSection(
    programId: number,
    yearLevel: number,
    academicYear: string,
    semester: string,
    sectionName: string,
    excludeSectionId?: number
  ): Promise<boolean> {
    const existing = await prisma.sections.findFirst({
      where: {
        program_id: programId,
        year_level: yearLevel,
        academic_year: academicYear,
        semester: semester,
        section_name: sectionName,
        ...(excludeSectionId && { id: { not: excludeSectionId } })
      }
    });
    return !!existing;
  },

  /**
   * Validate student is not already assigned for term
   */
  async checkStudentAlreadyAssigned(
    studentNumber: string,
    academicYear: string,
    semester: string
  ): Promise<boolean> {
    const assignment = await prisma.student_section.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: semester
        }
      }
    });
    return !!assignment;
  },

  /**
   * Validate section can be activated
   */
  async validateSectionForActivation(sectionId: number): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const section = await prisma.sections.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      errors.push('Section not found');
      return { isValid: false, errors };
    }

    if (section.status !== 'draft') {
      errors.push('Section must be in draft status to activate');
    }

    // Check if section has at least 1 schedule
    if (!section.academic_year || !section.semester) {
      errors.push('Section must have academic year and semester defined');
      return { isValid: false, errors };
    }

    const scheduleCount = await prisma.class_schedule.count({
      where: {
        section_id: sectionId,
        academic_year: section.academic_year,
        semester: section.semester,
        status: 'active'
      }
    });

    if (scheduleCount === 0) {
      errors.push('Section must have at least one schedule before activation');
    }

    // Check internal schedule overlaps and subject duplicates
    const schedules = await prisma.class_schedule.findMany({
      where: {
        section_id: sectionId,
        academic_year: section.academic_year!,
        semester: section.semester!,
        status: 'active'
      },
      orderBy: { day_of_week: 'asc' }
    });

    // Track curriculum course IDs to detect duplicates
    const curriculumCourseIds = new Set<number>();
    const roomIds = new Set<number>();

    for (let i = 0; i < schedules.length; i++) {
      const sched1 = schedules[i];
      
      // Check for subject duplicates
      if (curriculumCourseIds.has(sched1.curriculum_course_id)) {
        errors.push(
          `Subject duplicate detected: curriculum course ${sched1.curriculum_course_id} is scheduled multiple times`
        );
      } else {
        curriculumCourseIds.add(sched1.curriculum_course_id);
      }

      // Collect room IDs for capacity check
      roomIds.add(sched1.room_id);
    }

    // Check room capacities
    if (section.max_capacity && roomIds.size > 0) {
      const rooms = await prisma.room.findMany({
        where: {
          id: { in: Array.from(roomIds) }
        }
      });

      for (const room of rooms) {
        if (room.capacity < section.max_capacity) {
          errors.push(
            `Room ${room.room_number} capacity (${room.capacity}) is less than section max capacity (${section.max_capacity})`
          );
        }
      }
    }

    // Check for time overlaps
    for (let i = 0; i < schedules.length; i++) {
      const sched1 = schedules[i];

      // Check for time overlaps with other schedules
      for (let j = i + 1; j < schedules.length; j++) {
        const sched2 = schedules[j];

        if (sched1.day_of_week === sched2.day_of_week) {
          const overlap =
            sched1.start_time < sched2.end_time &&
            sched1.end_time > sched2.start_time;

          if (overlap) {
            errors.push(
              `Schedule overlap detected on ${sched1.day_of_week} between ${sched1.start_time.toISOString()} and ${sched1.end_time.toISOString()}`
            );
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Get current academic term
   */
  async getCurrentTerm(): Promise<{
    academicYear: string;
    semester: string;
  }> {
    // This assumes you have an academic term setting or constant
    // Adjust based on your system implementation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Common semestration: 1st semester (Aug-Dec), 2nd (Jan-May), Summer (Jun-Jul)
    let semester: string = 'first';
    if (currentMonth >= 1 && currentMonth <= 5) {
      semester = 'second';
    } else if (currentMonth >= 6 && currentMonth <= 7) {
      semester = 'summer';
    }

    return {
      academicYear: `${currentYear}-${currentYear + 1}`,
      semester: semester
    };
  }
};

/**
 * SECTION SERVICE
 * High-level section operations
 * NOTE: Moved to API routes for client-side access
 */
export const sectionService = {
  // Client-side operations moved to API routes:
  // - getEligibleStudents → GET /api/eligible-students
  // - getSectionCurriculum → GET /api/section-curriculum
  // - getSectionSchedules → GET /api/section-schedules
};

