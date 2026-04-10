import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";
import { recalculateAssessmentForTerm } from "../../../lib/recalculateAssessment";
import { insertIntoReports } from "../../../utils/reportsUtils";
import {
  ensureDeanStudentAccess,
  getSessionScope,
} from "@/app/lib/accessScope";
import { sendExternalCrossEnrollmentApprovedEmail } from "@/app/lib/email";
import {
  getEnrolledSubjectIdsForTerm,
  getMatchingScheduleIdsForSection,
} from "../../../utils/studentSectionMatching";

const ROLES = {
  ADMIN: 1,
} as const;
const DEFAULT_MIN_PETITION_STUDENTS = 15;

type RoleContext = {
  roleId: number;
  roleName: string;
  isDean: boolean;
};

function getSemesterAliases(semester: number): string[] {
  if (semester === 1) {
    return ["first", "first semester", "1", "1st semester"];
  }
  if (semester === 2) {
    return ["second", "second semester", "2", "2nd semester"];
  }
  if (semester === 3) {
    return ["third", "third semester", "3", "3rd semester", "summer"];
  }
  return [];
}

const SHIFT_REQUESTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS student_section_shift_requests (
    id SERIAL PRIMARY KEY,
    student_number VARCHAR(20) NOT NULL,
    from_section_id INT NOT NULL,
    to_section_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    reason TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
    requested_by INT NULL,
    requested_by_role INT NULL,
    requested_by_name VARCHAR(150) NULL,
    approved_by INT NULL,
    approved_by_role INT NULL,
    approved_by_name VARCHAR(150) NULL,
    executed_by INT NULL,
    executed_by_role INT NULL,
    executed_by_name VARCHAR(150) NULL,
    requested_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP(6) NULL,
    executed_at TIMESTAMP(6) NULL
  )
`;

const PROGRAM_SHIFT_REQUESTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS student_program_shift_requests (
    id SERIAL PRIMARY KEY,
    student_number VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    from_program_id INT NULL,
    from_major_id INT NULL,
    to_program_id INT NOT NULL,
    to_major_id INT NULL,
    reason TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
    requested_by INT NULL,
    requested_by_role INT NULL,
    requested_by_name VARCHAR(150) NULL,
    approved_by INT NULL,
    approved_by_role INT NULL,
    approved_by_name VARCHAR(150) NULL,
    requested_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP(6) NULL,
    executed_at TIMESTAMP(6) NULL
  )
`;

const PETITION_SUBJECT_REQUESTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS student_petition_subject_requests (
    id SERIAL PRIMARY KEY,
    student_number VARCHAR(20) NOT NULL,
    home_program_id INT NULL,
    home_major_id INT NULL,
    curriculum_course_id INT NOT NULL,
    subject_id INT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    requested_subject_semester INT NULL,
    requested_subject_year_level INT NULL,
    units_total INT NOT NULL DEFAULT 0,
    reason TEXT NULL,
    petition_type VARCHAR(30) NOT NULL DEFAULT 'not_open',
    status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
    requested_by INT NULL,
    approved_by INT NULL,
    requested_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP(6) NULL
  )
`;

const EXTERNAL_CROSS_ENROLLMENT_REQUESTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS student_external_cross_enrollment_requests (
    id SERIAL PRIMARY KEY,
    student_number VARCHAR(20) NOT NULL,
    school_id INT NULL,
    external_school_name VARCHAR(255) NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_title VARCHAR(255) NOT NULL,
    units_total NUMERIC(6,2) NOT NULL DEFAULT 0,
    year_level INT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    reason TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
    requested_by INT NULL,
    approved_by INT NULL,
    requested_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP(6) NULL,
    remarks TEXT NULL
  )
`;

async function ensureShiftRequestsTable() {
  await prisma.$executeRawUnsafe(SHIFT_REQUESTS_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_section_shift_requests ADD COLUMN IF NOT EXISTS requested_by_role INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_section_shift_requests ADD COLUMN IF NOT EXISTS requested_by_name VARCHAR(150) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_section_shift_requests ADD COLUMN IF NOT EXISTS approved_by_role INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_section_shift_requests ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(150) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_section_shift_requests ADD COLUMN IF NOT EXISTS executed_by INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_section_shift_requests ADD COLUMN IF NOT EXISTS executed_by_role INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_section_shift_requests ADD COLUMN IF NOT EXISTS executed_by_name VARCHAR(150) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_section_shift_requests ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP(6) NULL",
  );
}

async function ensureProgramShiftRequestsTable() {
  await prisma.$executeRawUnsafe(PROGRAM_SHIFT_REQUESTS_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_program_shift_requests ADD COLUMN IF NOT EXISTS requested_by_role INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_program_shift_requests ADD COLUMN IF NOT EXISTS requested_by_name VARCHAR(150) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_program_shift_requests ADD COLUMN IF NOT EXISTS approved_by INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_program_shift_requests ADD COLUMN IF NOT EXISTS approved_by_role INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_program_shift_requests ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(150) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_program_shift_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(6) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_program_shift_requests ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP(6) NULL",
  );
}

async function ensurePetitionSubjectRequestsTable() {
  await prisma.$executeRawUnsafe(PETITION_SUBJECT_REQUESTS_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_petition_subject_requests ADD COLUMN IF NOT EXISTS requested_subject_semester INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_petition_subject_requests ADD COLUMN IF NOT EXISTS requested_subject_year_level INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_petition_subject_requests ADD COLUMN IF NOT EXISTS petition_type VARCHAR(30) NOT NULL DEFAULT 'not_open'",
  );
}

async function ensureExternalCrossEnrollmentRequestsTable() {
  await prisma.$executeRawUnsafe(EXTERNAL_CROSS_ENROLLMENT_REQUESTS_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_external_cross_enrollment_requests ADD COLUMN IF NOT EXISTS school_id INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_external_cross_enrollment_requests ADD COLUMN IF NOT EXISTS remarks TEXT NULL",
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_external_cross_enrollment_term ON student_external_cross_enrollment_requests(academic_year, semester)",
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_external_cross_enrollment_status ON student_external_cross_enrollment_requests(status)",
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_external_cross_enrollment_student ON student_external_cross_enrollment_requests(student_number)",
  );
}

async function ensureSubjectDropHistoryAssessmentAdjustedColumn() {
  await prisma.$executeRawUnsafe(
    "ALTER TABLE subject_drop_history ADD COLUMN IF NOT EXISTS assessment_adjusted BOOLEAN NOT NULL DEFAULT false",
  );
}

function termLabelFromSemester(semester: number): string {
  if (semester === 1) return "First Semester";
  if (semester === 2) return "Second Semester";
  return "Third Semester";
}

