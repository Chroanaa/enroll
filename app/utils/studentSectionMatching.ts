type DbClient = any;

export const normalizeSemesterValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "1" ||
    normalized === "first" ||
    normalized === "first semester"
  ) {
    return "first";
  }
  if (
    normalized === "2" ||
    normalized === "second" ||
    normalized === "second semester"
  ) {
    return "second";
  }
  if (normalized === "3" || normalized === "summer") {
    return "summer";
  }
  return null;
};

export const semesterToNumber = (semester: string) => {
  if (semester === "first") return 1;
  if (semester === "second") return 2;
  return 3;
};

export async function getEnrolledSubjectIdsForTerm(
  db: DbClient,
  studentNumber: string,
  academicYear: string,
  semesterCode: string,
) {
  const semesterNum = semesterToNumber(semesterCode);
  const rows = await db.enrolled_subjects.findMany({
    where: {
      student_number: studentNumber,
      academic_year: academicYear,
      semester: semesterNum,
      status: "enrolled",
    },
    select: { curriculum_course_id: true },
  });

  return rows.map((row: { curriculum_course_id: number }) => row.curriculum_course_id);
}

export async function getMatchingScheduleIdsForSection(
  db: DbClient,
  sectionId: number,
  enrolledSubjectIds: number[],
) {
  const sectionSchedules: Array<{ id: number; curriculum_course_id: number }> =
    await db.class_schedule.findMany({
    where: {
      section_id: sectionId,
      status: "active",
    },
    select: { id: true, curriculum_course_id: true },
  });

  if (sectionSchedules.length === 0) {
    return [];
  }

  const sectionCurriculumIds = [
    ...new Set(
      sectionSchedules.map(
        (schedule: { curriculum_course_id: number }) => schedule.curriculum_course_id,
      ),
    ),
  ];
  const sectionCurriculumCourses: Array<{ id: number; course_code: string }> =
    await db.curriculum_course.findMany({
    where: { id: { in: sectionCurriculumIds } },
    select: { id: true, course_code: true },
  });
  const sectionCodeById = new Map(
    sectionCurriculumCourses.map((course: { id: number; course_code: string }) => [
      course.id,
      course.course_code,
    ]),
  );

  const schedulesByCourseCode = new Map<string, number[]>();
  for (const schedule of sectionSchedules) {
    const code = sectionCodeById.get(schedule.curriculum_course_id);
    if (!code) continue;
    if (!schedulesByCourseCode.has(code)) schedulesByCourseCode.set(code, []);
    schedulesByCourseCode.get(code)!.push(schedule.id);
  }

  const enrolledCurriculumCourses: Array<{
    id: number;
    subject_id: number | null;
    course_code: string;
  }> = await db.curriculum_course.findMany({
    where: { id: { in: enrolledSubjectIds } },
    select: { id: true, subject_id: true, course_code: true },
  });

  const enrolledBySubjectId: Array<{
    id: number;
    subject_id: number | null;
    course_code: string;
  }> =
    enrolledCurriculumCourses.length === 0
      ? await db.curriculum_course.findMany({
          where: { subject_id: { in: enrolledSubjectIds } },
          select: { id: true, subject_id: true, course_code: true },
        })
      : [];

  const enrolledBySubjectTable: Array<{ id: number; code: string }> =
    enrolledCurriculumCourses.length === 0 && enrolledBySubjectId.length === 0
      ? await db.subject.findMany({
          where: { id: { in: enrolledSubjectIds } },
          select: { id: true, code: true },
        })
      : [];

  const enrolledCodeById = new Map<number, string>();
  if (enrolledCurriculumCourses.length > 0) {
    for (const course of enrolledCurriculumCourses) {
      enrolledCodeById.set(course.id, course.course_code);
    }
  } else if (enrolledBySubjectId.length > 0) {
    for (const course of enrolledBySubjectId) {
      if (course.subject_id != null) {
        enrolledCodeById.set(course.subject_id, course.course_code);
      }
    }
  } else {
    for (const subject of enrolledBySubjectTable) {
      enrolledCodeById.set(subject.id, subject.code);
    }
  }

  const rawMatchingIds: number[] = [];
  for (const enrolledId of enrolledSubjectIds) {
    const code = enrolledCodeById.get(enrolledId);
    if (code && schedulesByCourseCode.has(code)) {
      rawMatchingIds.push(...schedulesByCourseCode.get(code)!);
    }
  }

  return [...new Set(rawMatchingIds)];
}
