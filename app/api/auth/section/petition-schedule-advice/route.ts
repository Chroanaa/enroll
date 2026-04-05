import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope } from "@/app/lib/accessScope";

const ALLOWED_ROLES = new Set([1, 4, 5]); // Admin, Registrar, Dean
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type StudentScheduleRow = {
  student_number: string;
  day_of_week: string;
  start_time: Date;
  end_time: Date;
  course_code: string | null;
  descriptive_title: string | null;
  section_name: string | null;
};

function toMinutes(value: Date): number {
  return value.getHours() * 60 + value.getMinutes();
}

function formatHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function semesterToNumber(semesterRaw: string | null | undefined): number {
  const value = String(semesterRaw || "").trim().toLowerCase();
  if (["first", "first semester", "1", "1st semester"].includes(value)) return 1;
  if (["second", "second semester", "2", "2nd semester"].includes(value)) return 2;
  if (["third", "third semester", "3", "3rd semester", "summer"].includes(value)) return 3;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function semesterAliases(semesterNum: number): string[] {
  if (semesterNum === 1) return ["first", "first semester", "1", "1st semester"];
  if (semesterNum === 2) return ["second", "second semester", "2", "2nd semester"];
  return ["third", "third semester", "3", "3rd semester", "summer"];
}

function buildCandidates(
  durationMinutes: number,
  petitionStudents: string[],
  studentSchedules: Map<string, StudentScheduleRow[]>,
) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];

  const suggestions: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    conflictCount: number;
    conflictClassCount: number;
    totalStudents: number;
    conflictStudents: Array<{
      studentNumber: string;
      conflictingCourseCode: string;
      conflictingTitle: string;
      conflictingSection: string;
      conflictingDay: string;
      conflictingStart: string;
      conflictingEnd: string;
    }>;
  }> = [];

  const startMin = 7 * 60;
  const endBoundary = 21 * 60;

  for (const day of DAYS) {
    for (let slotStart = startMin; slotStart + durationMinutes <= endBoundary; slotStart += 30) {
      const slotEnd = slotStart + durationMinutes;
      const conflictStudentsMap = new Map<string, {
        studentNumber: string;
        conflictingCourseCode: string;
        conflictingTitle: string;
        conflictingSection: string;
        conflictingDay: string;
        conflictingStart: string;
        conflictingEnd: string;
      }>();
      const conflicts: Array<{
        studentNumber: string;
        conflictingCourseCode: string;
        conflictingTitle: string;
        conflictingSection: string;
        conflictingDay: string;
        conflictingStart: string;
        conflictingEnd: string;
      }> = [];

      for (const studentNumber of petitionStudents) {
        const schedules = studentSchedules.get(studentNumber) || [];
        const conflictSchedules = schedules.filter((row) => {
          const sameDay = String(row.day_of_week || "").trim().toLowerCase() === day.toLowerCase();
          if (!sameDay) return false;
          const rowStart = toMinutes(new Date(row.start_time));
          const rowEnd = toMinutes(new Date(row.end_time));
          return slotStart < rowEnd && slotEnd > rowStart;
        });

        for (const conflictSchedule of conflictSchedules) {
          if (!conflictStudentsMap.has(studentNumber)) {
            conflictStudentsMap.set(studentNumber, {
              studentNumber,
              conflictingCourseCode: String(conflictSchedule.course_code || "N/A"),
              conflictingTitle: String(conflictSchedule.descriptive_title || ""),
              conflictingSection: String(conflictSchedule.section_name || "N/A"),
              conflictingDay: String(conflictSchedule.day_of_week || day),
              conflictingStart: formatHHmm(toMinutes(new Date(conflictSchedule.start_time))),
              conflictingEnd: formatHHmm(toMinutes(new Date(conflictSchedule.end_time))),
            });
          }
          conflicts.push({
            studentNumber,
            conflictingCourseCode: String(conflictSchedule.course_code || "N/A"),
            conflictingTitle: String(conflictSchedule.descriptive_title || ""),
            conflictingSection: String(conflictSchedule.section_name || "N/A"),
            conflictingDay: String(conflictSchedule.day_of_week || day),
            conflictingStart: formatHHmm(toMinutes(new Date(conflictSchedule.start_time))),
            conflictingEnd: formatHHmm(toMinutes(new Date(conflictSchedule.end_time))),
          });
        }
      }

      suggestions.push({
        dayOfWeek: day,
        startTime: formatHHmm(slotStart),
        endTime: formatHHmm(slotEnd),
        conflictCount: conflictStudentsMap.size,
        conflictClassCount: conflicts.length,
        totalStudents: petitionStudents.length,
        conflictStudents: conflicts,
      });
    }
  }

  return suggestions
    .sort((a, b) => {
      if (a.conflictCount !== b.conflictCount) return a.conflictCount - b.conflictCount;
      if (a.conflictClassCount !== b.conflictClassCount) return a.conflictClassCount - b.conflictClassCount;
      if (a.dayOfWeek !== b.dayOfWeek) return DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek);
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(Number(scope.roleId || 0))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sectionId = Number(searchParams.get("sectionId") || "");
    const curriculumCourseId = Number(searchParams.get("curriculumCourseId") || "");

    if (!Number.isFinite(sectionId) || sectionId <= 0 || !Number.isFinite(curriculumCourseId) || curriculumCourseId <= 0) {
      return NextResponse.json(
        { error: "sectionId and curriculumCourseId are required." },
        { status: 400 },
      );
    }

    const [section, course] = await Promise.all([
      prisma.sections.findUnique({
        where: { id: sectionId },
        select: { id: true, academic_year: true, semester: true, section_name: true },
      }),
      prisma.curriculum_course.findUnique({
        where: { id: curriculumCourseId },
        select: {
          id: true,
          course_code: true,
          descriptive_title: true,
          lecture_hour: true,
          lab_hour: true,
          units_lab: true,
          units_total: true,
        },
      }),
    ]);

    if (!section || !course) {
      return NextResponse.json({ error: "Section or course not found." }, { status: 404 });
    }

    const semesterNum = semesterToNumber(section.semester);
    if (!semesterNum) {
      return NextResponse.json({ error: "Invalid section semester." }, { status: 400 });
    }
    const aliases = semesterAliases(semesterNum);

    const petitionStudentRows = await prisma.$queryRaw<{ student_number: string }[]>`
      SELECT DISTINCT psr.student_number
      FROM student_petition_subject_requests psr
      WHERE psr.curriculum_course_id = ${curriculumCourseId}
        AND psr.academic_year = ${section.academic_year}
        AND psr.semester = ${semesterNum}
        AND LOWER(COALESCE(psr.status, '')) = 'pending_approval'
      ORDER BY psr.student_number
    `;

    const petitionStudents = petitionStudentRows.map((row) => String(row.student_number)).filter(Boolean);
    if (petitionStudents.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sectionId,
          curriculumCourseId,
          courseCode: course.course_code,
          descriptiveTitle: course.descriptive_title,
          pendingStudentCount: 0,
          lectureSuggestions: [],
          labSuggestions: [],
          allStudentSchedules: [],
        },
      });
    }

    const scheduleRows = await prisma.$queryRaw<StudentScheduleRow[]>`
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
      WHERE ss.student_number IN (${Prisma.join(petitionStudents)})
        AND ss.academic_year = ${section.academic_year}
        AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(aliases)})
        AND LOWER(COALESCE(cs.status, '')) = 'active'
    `;

    const byStudent = new Map<string, StudentScheduleRow[]>();
    for (const row of scheduleRows) {
      const key = String(row.student_number || "");
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key)!.push(row);
    }

    const lectureHours = Number(course.lecture_hour || 0);
    const labHours = Number(course.lab_hour || 0);
    const isLabOnly = lectureHours === 0 && (Number(course.units_lab || 0) > 0 || labHours > 0);
    const lectureMinutes = isLabOnly ? 0 : lectureHours > 0 ? lectureHours * 60 : 0;
    const labMinutes = labHours > 0 ? labHours * 60 : 0;

    const lectureSuggestions = buildCandidates(lectureMinutes, petitionStudents, byStudent);
    const labSuggestions = buildCandidates(labMinutes, petitionStudents, byStudent);

    return NextResponse.json({
      success: true,
      data: {
        sectionId,
        sectionName: section.section_name,
        academicYear: section.academic_year,
        semester: semesterNum,
        curriculumCourseId,
        courseCode: course.course_code,
        descriptiveTitle: course.descriptive_title,
        pendingStudentCount: petitionStudents.length,
        lectureMinutes,
        labMinutes,
        lectureSuggestions,
        labSuggestions,
      },
    });
  } catch (error: any) {
    console.error("Error building petition schedule advice:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to build petition schedule advice." },
      { status: 500 },
    );
  }
}