async function getMinimumPetitionStudents(): Promise<number> {
  const setting = await prisma.settings.findUnique({
    where: { key: "petition_min_students_required" },
    select: { value: true },
  });
  const parsed = Number.parseInt(String(setting?.value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MIN_PETITION_STUDENTS;
  }
  return parsed;
}

async function getRoleContext(roleId: number): Promise<RoleContext> {
  if (!Number.isFinite(roleId) || roleId <= 0) {
    return {
      roleId: 0,
      roleName: "",
      isDean: false,
    };
  }

  const roleRow = await prisma.roles.findUnique({
    where: { id: roleId },
    select: { role: true },
  });

  const roleName = String(roleRow?.role || "")
    .trim()
    .toLowerCase();

  return {
    roleId,
    roleName,
    isDean: roleName === "dean",
  };
}

function canManageApprovals(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.isDean;
}

interface ApprovalSubjectItem {
  course_code: string | null;
  descriptive_title: string | null;
  units_total: number | null;
}

type PendingStudentDropGroup = {
  student_number: string;
  academic_year: string;
  semester: number;
  pending_subject_count: number;
  total_subject_count: number;
  first_name: string | null;
  last_name: string | null;
  student_name: string | null;
  updated_at: Date | string | null;
  drop_reason: string | null;
  subjects: ApprovalSubjectItem[] | null;
};

type TimedScheduleRow = {
  class_schedule_id: number;
  section_id: number | null;
  section_name: string | null;
  course_code: string | null;
  descriptive_title: string | null;
  day_of_week: string | null;
  start_time: Date | string | null;
  end_time: Date | string | null;
  units_lec: number | null;
  units_lab: number | null;
};

type PetitionScheduleConflictDetail = {
  candidateClassScheduleId: number;
  candidateSectionId: number | null;
  candidateSectionName: string | null;
  candidateCourseCode: string | null;
  candidateDay: string | null;
  candidateStart: string | null;
  candidateEnd: string | null;
  studentClassScheduleId: number;
  studentSectionName: string | null;
  studentCourseCode: string | null;
  studentDay: string | null;
  studentStart: string | null;
  studentEnd: string | null;
};

function toMinutesFromDateLike(value: Date | string | null): number {
  if (!value) return 0;
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return 0;
  return dateValue.getHours() * 60 + dateValue.getMinutes();
}

function normalizeDay(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function toTimeLabel(value: Date | string | null): string | null {
  if (!value) return null;
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return null;
  const hh = String(dateValue.getHours()).padStart(2, "0");
  const mm = String(dateValue.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

async function analyzePetitionApprovalSchedule(
  args: {
    studentNumber: string;
    academicYear: string;
    semester: number;
    curriculumCourseId: number;
  },
) {
  const semesterAliases = getSemesterAliases(args.semester);
  const sem1 = semesterAliases[0] || "";
  const sem2 = semesterAliases[1] || sem1;
  const sem3 = semesterAliases[2] || sem1;
  const sem4 = semesterAliases[3] || sem1;
  const sem5 = semesterAliases[4] || sem4;

  const studentSchedules = await prisma.$queryRaw<TimedScheduleRow[]>`
    SELECT
      cs.id AS class_schedule_id,
      cs.section_id,
      sec.section_name,
      COALESCE(cc.course_code, sub.code) AS course_code,
      COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
      cs.day_of_week,
      cs.start_time,
      cs.end_time,
      COALESCE(cc.units_lec, sub.units_lec, 0) AS units_lec,
      COALESCE(cc.units_lab, sub.units_lab, 0) AS units_lab
    FROM student_section ss
    JOIN student_section_subjects sss ON sss.student_section_id = ss.id
    JOIN class_schedule cs ON cs.id = sss.class_schedule_id
    LEFT JOIN sections sec ON sec.id = cs.section_id
    LEFT JOIN curriculum_course cc ON cc.id = cs.curriculum_course_id
    LEFT JOIN subject sub ON sub.id = cc.subject_id
    WHERE ss.student_number = ${args.studentNumber}
      AND ss.academic_year = ${args.academicYear}
      AND LOWER(COALESCE(ss.semester, '')) IN (${sem1}, ${sem2}, ${sem3}, ${sem4}, ${sem5})
      AND cs.status = 'active'
    ORDER BY cs.day_of_week ASC, cs.start_time ASC
  `;

  const petitionSchedules = await prisma.$queryRaw<TimedScheduleRow[]>`
    SELECT
      cs.id AS class_schedule_id,
      cs.section_id,
      sec.section_name,
      COALESCE(cc.course_code, sub.code) AS course_code,
      COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
      cs.day_of_week,
      cs.start_time,
      cs.end_time,
      COALESCE(cc.units_lec, sub.units_lec, 0) AS units_lec,
      COALESCE(cc.units_lab, sub.units_lab, 0) AS units_lab
    FROM class_schedule cs
    LEFT JOIN sections sec ON sec.id = cs.section_id
    LEFT JOIN curriculum_course cc ON cc.id = cs.curriculum_course_id
    LEFT JOIN subject sub ON sub.id = cc.subject_id
    WHERE cs.curriculum_course_id = ${args.curriculumCourseId}
      AND cs.academic_year = ${args.academicYear}
      AND LOWER(COALESCE(cs.semester, '')) IN (${sem1}, ${sem2}, ${sem3}, ${sem4}, ${sem5})
      AND cs.status = 'active'
    ORDER BY sec.section_name ASC, cs.day_of_week ASC, cs.start_time ASC
  `;

  if (petitionSchedules.length === 0) {
    return {
      studentSchedules,
      petitionSchedules,
      allSectionsConflicted: false,
      hasConflictFreeSection: false,
      conflictDetails: [] as PetitionScheduleConflictDetail[],
    };
  }

  const schedulesBySection = new Map<string, TimedScheduleRow[]>();
  for (const row of petitionSchedules) {
    const key = String(row.section_id || `no-section-${row.class_schedule_id}`);
    if (!schedulesBySection.has(key)) schedulesBySection.set(key, []);
    schedulesBySection.get(key)!.push(row);
  }

  const conflictDetails: PetitionScheduleConflictDetail[] = [];
  let hasConflictFreeSection = false;

  for (const [, sectionRows] of schedulesBySection.entries()) {
    let sectionHasConflict = false;

    for (const candidate of sectionRows) {
      const candidateDay = normalizeDay(candidate.day_of_week);
      const candidateStart = toMinutesFromDateLike(candidate.start_time);
      const candidateEnd = toMinutesFromDateLike(candidate.end_time);
      if (!candidateDay || candidateEnd <= candidateStart) continue;

      for (const existing of studentSchedules) {
        const existingDay = normalizeDay(existing.day_of_week);
        if (candidateDay !== existingDay) continue;
        const existingStart = toMinutesFromDateLike(existing.start_time);
        const existingEnd = toMinutesFromDateLike(existing.end_time);
        if (existingEnd <= existingStart) continue;

        const hasOverlap =
          candidateStart < existingEnd && candidateEnd > existingStart;
        if (!hasOverlap) continue;

        sectionHasConflict = true;
        conflictDetails.push({
          candidateClassScheduleId: Number(candidate.class_schedule_id),
          candidateSectionId: candidate.section_id,
          candidateSectionName: candidate.section_name,
          candidateCourseCode: candidate.course_code,
          candidateDay: candidate.day_of_week,
          candidateStart: toTimeLabel(candidate.start_time),
          candidateEnd: toTimeLabel(candidate.end_time),
          studentClassScheduleId: Number(existing.class_schedule_id),
          studentSectionName: existing.section_name,
          studentCourseCode: existing.course_code,
          studentDay: existing.day_of_week,
          studentStart: toTimeLabel(existing.start_time),
          studentEnd: toTimeLabel(existing.end_time),
        });
      }
    }

    if (!sectionHasConflict) {
      hasConflictFreeSection = true;
      break;
    }
  }

  return {
    studentSchedules,
    petitionSchedules,
    allSectionsConflicted: !hasConflictFreeSection,
    hasConflictFreeSection,
    conflictDetails,
  };
}

async function getEnrollmentRowForTerm(args: {
  studentNumber: string;
  academicYear: string;
  semester: number;
}) {
  const aliases = getSemesterAliases(args.semester);
  const rows = await prisma.$queryRaw<
    { id: number; course_program: string | null; major_id: number | null }[]
  >`
    SELECT id, course_program, major_id
    FROM enrollment
    WHERE student_number = ${args.studentNumber}
      AND academic_year = ${args.academicYear}
      AND LOWER(COALESCE(term, '')) IN (${aliases[0]}, ${aliases[1]}, ${aliases[2]}, ${aliases[3]}, ${aliases[4] || aliases[3]})
    ORDER BY id DESC
    LIMIT 1
  `;
  if (rows[0]) return rows[0];

  return prisma.enrollment.findFirst({
    where: {
      student_number: args.studentNumber,
      academic_year: args.academicYear,
    },
    orderBy: { id: "desc" },
    select: {
      id: true,
      course_program: true,
      major_id: true,
    },
  });
}

async function clearStudentSectionAssignmentForTerm(
  tx: any,
  args: {
    studentNumber: string;
    academicYear: string;
    semester: number;
  },
) {
  const aliases = getSemesterAliases(args.semester);
  const assignmentRows = await tx.$queryRaw<
    { id: number; section_id: number }[]
  >`
    SELECT id, section_id
    FROM student_section
    WHERE student_number = ${args.studentNumber}
      AND academic_year = ${args.academicYear}
      AND LOWER(COALESCE(semester, '')) IN (${aliases[0]}, ${aliases[1]}, ${aliases[2]}, ${aliases[3]}, ${aliases[4] || aliases[3]})
    ORDER BY id DESC
    LIMIT 1
  `;
  const existingAssignment = assignmentRows[0];
  if (!existingAssignment) return;

  await tx.student_section_subjects.deleteMany({
    where: { student_section_id: existingAssignment.id },
  });

  await tx.student_section.delete({
    where: { id: existingAssignment.id },
  });

  await tx.$executeRaw`
    UPDATE sections
    SET student_count = GREATEST(COALESCE(student_count, 0) - 1, 0)
    WHERE id = ${existingAssignment.section_id}
  `;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const scope = await getSessionScope();
    const userRole = Number((session?.user as any)?.role) || 0;
    const roleContext = await getRoleContext(userRole);

    if (!canManageApprovals(roleContext)) {
      return NextResponse.json(
        { error: "Unauthorized to view approvals." },
        { status: 403 },
      );
    }

    if (scope?.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    await Promise.all([
      ensureShiftRequestsTable(),
      ensureProgramShiftRequestsTable(),
      ensurePetitionSubjectRequestsTable(),
      ensureExternalCrossEnrollmentRequestsTable(),
    ]);

    const [
      subjectOverloads,
      groupedStudentDrops,
      subjectDrops,
      crossEnrollmentRequests,
      externalCrossEnrollmentRequests,
      shiftingRequests,
      programShiftRequests,
      petitionSubjectRequests,
    ] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT
          es.student_number,
          es.academic_year,
          es.semester,
          COUNT(*)::int AS subject_count,
          COALESCE(SUM(es.units_total), 0)::int AS total_units,
          enr.first_name,
          enr.family_name AS last_name,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'course_code', COALESCE(cc.course_code, sub.code),
                'descriptive_title', COALESCE(cc.descriptive_title, sub.name),
                'units_total', es.units_total
              )
              ORDER BY COALESCE(cc.course_code, sub.code)
            ),
            '[]'::json
          ) AS subjects
        FROM enrolled_subjects es
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = es.student_number
            AND e.academic_year = es.academic_year
            AND (
              (es.semester = 1 AND e.term IN ('First Semester', '1st Semester', 'first', '1'))
              OR
              (es.semester = 2 AND e.term IN ('Second Semester', '2nd Semester', 'second', '2'))
            )
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        LEFT JOIN curriculum_course cc ON cc.id = es.curriculum_course_id
        LEFT JOIN subject sub ON sub.id = es.subject_id
        WHERE es.status = 'pending_approval'
        GROUP BY es.student_number, es.academic_year, es.semester, enr.family_name, enr.first_name, enr.middle_name
        ORDER BY es.academic_year DESC, es.semester DESC, es.student_number ASC
      `,
      prisma.$queryRaw<PendingStudentDropGroup[]>`
        SELECT
          es.student_number,
          es.academic_year,
          es.semester,
          COUNT(*)::int AS pending_subject_count,
          totals.total_subject_count::int,
          enr.first_name,
          enr.family_name AS last_name,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
          MAX(es.updated_at) AS updated_at,
          MAX(NULLIF(TRIM(COALESCE(sdh.drop_reason, '')), '')) AS drop_reason,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'course_code', COALESCE(cc.course_code, sub.code),
                'descriptive_title', COALESCE(cc.descriptive_title, sub.name),
                'units_total', es.units_total
              )
              ORDER BY COALESCE(cc.course_code, sub.code)
            ),
            '[]'::json
          ) AS subjects
        FROM enrolled_subjects es
        INNER JOIN LATERAL (
          SELECT COUNT(*)::int AS total_subject_count
          FROM enrolled_subjects es_all
          WHERE es_all.student_number = es.student_number
            AND es_all.academic_year = es.academic_year
            AND es_all.semester = es.semester
            AND LOWER(COALESCE(es_all.status, '')) = 'enrolled'
        ) totals ON TRUE
        LEFT JOIN curriculum_course cc ON cc.id = es.curriculum_course_id
        LEFT JOIN subject sub ON sub.id = es.subject_id
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = es.student_number
            AND e.academic_year = es.academic_year
            AND (
              (es.semester = 1 AND e.term IN ('First Semester', '1st Semester', 'first', '1'))
              OR
              (es.semester = 2 AND e.term IN ('Second Semester', '2nd Semester', 'second', '2'))
              OR
              (es.semester = 3 AND e.term IN ('Third Semester', '3rd Semester', 'third', '3', 'summer'))
            )
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        LEFT JOIN LATERAL (
          SELECT drop_reason
          FROM subject_drop_history
          WHERE enrolled_subject_id = es.id
            AND status = 'pending_approval'
          ORDER BY dropped_at DESC, id DESC
          LIMIT 1
        ) sdh ON TRUE
        WHERE es.drop_status = 'pending_approval'
        GROUP BY
          es.student_number,
          es.academic_year,
          es.semester,
          totals.total_subject_count,
          enr.family_name,
          enr.first_name,
          enr.middle_name
        HAVING COUNT(*) = totals.total_subject_count
          AND totals.total_subject_count > 1
        ORDER BY MAX(es.updated_at) DESC NULLS LAST, es.student_number ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          es.id,
          es.student_number,
          es.academic_year,
          es.semester,
          es.drop_status,
          enr.first_name,
          enr.family_name AS last_name,
          COALESCE(cc.course_code, sub.code) AS course_code,
          COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
          es.updated_at,
          sdh.drop_reason
        FROM enrolled_subjects es
        LEFT JOIN curriculum_course cc ON cc.id = es.curriculum_course_id
        LEFT JOIN subject sub ON sub.id = es.subject_id
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = es.student_number
            AND e.academic_year = es.academic_year
            AND (
              (es.semester = 1 AND e.term IN ('First Semester', '1st Semester', 'first', '1'))
              OR
              (es.semester = 2 AND e.term IN ('Second Semester', '2nd Semester', 'second', '2'))
            )
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        LEFT JOIN LATERAL (
          SELECT drop_reason
          FROM subject_drop_history
          WHERE enrolled_subject_id = es.id
            AND status = 'pending_approval'
          ORDER BY dropped_at DESC, id DESC
          LIMIT 1
        ) sdh ON TRUE
        WHERE es.drop_status = 'pending_approval'
        ORDER BY es.updated_at DESC NULLS LAST, es.student_number ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          cer.id,
          cer.student_number,
          cer.academic_year,
          cer.semester,
          cer.reason,
          cer.status,
          cer.requested_at,
          cer.units_total,
          enr.first_name,
          enr.family_name AS last_name,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
          COALESCE(cc.course_code, sub.code) AS course_code,
          COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
          home_program.code AS home_program_code,
          home_program.name AS home_program_name,
          host_program.code AS host_program_code,
          host_program.name AS host_program_name
        FROM student_cross_enrollment_requests cer
        LEFT JOIN curriculum_course cc ON cc.id = cer.curriculum_course_id
        LEFT JOIN subject sub ON sub.id = cer.subject_id
        LEFT JOIN program home_program ON home_program.id = cer.home_program_id
        LEFT JOIN program host_program ON host_program.id = cer.host_program_id
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = cer.student_number
            AND e.academic_year = cer.academic_year
            AND (
              (cer.semester = 1 AND e.term IN ('First Semester', '1st Semester', 'first', '1'))
              OR
              (cer.semester = 2 AND e.term IN ('Second Semester', '2nd Semester', 'second', '2'))
            )
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        WHERE cer.status = 'pending_approval'
        ORDER BY cer.requested_at DESC NULLS LAST, cer.id DESC
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          req.id,
          req.student_number,
          req.academic_year,
          req.semester,
          req.reason,
          req.status,
          req.requested_at,
          req.units_total,
          req.subject_code,
          req.subject_title,
          req.external_school_name,
          enr.first_name,
          enr.family_name AS last_name,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name
        FROM student_external_cross_enrollment_requests req
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = req.student_number
            AND e.academic_year = req.academic_year
            AND (
              (req.semester = 1 AND e.term IN ('First Semester', '1st Semester', 'first', '1'))
              OR
              (req.semester = 2 AND e.term IN ('Second Semester', '2nd Semester', 'second', '2'))
            )
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        WHERE req.status = 'pending_approval'
        ORDER BY req.requested_at DESC NULLS LAST, req.id DESC
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          ssr.id,
          ssr.student_number,
          ssr.academic_year,
          ssr.semester,
          ssr.from_section_id,
          ssr.to_section_id,
          ssr.reason,
          ssr.status,
          ssr.requested_at,
          ssr.requested_by,
          ssr.requested_by_role,
          ssr.requested_by_name,
          ssr.approved_by,
          ssr.approved_by_role,
          ssr.approved_by_name,
          ssr.executed_by,
          ssr.executed_by_role,
          ssr.executed_by_name,
          ssr.approved_at,
          ssr.executed_at,
          from_sec.section_name AS from_section_name,
          to_sec.section_name AS to_section_name,
          enr.first_name,
          enr.family_name AS last_name,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name
        FROM student_section_shift_requests ssr
        LEFT JOIN sections from_sec ON from_sec.id = ssr.from_section_id
        LEFT JOIN sections to_sec ON to_sec.id = ssr.to_section_id
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = ssr.student_number
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        WHERE ssr.status = 'pending_approval'
        ORDER BY ssr.requested_at DESC NULLS LAST, ssr.id DESC
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          psr.id,
          psr.student_number,
          psr.academic_year,
          psr.semester,
          psr.from_program_id,
          psr.from_major_id,
          psr.to_program_id,
          psr.to_major_id,
          psr.reason,
          psr.status,
          psr.requested_by,
          psr.requested_by_role,
          psr.requested_by_name,
          psr.approved_by,
          psr.approved_by_role,
          psr.approved_by_name,
          psr.requested_at,
          psr.approved_at,
          psr.executed_at,
          from_program.code AS from_program_code,
          from_program.name AS from_program_name,
          to_program.code AS to_program_code,
          to_program.name AS to_program_name,
          from_major.name AS from_major_name,
          to_major.name AS to_major_name,
          enr.first_name,
          enr.family_name AS last_name,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name
        FROM student_program_shift_requests psr
        LEFT JOIN program from_program ON from_program.id = psr.from_program_id
        LEFT JOIN program to_program ON to_program.id = psr.to_program_id
        LEFT JOIN major from_major ON from_major.id = psr.from_major_id
        LEFT JOIN major to_major ON to_major.id = psr.to_major_id
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = psr.student_number
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        WHERE psr.status = 'pending_approval'
        ORDER BY psr.requested_at DESC NULLS LAST, psr.id DESC
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          psr.id,
          psr.student_number,
          psr.academic_year,
          psr.semester,
          psr.curriculum_course_id,
          psr.subject_id,
          psr.requested_subject_semester,
          psr.requested_subject_year_level,
          psr.units_total,
          psr.reason,
          psr.petition_type,
          psr.status,
          psr.requested_at,
          psr.approved_at,
          enr.first_name,
          enr.family_name AS last_name,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
          COALESCE(cc.course_code, sub.code) AS course_code,
          COALESCE(cc.descriptive_title, sub.name) AS descriptive_title
        FROM student_petition_subject_requests psr
        LEFT JOIN curriculum_course cc ON cc.id = psr.curriculum_course_id
        LEFT JOIN subject sub ON sub.id = psr.subject_id
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = psr.student_number
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        WHERE psr.status = 'pending_approval'
        ORDER BY psr.requested_at DESC NULLS LAST, psr.id DESC
      `,
    ]);

    if (scope?.isDean && scope.deanDepartmentId) {
      const allStudentNumbers = [
        ...new Set(
          [
            ...subjectOverloads.map((item) => item.student_number),
            ...subjectDrops.map((item) => item.student_number),
            ...crossEnrollmentRequests.map((item) => item.student_number),
            ...externalCrossEnrollmentRequests.map((item) => item.student_number),
            ...shiftingRequests.map((item) => item.student_number),
            ...programShiftRequests.map((item) => item.student_number),
            ...petitionSubjectRequests.map((item) => item.student_number),
          ].filter(Boolean),
        ),
      ];

      const allowedEnrollments = allStudentNumbers.length
        ? await prisma.enrollment.findMany({
            where: {
              student_number: { in: allStudentNumbers },
              department: scope.deanDepartmentId,
            },
            select: { student_number: true },
            distinct: ["student_number"],
          })
        : [];

      const allowedStudentNumbers = new Set(
        allowedEnrollments
          .map((enrollment) => enrollment.student_number)
          .filter(Boolean),
      );

      subjectOverloads.splice(
        0,
        subjectOverloads.length,
        ...subjectOverloads.filter((item) =>
          allowedStudentNumbers.has(item.student_number),
        ),
      );
      subjectDrops.splice(
        0,
        subjectDrops.length,
        ...subjectDrops.filter((item) =>
          allowedStudentNumbers.has(item.student_number),
        ),
      );
      groupedStudentDrops.splice(
        0,
        groupedStudentDrops.length,
        ...groupedStudentDrops.filter((item) =>
          allowedStudentNumbers.has(item.student_number),
        ),
      );
      crossEnrollmentRequests.splice(
        0,
        crossEnrollmentRequests.length,
        ...crossEnrollmentRequests.filter((item) =>
          allowedStudentNumbers.has(item.student_number),
        ),
      );
      externalCrossEnrollmentRequests.splice(
        0,
        externalCrossEnrollmentRequests.length,
        ...externalCrossEnrollmentRequests.filter((item) =>
          allowedStudentNumbers.has(item.student_number),
        ),
      );
      shiftingRequests.splice(
        0,
        shiftingRequests.length,
        ...shiftingRequests.filter((item) =>
          allowedStudentNumbers.has(item.student_number),
        ),
      );
      programShiftRequests.splice(
        0,
        programShiftRequests.length,
        ...programShiftRequests.filter((item) =>
          allowedStudentNumbers.has(item.student_number),
        ),
      );
      petitionSubjectRequests.splice(
        0,
        petitionSubjectRequests.length,
        ...petitionSubjectRequests.filter((item) =>
          allowedStudentNumbers.has(item.student_number),
        ),
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        subjectOverloads: subjectOverloads.map((item) => ({
          studentNumber: item.student_number,
          studentName: item.student_name || item.student_number,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          academicYear: item.academic_year,
          semester: item.semester,
          subjectCount: item.subject_count,
          totalUnits: item.total_units,
          status: "pending",
          subjects: Array.isArray(item.subjects) ? item.subjects : [],
        })),
        subjectDrops: [
          ...groupedStudentDrops.map((item) => ({
            id: `student-drop-${item.student_number}-${item.academic_year}-${item.semester}`,
            studentNumber: item.student_number,
            studentName: item.student_name || item.student_number,
            firstName: item.first_name || "",
            lastName: item.last_name || "",
            academicYear: item.academic_year,
            semester: item.semester,
            courseCode: "Student Drop Request",
            descriptiveTitle: `${item.pending_subject_count} subjects queued for dropping`,
            status: "pending_approval",
            requestedAt: item.updated_at,
            reason: item.drop_reason,
            isStudentDrop: true,
            subjectCount: item.pending_subject_count,
            subjects: Array.isArray(item.subjects) ? item.subjects : [],
          })),
          ...subjectDrops
            .filter((item) => {
              return !groupedStudentDrops.some(
                (group) =>
                  group.student_number === item.student_number &&
                  group.academic_year === item.academic_year &&
                  group.semester === item.semester,
              );
            })
            .map((item) => ({
              id: item.id,
              studentNumber: item.student_number,
              studentName: item.student_name || item.student_number,
              firstName: item.first_name || "",
              lastName: item.last_name || "",
              academicYear: item.academic_year,
              semester: item.semester,
              courseCode: item.course_code,
              descriptiveTitle: item.descriptive_title,
              status: item.drop_status,
              requestedAt: item.updated_at,
              reason: item.drop_reason,
              isStudentDrop: false,
              subjectCount: 1,
              subjects: [
                {
                  courseCode: item.course_code,
                  descriptiveTitle: item.descriptive_title,
                  unitsTotal: null,
                },
              ],
            })),
        ],
        crossEnrollmentRequests: crossEnrollmentRequests.map((item) => ({
          id: item.id,
          studentNumber: item.student_number,
          studentName: item.student_name || item.student_number,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          academicYear: item.academic_year,
          semester: item.semester,
          courseCode: item.course_code,
          descriptiveTitle: item.descriptive_title,
          homeProgramCode: item.home_program_code,
          homeProgramName: item.home_program_name,
          hostProgramCode: item.host_program_code,
          hostProgramName: item.host_program_name,
          status: item.status,
          requestedAt: item.requested_at,
          reason: item.reason,
          unitsTotal: item.units_total,
          subjects: [
            {
              courseCode: item.course_code,
              descriptiveTitle: item.descriptive_title,
              unitsTotal: item.units_total,
            },
          ],
        })),
        externalCrossEnrollmentRequests: externalCrossEnrollmentRequests.map((item) => ({
          id: item.id,
          studentNumber: item.student_number,
          studentName: item.student_name || item.student_number,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          academicYear: item.academic_year,
          semester: item.semester,
          schoolName: item.external_school_name,
          subjectCode: item.subject_code,
          subjectTitle: item.subject_title,
          status: item.status,
          requestedAt: item.requested_at,
          reason: item.reason,
          unitsTotal: Number(item.units_total || 0),
          subjects: [
            {
              courseCode: item.subject_code,
              descriptiveTitle: item.subject_title,
              unitsTotal: Number(item.units_total || 0),
            },
          ],
        })),
        shiftingRequests: shiftingRequests.map((item) => ({
          id: item.id,
          studentNumber: item.student_number,
          studentName: item.student_name || item.student_number,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          academicYear: item.academic_year,
          semester: item.semester,
          fromSectionId: item.from_section_id,
          toSectionId: item.to_section_id,
          fromSectionName: item.from_section_name,
          toSectionName: item.to_section_name,
          status: item.status,
          requestedAt: item.requested_at,
          requestedBy: item.requested_by,
          requestedByRole: item.requested_by_role,
          requestedByName: item.requested_by_name,
          approvedBy: item.approved_by,
          approvedByRole: item.approved_by_role,
          approvedByName: item.approved_by_name,
          executedBy: item.executed_by,
          executedByRole: item.executed_by_role,
          executedByName: item.executed_by_name,
          approvedAt: item.approved_at,
          executedAt: item.executed_at,
          reason: item.reason,
          subjects: [],
        })),
        programShiftRequests: programShiftRequests.map((item) => ({
          id: item.id,
          studentNumber: item.student_number,
          studentName: item.student_name || item.student_number,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          academicYear: item.academic_year,
          semester: item.semester,
          fromProgramId: item.from_program_id,
          fromProgramCode: item.from_program_code,
          fromProgramName: item.from_program_name,
          fromMajorId: item.from_major_id,
          fromMajorName: item.from_major_name,
          toProgramId: item.to_program_id,
          toProgramCode: item.to_program_code,
          toProgramName: item.to_program_name,
          toMajorId: item.to_major_id,
          toMajorName: item.to_major_name,
          status: item.status,
          requestedAt: item.requested_at,
          reason: item.reason,
          requestedBy: item.requested_by,
          requestedByRole: item.requested_by_role,
          requestedByName: item.requested_by_name,
          approvedBy: item.approved_by,
          approvedByRole: item.approved_by_role,
          approvedByName: item.approved_by_name,
          approvedAt: item.approved_at,
          executedAt: item.executed_at,
          subjects: [],
        })),
        petitionSubjectRequests: petitionSubjectRequests.map((item) => ({
          id: item.id,
          studentNumber: item.student_number,
          studentName: item.student_name || item.student_number,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          academicYear: item.academic_year,
          semester: item.semester,
          curriculumCourseId: item.curriculum_course_id,
          subjectId: item.subject_id,
          requestedSubjectSemester: item.requested_subject_semester,
          requestedSubjectYearLevel: item.requested_subject_year_level,
          courseCode: item.course_code,
          descriptiveTitle: item.descriptive_title,
          unitsTotal: item.units_total,
          petitionType: item.petition_type,
          status: item.status,
          requestedAt: item.requested_at,
          approvedAt: item.approved_at,
          reason: item.reason,
          subjects: [
            {
              courseCode: item.course_code,
              descriptiveTitle: item.descriptive_title,
              unitsTotal: item.units_total,
            },
          ],
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch approvals." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSubjectDropHistoryAssessmentAdjustedColumn();
    await ensurePetitionSubjectRequestsTable();

    const session = await getServerSession(authOptions);
    const scope = await getSessionScope();
    const userRole = Number((session?.user as any)?.role) || 0;
    const userId = Number((session?.user as any)?.id) || null;
    const userName = String((session?.user as any)?.name || "").trim() || null;
    const roleContext = await getRoleContext(userRole);

    if (!canManageApprovals(roleContext)) {
      return NextResponse.json(
        { error: "Unauthorized to manage approvals." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const actionType = String(body?.type || "");

    if (actionType === "overload") {
      const studentNumber = String(body?.studentNumber || "");
      const academicYear = String(body?.academicYear || "");
      const semester = Number(body?.semester);

      if (!studentNumber || !academicYear || !Number.isFinite(semester)) {
        return NextResponse.json(
          { error: "studentNumber, academicYear, and semester are required." },
          { status: 400 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber,
        academicYear,
        semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      const updatedRows = await prisma.$executeRaw`
        UPDATE enrolled_subjects
        SET status = 'enrolled', updated_at = NOW()
        WHERE student_number = ${studentNumber}
          AND academic_year = ${academicYear}
          AND semester = ${semester}
          AND status = 'pending_approval'
      `;

      if (!updatedRows) {
        return NextResponse.json(
          { error: "No pending overload approval was found." },
          { status: 404 },
        );
      }

      if (userId) {
        await insertIntoReports({
          action: `Approved overload enrollment request for ${studentNumber} (${academicYear} Sem ${semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Overload request approved successfully.",
      });
    }

    if (actionType === "reject_overload") {
      const studentNumber = String(body?.studentNumber || "");
      const academicYear = String(body?.academicYear || "");
      const semester = Number(body?.semester);

      if (!studentNumber || !academicYear || !Number.isFinite(semester)) {
        return NextResponse.json(
          { error: "studentNumber, academicYear, and semester are required." },
          { status: 400 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber,
        academicYear,
        semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      const deletedRows = await prisma.$executeRaw`
        DELETE FROM enrolled_subjects
        WHERE student_number = ${studentNumber}
          AND academic_year = ${academicYear}
          AND semester = ${semester}
          AND status = 'pending_approval'
      `;

      if (!deletedRows) {
        return NextResponse.json(
          { error: "No pending overload request was found." },
          { status: 404 },
        );
      }

      if (userId) {
        await insertIntoReports({
          action: `Rejected overload enrollment request for ${studentNumber} (${academicYear} Sem ${semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Overload request rejected successfully.",
      });
    }

    if (actionType === "drop") {
      const enrolledSubjectId = Number(body?.id);

      if (!Number.isFinite(enrolledSubjectId)) {
        return NextResponse.json(
          { error: "id is required for drop approval." },
          { status: 400 },
        );
      }

      const subjectRows = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          student_number,
          academic_year,
          semester,
          curriculum_course_id,
          drop_status
        FROM enrolled_subjects
        WHERE id = ${enrolledSubjectId}
        LIMIT 1
      `;

      const subject = subjectRows[0];

      if (!subject) {
        return NextResponse.json(
          { error: "Pending subject drop not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: subject.student_number,
        academicYear: subject.academic_year,
        semester: subject.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (
        String(subject.drop_status || "").toLowerCase() !== "pending_approval"
      ) {
        return NextResponse.json(
          { error: "This subject drop is no longer pending approval." },
          { status: 409 },
        );
      }

      const pendingDropRows = await prisma.$queryRaw<any[]>`
        SELECT id, refundable, COALESCE(assessment_adjusted, false) AS assessment_adjusted
        FROM subject_drop_history
        WHERE enrolled_subject_id = ${enrolledSubjectId}
          AND status = 'pending_approval'
        ORDER BY dropped_at DESC, id DESC
        LIMIT 1
      `;
      const pendingDropId = Number(pendingDropRows[0]?.id || 0);
      const isRefundableDrop = Boolean(pendingDropRows[0]?.refundable);
      const isAssessmentAdjusted = Boolean(
        pendingDropRows[0]?.assessment_adjusted,
      );

      await prisma.$transaction(async (tx) => {
        const semesterAliases = getSemesterAliases(subject.semester);

        await tx.$executeRaw`
          UPDATE subject_drop_history
          SET status = 'dropped'
          WHERE enrolled_subject_id = ${enrolledSubjectId}
            AND status = 'pending_approval'
        `;

        await tx.$executeRaw`
          DELETE FROM enrolled_subjects
          WHERE id = ${enrolledSubjectId}
        `;

        await tx.$executeRaw`
          DELETE FROM student_section_subjects sss
          USING student_section ss, class_schedule cs
          WHERE sss.student_section_id = ss.id
            AND sss.class_schedule_id = cs.id
            AND ss.student_number = ${subject.student_number}
            AND ss.academic_year = ${subject.academic_year}
            AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(semesterAliases)})
            AND cs.curriculum_course_id = ${subject.curriculum_course_id}
        `;

        if (isRefundableDrop && !isAssessmentAdjusted) {
          await recalculateAssessmentForTerm(
            tx,
            subject.student_number,
            subject.academic_year,
            subject.semester,
          );

          if (pendingDropId > 0) {
            await tx.$executeRaw`
              UPDATE subject_drop_history
              SET assessment_adjusted = true
              WHERE id = ${pendingDropId}
            `;
          }
        }

        const remainingRows = await tx.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint AS count
          FROM enrolled_subjects
          WHERE student_number = ${subject.student_number}
            AND academic_year = ${subject.academic_year}
            AND semester = ${subject.semester}
        `;

        const remainingCount = Number(remainingRows[0]?.count || 0);

        // If there are no enrolled subjects left for the term, mark enrollment as dropped.
        if (remainingCount === 0) {
          // Ensure no orphan student_section_subject links remain for this term.
          await tx.$executeRaw`
            DELETE FROM student_section_subjects sss
            USING student_section ss
            WHERE sss.student_section_id = ss.id
              AND ss.student_number = ${subject.student_number}
              AND ss.academic_year = ${subject.academic_year}
              AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(semesterAliases)})
          `;

          await tx.$executeRaw`
            UPDATE enrollment
            SET status = 3
            WHERE student_number = ${subject.student_number}
              AND academic_year = ${subject.academic_year}
              AND (
                LOWER(COALESCE(term, '')) = CASE
                  WHEN ${subject.semester} = 1 THEN 'first'
                  ELSE 'second'
                END
                OR LOWER(COALESCE(term, '')) = CASE
                  WHEN ${subject.semester} = 1 THEN 'first semester'
                  ELSE 'second semester'
                END
              )
          `;
        }
      });

      if (userId) {
        await insertIntoReports({
          action: `Approved subject drop request for ${subject.student_number} (${subject.academic_year} Sem ${subject.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Subject drop approved successfully.",
      });
    }

    if (actionType === "student_drop") {
      const studentNumber = String(body?.studentNumber || "");
      const academicYear = String(body?.academicYear || "");
      const semester = Number(body?.semester);

      if (!studentNumber || !academicYear || !Number.isFinite(semester)) {
        return NextResponse.json(
          { error: "studentNumber, academicYear, and semester are required." },
          { status: 400 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber,
        academicYear,
        semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      const pendingSubjects = await prisma.$queryRaw<any[]>`
        SELECT
          es.id,
          es.curriculum_course_id,
          es.drop_status
        FROM enrolled_subjects es
        WHERE es.student_number = ${studentNumber}
          AND es.academic_year = ${academicYear}
          AND es.semester = ${semester}
          AND es.drop_status = 'pending_approval'
        ORDER BY es.id ASC
      `;

      if (!pendingSubjects.length) {
        return NextResponse.json(
          { error: "No pending student drop request was found." },
          { status: 404 },
        );
      }

      const enrolledSubjectIds = pendingSubjects
        .map((subject) => Number(subject.id))
        .filter((id) => Number.isFinite(id));
      const curriculumCourseIds = pendingSubjects
        .map((subject) => Number(subject.curriculum_course_id))
        .filter((id) => Number.isFinite(id));

      const pendingDropRows = enrolledSubjectIds.length
        ? await prisma.$queryRaw<any[]>`
            SELECT
              id,
              refundable,
              COALESCE(assessment_adjusted, false) AS assessment_adjusted
            FROM subject_drop_history
            WHERE enrolled_subject_id IN (${Prisma.join(enrolledSubjectIds)})
              AND status = 'pending_approval'
          `
        : [];

      const hasRefundableDrop = pendingDropRows.some((row) =>
        Boolean(row.refundable),
      );
      const hasUnadjustedDrop = pendingDropRows.some(
        (row) => !Boolean(row.assessment_adjusted),
      );

      await prisma.$transaction(async (tx) => {
        const semesterAliases = getSemesterAliases(semester);

        await tx.$executeRaw`
          UPDATE subject_drop_history
          SET status = 'dropped'
          WHERE enrolled_subject_id IN (${Prisma.join(enrolledSubjectIds)})
            AND status = 'pending_approval'
        `;

        await tx.$executeRaw`
          DELETE FROM enrolled_subjects
          WHERE id IN (${Prisma.join(enrolledSubjectIds)})
        `;

        if (curriculumCourseIds.length > 0) {
          await tx.$executeRaw`
            DELETE FROM student_section_subjects sss
            USING student_section ss, class_schedule cs
            WHERE sss.student_section_id = ss.id
              AND sss.class_schedule_id = cs.id
              AND ss.student_number = ${studentNumber}
              AND ss.academic_year = ${academicYear}
              AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(semesterAliases)})
              AND cs.curriculum_course_id IN (${Prisma.join(curriculumCourseIds)})
          `;
        }

        if (hasRefundableDrop && hasUnadjustedDrop) {
          await recalculateAssessmentForTerm(
            tx,
            studentNumber,
            academicYear,
            semester,
          );

          if (pendingDropRows.length > 0) {
            const pendingDropIds = pendingDropRows
              .map((row) => Number(row.id))
              .filter((id) => Number.isFinite(id));

            if (pendingDropIds.length > 0) {
              await tx.$executeRaw`
                UPDATE subject_drop_history
                SET assessment_adjusted = true
                WHERE id IN (${Prisma.join(pendingDropIds)})
              `;
            }
          }
        }

        const remainingRows = await tx.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint AS count
          FROM enrolled_subjects
          WHERE student_number = ${studentNumber}
            AND academic_year = ${academicYear}
            AND semester = ${semester}
        `;

        const remainingCount = Number(remainingRows[0]?.count || 0);

        if (remainingCount === 0) {
          await tx.$executeRaw`
            DELETE FROM student_section_subjects sss
            USING student_section ss
            WHERE sss.student_section_id = ss.id
              AND ss.student_number = ${studentNumber}
              AND ss.academic_year = ${academicYear}
              AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(semesterAliases)})
          `;

          await tx.$executeRaw`
            UPDATE enrollment
            SET status = 3
            WHERE student_number = ${studentNumber}
              AND academic_year = ${academicYear}
              AND (
                LOWER(COALESCE(term, '')) = CASE
                  WHEN ${semester} = 1 THEN 'first'
                  WHEN ${semester} = 2 THEN 'second'
                  ELSE 'third'
                END
                OR LOWER(COALESCE(term, '')) = CASE
                  WHEN ${semester} = 1 THEN 'first semester'
                  WHEN ${semester} = 2 THEN 'second semester'
                  ELSE 'third semester'
                END
                OR (${semester} = 3 AND LOWER(COALESCE(term, '')) = 'summer')
              )
          `;
        }
      });

      if (userId) {
        await insertIntoReports({
          action: `Approved student drop request for ${studentNumber} (${academicYear} Sem ${semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Student drop request approved successfully.",
      });
    }

    if (actionType === "reject_drop") {
      const enrolledSubjectId = Number(body?.id);

      if (!Number.isFinite(enrolledSubjectId)) {
        return NextResponse.json(
          { error: "id is required for drop rejection." },
          { status: 400 },
        );
      }

      const subjectRows = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          student_number,
          academic_year,
          semester,
          drop_status
        FROM enrolled_subjects
        WHERE id = ${enrolledSubjectId}
        LIMIT 1
      `;

      const subject = subjectRows[0];
      if (!subject) {
        return NextResponse.json(
          { error: "Pending subject drop not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: subject.student_number,
        academicYear: subject.academic_year,
        semester: subject.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (String(subject.drop_status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This subject drop is no longer pending approval." },
          { status: 409 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE enrolled_subjects
          SET drop_status = 'none',
              updated_at = NOW()
          WHERE id = ${enrolledSubjectId}
        `;

        await tx.$executeRaw`
          UPDATE subject_drop_history
          SET status = 'rejected'
          WHERE enrolled_subject_id = ${enrolledSubjectId}
            AND status = 'pending_approval'
        `;
      });

      if (userId) {
        await insertIntoReports({
          action: `Rejected subject drop request for ${subject.student_number} (${subject.academic_year} Sem ${subject.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Subject drop request rejected successfully.",
      });
    }

    if (actionType === "reject_student_drop") {
      const studentNumber = String(body?.studentNumber || "");
      const academicYear = String(body?.academicYear || "");
      const semester = Number(body?.semester);

      if (!studentNumber || !academicYear || !Number.isFinite(semester)) {
        return NextResponse.json(
          { error: "studentNumber, academicYear, and semester are required." },
          { status: 400 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber,
        academicYear,
        semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      const pendingSubjects = await prisma.$queryRaw<any[]>`
        SELECT id
        FROM enrolled_subjects
        WHERE student_number = ${studentNumber}
          AND academic_year = ${academicYear}
          AND semester = ${semester}
          AND drop_status = 'pending_approval'
      `;

      if (!pendingSubjects.length) {
        return NextResponse.json(
          { error: "No pending student drop request was found." },
          { status: 404 },
        );
      }

      const enrolledSubjectIds = pendingSubjects
        .map((subject) => Number(subject.id))
        .filter((id) => Number.isFinite(id));

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE enrolled_subjects
          SET drop_status = 'none',
              updated_at = NOW()
          WHERE id IN (${Prisma.join(enrolledSubjectIds)})
        `;

        await tx.$executeRaw`
          UPDATE subject_drop_history
          SET status = 'rejected'
          WHERE enrolled_subject_id IN (${Prisma.join(enrolledSubjectIds)})
            AND status = 'pending_approval'
        `;
      });

      if (userId) {
        await insertIntoReports({
          action: `Rejected student drop request for ${studentNumber} (${academicYear} Sem ${semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Student drop request rejected successfully.",
      });
    }

    if (actionType === "cross_enrollment") {
      const requestId = Number(body?.id);

      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for inter-program subject approval." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT
          cer.id,
          cer.student_number,
          cer.home_program_id,
          cer.curriculum_course_id,
          cer.subject_id,
          cer.academic_year,
          cer.semester,
          cer.year_level,
          cer.units_total,
          cer.status
        FROM student_cross_enrollment_requests cer
        WHERE cer.id = ${requestId}
        LIMIT 1
      `;

      const requestRow = requestRows[0];

      if (!requestRow) {
        return NextResponse.json(
          { error: "Pending inter-program subject request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: requestRow.student_number,
        academicYear: requestRow.academic_year,
        semester: requestRow.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (
        String(requestRow.status || "").toLowerCase() !== "pending_approval"
      ) {
        return NextResponse.json(
          {
            error: "This inter-program subject request is no longer pending approval.",
          },
          { status: 409 },
        );
      }

      const existingEnrolled = await prisma.$queryRaw<any[]>`
        SELECT id
        FROM enrolled_subjects
        WHERE student_number = ${requestRow.student_number}
          AND academic_year = ${requestRow.academic_year}
          AND semester = ${requestRow.semester}
          AND curriculum_course_id = ${requestRow.curriculum_course_id}
        LIMIT 1
      `;

      if (existingEnrolled.length > 0) {
        return NextResponse.json(
          { error: "This subject is already enrolled for the student." },
          { status: 409 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO enrolled_subjects (
            student_number,
            program_id,
            curriculum_course_id,
            subject_id,
            academic_year,
            semester,
            term,
            year_level,
            units_total,
            status,
            drop_status,
            updated_at
          )
          VALUES (
            ${requestRow.student_number},
            ${requestRow.home_program_id},
            ${requestRow.curriculum_course_id},
            ${requestRow.subject_id},
            ${requestRow.academic_year},
            ${requestRow.semester},
            ${requestRow.semester === 1 ? "First Semester" : "Second Semester"},
            ${requestRow.year_level},
            ${requestRow.units_total ?? 0},
            'enrolled',
            'none',
            NOW()
          )
        `;

        await recalculateAssessmentForTerm(
          tx,
          requestRow.student_number,
          requestRow.academic_year,
          requestRow.semester,
        );

        await tx.$executeRaw`
          UPDATE student_cross_enrollment_requests
          SET status = 'approved',
              approved_by = ${userId},
              approved_at = NOW()
          WHERE id = ${requestId}
        `;
      });

      if (userId) {
        await insertIntoReports({
          action: `Approved inter-program subject request for ${requestRow.student_number} (${requestRow.academic_year} Sem ${requestRow.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Inter-program subject request approved successfully.",
      });
    }

    if (actionType === "reject_cross_enrollment") {
      const requestId = Number(body?.id);

      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for inter-program subject rejection." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT id, student_number, academic_year, semester, status
        FROM student_cross_enrollment_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;

      const requestRow = requestRows[0];
      if (!requestRow) {
        return NextResponse.json(
          { error: "Pending inter-program subject request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: requestRow.student_number,
        academicYear: requestRow.academic_year,
        semester: requestRow.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (String(requestRow.status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This inter-program subject request is no longer pending approval." },
          { status: 409 },
        );
      }

      await prisma.$executeRaw`
        UPDATE student_cross_enrollment_requests
        SET status = 'rejected',
            approved_by = ${userId},
            approved_at = NOW()
        WHERE id = ${requestId}
      `;

      if (userId) {
        await insertIntoReports({
          action: `Rejected inter-program subject request for ${requestRow.student_number} (${requestRow.academic_year} Sem ${requestRow.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Inter-program subject request rejected successfully.",
      });
    }

    if (actionType === "external_cross_enrollment") {
      await ensureExternalCrossEnrollmentRequestsTable();

      const requestId = Number(body?.id);
      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for external cross-enrollment approval." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT
          req.id,
          req.student_number,
          req.academic_year,
          req.semester,
          req.status,
          req.external_school_name,
          req.subject_code,
          req.subject_title,
          enr.first_name,
          enr.middle_name,
          enr.family_name,
          enr.email_address
        FROM student_external_cross_enrollment_requests req
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name, e.email_address
          FROM enrollment e
          WHERE e.student_number = req.student_number
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        WHERE req.id = ${requestId}
        LIMIT 1
      `;
      const requestRow = requestRows[0];
      if (!requestRow) {
        return NextResponse.json(
          { error: "Pending external cross-enrollment request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: requestRow.student_number,
        academicYear: requestRow.academic_year,
        semester: requestRow.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (String(requestRow.status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This external cross-enrollment request is no longer pending approval." },
          { status: 409 },
        );
      }

      await prisma.$executeRaw`
        UPDATE student_external_cross_enrollment_requests
        SET status = 'approved',
            approved_by = ${userId},
            approved_at = NOW()
        WHERE id = ${requestId}
      `;

      const studentName = [
        requestRow.first_name,
        requestRow.middle_name,
        requestRow.family_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || requestRow.student_number;

      const origin = new URL(request.url).origin;
      const approvalLetterUrl = `${origin}/external-cross-enrollment/approval-letter/${requestId}`;

      if (requestRow.email_address) {
        try {
          await sendExternalCrossEnrollmentApprovedEmail({
            to: requestRow.email_address,
            studentName,
            studentNumber: requestRow.student_number,
            subjectCode: requestRow.subject_code,
            subjectTitle: requestRow.subject_title,
            externalSchoolName: requestRow.external_school_name,
            academicYear: requestRow.academic_year,
            semester: Number(requestRow.semester || 0),
            approvalLetterUrl,
          });
        } catch (emailError) {
          console.error(
            "Failed to send external cross-enrollment approval email:",
            emailError,
          );
        }
      }

      if (userId) {
        await insertIntoReports({
          action: `Approved external cross-enrollment request for ${requestRow.student_number} (${requestRow.external_school_name} - ${requestRow.subject_code}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "External cross-enrollment request approved successfully.",
        approvalLetterUrl,
      });
    }

    if (actionType === "reject_external_cross_enrollment") {
      await ensureExternalCrossEnrollmentRequestsTable();

      const requestId = Number(body?.id);
      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for external cross-enrollment rejection." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT id, student_number, academic_year, semester, status, external_school_name, subject_code
        FROM student_external_cross_enrollment_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;
      const requestRow = requestRows[0];
      if (!requestRow) {
        return NextResponse.json(
          { error: "Pending external cross-enrollment request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: requestRow.student_number,
        academicYear: requestRow.academic_year,
        semester: requestRow.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (String(requestRow.status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This external cross-enrollment request is no longer pending approval." },
          { status: 409 },
        );
      }

      await prisma.$executeRaw`
        UPDATE student_external_cross_enrollment_requests
        SET status = 'rejected',
            approved_by = ${userId},
            approved_at = NOW()
        WHERE id = ${requestId}
      `;

      if (userId) {
        await insertIntoReports({
          action: `Rejected external cross-enrollment request for ${requestRow.student_number} (${requestRow.external_school_name} - ${requestRow.subject_code}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "External cross-enrollment request rejected successfully.",
      });
    }

    if (actionType === "section_shift") {
      await ensureShiftRequestsTable();

      const requestId = Number(body?.id);
      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for section shift approval." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT *
        FROM student_section_shift_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;

      const shiftRequest = requestRows[0];
      if (!shiftRequest) {
        return NextResponse.json(
          { error: "Pending section shift request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: shiftRequest.student_number,
        academicYear: shiftRequest.academic_year,
        semester: shiftRequest.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (
        String(shiftRequest.status || "").toLowerCase() !== "pending_approval"
      ) {
        return NextResponse.json(
          {
            error: "This section shift request is no longer pending approval.",
          },
          { status: 409 },
        );
      }

      const currentAssignment = await prisma.student_section.findUnique({
        where: {
          student_number_academic_year_semester: {
            student_number: shiftRequest.student_number,
            academic_year: shiftRequest.academic_year,
            semester: shiftRequest.semester,
          },
        },
      });

      if (!currentAssignment) {
        return NextResponse.json(
          { error: "Student assignment not found for this term." },
          { status: 404 },
        );
      }

      const destinationSection = await prisma.sections.findUnique({
        where: { id: shiftRequest.to_section_id },
      });
      if (!destinationSection || destinationSection.status !== "active") {
        return NextResponse.json(
          { error: "Destination section is invalid or inactive." },
          { status: 400 },
        );
      }

      const enrolledSubjectIds = await getEnrolledSubjectIdsForTerm(
        prisma,
        shiftRequest.student_number,
        shiftRequest.academic_year,
        shiftRequest.semester,
      );

      if (enrolledSubjectIds.length === 0) {
        return NextResponse.json(
          { error: "Student has no enrolled subjects for this term." },
          { status: 400 },
        );
      }

      const matchingScheduleIds = await getMatchingScheduleIdsForSection(
        prisma,
        shiftRequest.to_section_id,
        enrolledSubjectIds,
      );

      if (matchingScheduleIds.length === 0) {
        return NextResponse.json(
          { error: "No matching schedules found in destination section." },
          { status: 400 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.student_section_subjects.deleteMany({
          where: { student_section_id: currentAssignment.id },
        });

        await tx.student_section.update({
          where: { id: currentAssignment.id },
          data: { section_id: shiftRequest.to_section_id },
        });

        await tx.student_section_subjects.createMany({
          data: matchingScheduleIds.map((scheduleId) => ({
            student_section_id: currentAssignment.id,
            class_schedule_id: scheduleId,
          })),
          skipDuplicates: true,
        });

        await tx.sections.update({
          where: { id: currentAssignment.section_id },
          data: { student_count: { decrement: 1 } },
        });

        await tx.sections.update({
          where: { id: shiftRequest.to_section_id },
          data: { student_count: { increment: 1 } },
        });

        await tx.$executeRaw`
          UPDATE student_section_shift_requests
          SET status = 'approved',
              approved_by = ${userId},
              approved_by_role = ${roleContext.roleId || null},
              approved_by_name = ${userName},
              approved_at = NOW(),
              executed_by = ${userId},
              executed_by_role = ${roleContext.roleId || null},
              executed_by_name = ${userName},
              executed_at = NOW()
          WHERE id = ${requestId}
        `;
      });

      if (userId) {
        await insertIntoReports({
          action: `Approved section shift request for ${shiftRequest.student_number} (${shiftRequest.academic_year} ${shiftRequest.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Section shift request approved successfully.",
      });
    }

    if (actionType === "reject_section_shift") {
      await ensureShiftRequestsTable();

      const requestId = Number(body?.id);
      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for section shift rejection." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT *
        FROM student_section_shift_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;

      const shiftRequest = requestRows[0];
      if (!shiftRequest) {
        return NextResponse.json(
          { error: "Pending section shift request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: shiftRequest.student_number,
        academicYear: shiftRequest.academic_year,
        semester: shiftRequest.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (String(shiftRequest.status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This section shift request is no longer pending approval." },
          { status: 409 },
        );
      }

      await prisma.$executeRaw`
        UPDATE student_section_shift_requests
        SET status = 'rejected',
            approved_by = ${userId},
            approved_by_role = ${roleContext.roleId || null},
            approved_by_name = ${userName},
            approved_at = NOW()
        WHERE id = ${requestId}
      `;

      if (userId) {
        await insertIntoReports({
          action: `Rejected section shift request for ${shiftRequest.student_number} (${shiftRequest.academic_year} ${shiftRequest.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Section shift request rejected successfully.",
      });
    }

    if (actionType === "program_shift") {
      await ensureProgramShiftRequestsTable();

      const requestId = Number(body?.id);
      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for program shift approval." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT *
        FROM student_program_shift_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;

      const shiftRequest = requestRows[0];
      if (!shiftRequest) {
        return NextResponse.json(
          { error: "Pending program shift request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: shiftRequest.student_number,
        academicYear: shiftRequest.academic_year,
        semester: Number(shiftRequest.semester),
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (
        String(shiftRequest.status || "").toLowerCase() !== "pending_approval"
      ) {
        return NextResponse.json(
          {
            error: "This program shift request is no longer pending approval.",
          },
          { status: 409 },
        );
      }

      const toProgram = await prisma.program.findUnique({
        where: { id: Number(shiftRequest.to_program_id) },
        select: { id: true, department_id: true },
      });
      if (!toProgram) {
        return NextResponse.json(
          { error: "Target program was not found." },
          { status: 404 },
        );
      }

      if (scope?.isDean && toProgram.department_id !== scope.deanDepartmentId) {
        return NextResponse.json(
          { error: "Target program is outside your department scope." },
          { status: 403 },
        );
      }

      if (
        shiftRequest.to_major_id !== null &&
        shiftRequest.to_major_id !== undefined
      ) {
        const toMajor = await prisma.major.findFirst({
          where: {
            id: Number(shiftRequest.to_major_id),
            program_id: Number(shiftRequest.to_program_id),
          },
          select: { id: true },
        });
        if (!toMajor) {
          return NextResponse.json(
            { error: "Target major does not belong to the selected program." },
            { status: 400 },
          );
        }
      }

      let archivedSubjectCount = 0;

      await prisma.$transaction(async (tx) => {
        const enrollment = await getEnrollmentRowForTerm({
          studentNumber: String(shiftRequest.student_number),
          academicYear: String(shiftRequest.academic_year),
          semester: Number(shiftRequest.semester),
        });
        if (!enrollment) {
          throw new Error(
            "Enrollment record not found for this student and term.",
          );
        }

        const enrolledSubjectRows = await tx.$queryRaw<any[]>`
          SELECT
            es.id,
            es.student_number,
            es.program_id,
            es.curriculum_course_id,
            es.subject_id,
            es.academic_year,
            es.semester,
            es.term,
            es.year_level,
            es.units_total,
            es.status,
            COALESCE(cc.course_code, s.code) AS course_code,
            COALESCE(cc.descriptive_title, s.name) AS descriptive_title
          FROM enrolled_subjects es
          LEFT JOIN curriculum_course cc ON cc.id = es.curriculum_course_id
          LEFT JOIN subject s ON s.id = es.subject_id
          WHERE es.student_number = ${String(shiftRequest.student_number)}
            AND es.academic_year = ${String(shiftRequest.academic_year)}
            AND es.semester = ${Number(shiftRequest.semester)}
        `;

        const dropReasonBase = String(shiftRequest.reason || "").trim()
          ? `Program shift: ${String(shiftRequest.reason).trim()}`
          : "Program shift";
        const dropReason = `${dropReasonBase} (request #${requestId})`;
        const droppedAt = new Date();

        for (const subject of enrolledSubjectRows) {
          await tx.$executeRaw`
            INSERT INTO subject_drop_history (
              enrolled_subject_id,
              student_number,
              program_id,
              curriculum_course_id,
              subject_id,
              academic_year,
              semester,
              term,
              year_level,
              units_total,
              status,
              course_code,
              descriptive_title,
              dropped_at,
              dropped_by,
              drop_reason,
              refundable,
              refundable_days,
              semester_start_date,
              refund_deadline
            ) VALUES (
              ${subject.id},
              ${subject.student_number},
              ${subject.program_id},
              ${subject.curriculum_course_id},
              ${subject.subject_id},
              ${subject.academic_year},
              ${subject.semester},
              ${subject.term},
              ${subject.year_level},
              ${subject.units_total},
              'dropped',
              ${subject.course_code},
              ${subject.descriptive_title},
              ${droppedAt},
              ${userId},
              ${dropReason},
              false,
              0,
              NULL,
              NULL
            )
          `;
        }
        archivedSubjectCount = enrolledSubjectRows.length;

        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            course_program: String(shiftRequest.to_program_id),
            major_id:
              shiftRequest.to_major_id === null ||
              shiftRequest.to_major_id === undefined
                ? null
                : Number(shiftRequest.to_major_id),
            department: toProgram.department_id ?? null,
          },
        });

        await clearStudentSectionAssignmentForTerm(tx, {
          studentNumber: String(shiftRequest.student_number),
          academicYear: String(shiftRequest.academic_year),
          semester: Number(shiftRequest.semester),
        });

        await tx.$executeRaw`
          DELETE FROM enrolled_subjects
          WHERE student_number = ${String(shiftRequest.student_number)}
            AND academic_year = ${String(shiftRequest.academic_year)}
            AND semester = ${Number(shiftRequest.semester)}
        `;

        await tx.$executeRaw`
          UPDATE student_program_shift_requests
          SET status = 'approved',
              approved_by = ${userId},
              approved_by_role = ${roleContext.roleId || null},
              approved_by_name = ${userName},
              approved_at = NOW(),
              executed_at = NOW()
          WHERE id = ${requestId}
        `;
      });

      if (userId) {
        await insertIntoReports({
          action: `Approved program shift request for ${shiftRequest.student_number} (${shiftRequest.academic_year} Sem ${shiftRequest.semester}) by ${session?.user?.name}; archived ${archivedSubjectCount} enrolled subject(s) to shift history.`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Program shift request approved successfully.",
      });
    }

    if (actionType === "reject_program_shift") {
      await ensureProgramShiftRequestsTable();

      const requestId = Number(body?.id);
      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for program shift rejection." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT *
        FROM student_program_shift_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;

      const shiftRequest = requestRows[0];
      if (!shiftRequest) {
        return NextResponse.json(
          { error: "Pending program shift request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: shiftRequest.student_number,
        academicYear: shiftRequest.academic_year,
        semester: Number(shiftRequest.semester),
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (String(shiftRequest.status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This program shift request is no longer pending approval." },
          { status: 409 },
        );
      }

      await prisma.$executeRaw`
        UPDATE student_program_shift_requests
        SET status = 'rejected',
            approved_by = ${userId},
            approved_by_role = ${roleContext.roleId || null},
            approved_by_name = ${userName},
            approved_at = NOW()
        WHERE id = ${requestId}
      `;

      if (userId) {
        await insertIntoReports({
          action: `Rejected program shift request for ${shiftRequest.student_number} (${shiftRequest.academic_year} Sem ${shiftRequest.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Program shift request rejected successfully.",
      });
    }

    if (actionType === "petition_subject") {
      const requestId = Number(body?.id);
      const overrideMinimum = Boolean(body?.override_minimum);
      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for petition subject approval." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          student_number,
          academic_year,
          semester,
          curriculum_course_id,
          subject_id,
          requested_subject_year_level,
          units_total,
          status
        FROM student_petition_subject_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;

      const requestRow = requestRows[0];
      if (!requestRow) {
        return NextResponse.json(
          { error: "Pending petition subject request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: requestRow.student_number,
        academicYear: requestRow.academic_year,
        semester: requestRow.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (String(requestRow.status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This petition subject request is no longer pending approval." },
          { status: 409 },
        );
      }

      const minimumStudentsRequired = await getMinimumPetitionStudents();
      const demandRows = await prisma.$queryRaw<{ demand_count: bigint }[]>`
        SELECT COUNT(DISTINCT student_number)::bigint AS demand_count
        FROM student_petition_subject_requests
        WHERE academic_year = ${requestRow.academic_year}
          AND semester = ${requestRow.semester}
          AND curriculum_course_id = ${requestRow.curriculum_course_id}
          AND LOWER(COALESCE(status, '')) IN ('pending_approval', 'approved')
      `;
      const demandCount = Number(demandRows[0]?.demand_count || 0);

      if (demandCount < minimumStudentsRequired && !overrideMinimum) {
        return NextResponse.json(
          {
            error: `Petition requires at least ${minimumStudentsRequired} students for the same subject. Current demand is ${demandCount}.`,
          },
          { status: 409 },
        );
      }

      const scheduleCheck = await analyzePetitionApprovalSchedule({
        studentNumber: String(requestRow.student_number),
        academicYear: String(requestRow.academic_year),
        semester: Number(requestRow.semester),
        curriculumCourseId: Number(requestRow.curriculum_course_id),
      });

      const hasPetitionSectionSchedule = scheduleCheck.petitionSchedules.some(
        (row) =>
          String(row.section_name || "")
            .trim()
            .toUpperCase()
            .startsWith("PET-"),
      );

      if (!hasPetitionSectionSchedule) {
        return NextResponse.json(
          {
            error:
              "Cannot approve petition yet: create the petition section schedule first (PET- section), then approve students.",
            details: {
              studentNumber: requestRow.student_number,
              curriculumCourseId: requestRow.curriculum_course_id,
              petitionClassSchedules: scheduleCheck.petitionSchedules.map((row) => ({
                classScheduleId: row.class_schedule_id,
                sectionId: row.section_id,
                sectionName: row.section_name,
                courseCode: row.course_code,
                descriptiveTitle: row.descriptive_title,
                dayOfWeek: row.day_of_week,
                startTime: toTimeLabel(row.start_time),
                endTime: toTimeLabel(row.end_time),
                unitsLec: Number(row.units_lec || 0),
                unitsLab: Number(row.units_lab || 0),
              })),
            },
          },
          { status: 409 },
        );
      }

      if (
        scheduleCheck.petitionSchedules.length > 0 &&
        scheduleCheck.allSectionsConflicted
      ) {
        const conflictPreview = scheduleCheck.conflictDetails
          .slice(0, 4)
          .map(
            (item) =>
              `${item.candidateCourseCode || "Subject"} ${item.candidateDay || ""} ${item.candidateStart || ""}-${item.candidateEnd || ""} conflicts with ${item.studentCourseCode || "existing class"} ${item.studentDay || ""} ${item.studentStart || ""}-${item.studentEnd || ""}`,
          )
          .join("; ");

        return NextResponse.json(
          {
            error:
              conflictPreview.length > 0
                ? `Cannot approve petition: all available section schedules conflict with this student's current classes. ${conflictPreview}`
                : "Cannot approve petition: all available section schedules conflict with this student's current classes.",
            details: {
              studentNumber: requestRow.student_number,
              curriculumCourseId: requestRow.curriculum_course_id,
              studentClassSchedules: scheduleCheck.studentSchedules.map((row) => ({
                classScheduleId: row.class_schedule_id,
                sectionId: row.section_id,
                sectionName: row.section_name,
                courseCode: row.course_code,
                descriptiveTitle: row.descriptive_title,
                dayOfWeek: row.day_of_week,
                startTime: toTimeLabel(row.start_time),
                endTime: toTimeLabel(row.end_time),
                unitsLec: Number(row.units_lec || 0),
                unitsLab: Number(row.units_lab || 0),
              })),
              petitionClassSchedules: scheduleCheck.petitionSchedules.map((row) => ({
                classScheduleId: row.class_schedule_id,
                sectionId: row.section_id,
                sectionName: row.section_name,
                courseCode: row.course_code,
                descriptiveTitle: row.descriptive_title,
                dayOfWeek: row.day_of_week,
                startTime: toTimeLabel(row.start_time),
                endTime: toTimeLabel(row.end_time),
                unitsLec: Number(row.units_lec || 0),
                unitsLab: Number(row.units_lab || 0),
              })),
              conflicts: scheduleCheck.conflictDetails,
            },
          },
          { status: 409 },
        );
      }

      await prisma.$transaction(async (tx) => {
        const existingEnrolled = await tx.$queryRaw<any[]>`
          SELECT id
          FROM enrolled_subjects
          WHERE student_number = ${requestRow.student_number}
            AND academic_year = ${requestRow.academic_year}
            AND semester = ${requestRow.semester}
            AND curriculum_course_id = ${requestRow.curriculum_course_id}
          LIMIT 1
        `;

        if (!existingEnrolled.length) {
          await tx.$executeRaw`
            INSERT INTO enrolled_subjects (
              student_number,
              curriculum_course_id,
              subject_id,
              academic_year,
              semester,
              term,
              year_level,
              units_total,
              status,
              drop_status,
              updated_at
            )
            VALUES (
              ${requestRow.student_number},
              ${requestRow.curriculum_course_id},
              ${requestRow.subject_id ?? null},
              ${requestRow.academic_year},
              ${requestRow.semester},
              ${termLabelFromSemester(Number(requestRow.semester))},
              ${requestRow.requested_subject_year_level ?? null},
              ${requestRow.units_total ?? 0},
              'enrolled',
              'none',
              NOW()
            )
          `;
        }

        await recalculateAssessmentForTerm(
          tx,
          requestRow.student_number,
          requestRow.academic_year,
          Number(requestRow.semester),
        );

        await tx.$executeRaw`
          UPDATE student_petition_subject_requests
          SET status = 'approved',
              approved_by = ${userId},
              approved_at = NOW()
          WHERE id = ${requestId}
        `;
      });

      if (userId) {
        await insertIntoReports({
          action: overrideMinimum
            ? `Approved petition subject request with minimum override for ${requestRow.student_number} (${requestRow.academic_year} Sem ${requestRow.semester}) by ${session?.user?.name}`
            : `Approved petition subject request for ${requestRow.student_number} (${requestRow.academic_year} Sem ${requestRow.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Petition subject request approved successfully.",
      });
    }

    if (actionType === "reject_petition_subject") {
      const requestId = Number(body?.id);
      if (!Number.isFinite(requestId)) {
        return NextResponse.json(
          { error: "id is required for petition subject rejection." },
          { status: 400 },
        );
      }

      const requestRows = await prisma.$queryRaw<any[]>`
        SELECT id, student_number, academic_year, semester, status
        FROM student_petition_subject_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;

      const requestRow = requestRows[0];
      if (!requestRow) {
        return NextResponse.json(
          { error: "Pending petition subject request not found." },
          { status: 404 },
        );
      }

      const access = await ensureDeanStudentAccess(scope, {
        studentNumber: requestRow.student_number,
        academicYear: requestRow.academic_year,
        semester: requestRow.semester,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access });
      }

      if (String(requestRow.status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This petition subject request is no longer pending approval." },
          { status: 409 },
        );
      }

      await prisma.$executeRaw`
        UPDATE student_petition_subject_requests
        SET status = 'rejected',
            approved_by = ${userId},
            approved_at = NOW()
        WHERE id = ${requestId}
      `;

      if (userId) {
        await insertIntoReports({
          action: `Rejected petition subject request for ${requestRow.student_number} (${requestRow.academic_year} Sem ${requestRow.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Petition subject request rejected successfully.",
      });
    }

    return NextResponse.json(
      { error: "Unsupported approval type." },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process approval." },
      { status: 500 },
    );
  }
}
