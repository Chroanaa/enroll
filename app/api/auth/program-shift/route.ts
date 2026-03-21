import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";
import { getAcademicTerm } from "../../../utils/academicTermUtils";
import {
  ensureDeanStudentAccess,
  getSessionScope,
} from "@/app/lib/accessScope";
import { accessSync } from "fs";

const ROLES = {
  ADMIN: 1,
  REGISTRAR: 4,
} as const;

type RoleContext = {
  roleId: number;
  roleName: string;
  isDean: boolean;
};

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

function canSubmitProgramShift(role: RoleContext) {
  return (
    role.roleId === ROLES.ADMIN ||
    role.roleId === ROLES.REGISTRAR ||
    role.isDean
  );
}

function canAutoApproveProgramShift(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.isDean;
}

function canManageProgramShiftApprovals(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.isDean;
}

function normalizeSemesterValue(semester: string | number): number | null {
  if (typeof semester === "number") {
    return semester >= 1 && semester <= 3 ? semester : null;
  }

  const normalized = String(semester || "")
    .trim()
    .toLowerCase();
  if (
    normalized === "1" ||
    normalized === "first" ||
    normalized === "first semester" ||
    normalized === "1st semester"
  ) {
    return 1;
  }
  if (
    normalized === "2" ||
    normalized === "second" ||
    normalized === "second semester" ||
    normalized === "2nd semester"
  ) {
    return 2;
  }
  if (
    normalized === "3" ||
    normalized === "third" ||
    normalized === "third semester" ||
    normalized === "3rd semester" ||
    normalized === "summer"
  ) {
    return 3;
  }

  return null;
}

function parseAcademicYearStart(academicYear: string): number | null {
  const startYear = Number.parseInt(String(academicYear).split("-")[0], 10);
  return Number.isNaN(startYear) ? null : startYear;
}

function getSemesterStartDate(
  academicYear: string,
  semester: number,
  settingsMap: Record<string, string>,
) {
  const academicYearStart = parseAcademicYearStart(academicYear);
  if (academicYearStart === null) return null;

  if (semester === 1) {
    const startMonth = Number.parseInt(
      settingsMap.semester_start_month || "8",
      10,
    );
    const startDay = Number.parseInt(settingsMap.semester_start_day || "1", 10);
    return new Date(academicYearStart, startMonth - 1, startDay);
  }

  if (semester === 2) {
    const startMonth = Number.parseInt(
      settingsMap.second_semester_start_month || "1",
      10,
    );
    const startDay = Number.parseInt(
      settingsMap.second_semester_start_day || "12",
      10,
    );
    return new Date(academicYearStart + 1, startMonth - 1, startDay);
  }

  const summerStartMonth = Number.parseInt(
    settingsMap.summer_semester_start_month || "5",
    10,
  );
  const summerStartDay = Number.parseInt(
    settingsMap.summer_semester_start_day || "1",
    10,
  );
  return new Date(academicYearStart + 1, summerStartMonth - 1, summerStartDay);
}

function getSemesterAliases(semester: number): string[] {
  if (semester === 1) return ["first", "first semester", "1", "1st semester"];
  if (semester === 2) return ["second", "second semester", "2", "2nd semester"];
  if (semester === 3)
    return ["third", "third semester", "3", "3rd semester", "summer"];
  return [];
}

async function getServerCurrentTerm() {
  const serverTimeResult = await prisma.$queryRaw<[{ now: Date }]>`
    SELECT NOW() AS now
  `;
  return getAcademicTerm(serverTimeResult[0].now);
}

async function resolveProgramId(courseProgram: string | null | undefined) {
  if (!courseProgram) return null;
  const trimmed = String(courseProgram).trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const byId = await prisma.program.findFirst({
      where: { id: Number(trimmed) },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  const byCodeOrName = await prisma.program.findFirst({
    where: {
      OR: [{ code: trimmed }, { name: trimmed }],
    },
    select: { id: true },
  });
  return byCodeOrName?.id ?? null;
}

type EnrollmentRow = {
  id: number;
  course_program: string | null;
  major_id: number | null;
  department: number | null;
};

async function getEnrollmentRowForTerm(args: {
  studentNumber: string;
  academicYear: string;
  semester: number;
}): Promise<EnrollmentRow | null> {
  const { studentNumber, academicYear, semester } = args;
  const aliases = getSemesterAliases(semester);
  const rows = await prisma.$queryRaw<EnrollmentRow[]>`
    SELECT id, course_program, major_id, department
    FROM enrollment
    WHERE student_number = ${studentNumber}
      AND academic_year = ${academicYear}
      AND LOWER(COALESCE(term, '')) IN (${aliases[0]}, ${aliases[1]}, ${aliases[2]}, ${aliases[3]}, ${aliases[4] || aliases[3]})
    ORDER BY id DESC
    LIMIT 1
  `;

  if (rows[0]) return rows[0];

  const fallback = await prisma.enrollment.findFirst({
    where: {
      student_number: studentNumber,
      academic_year: academicYear,
    },
    orderBy: { id: "desc" },
    select: {
      id: true,
      course_program: true,
      major_id: true,
      department: true,
    },
  });
  return fallback;
}

async function executeApprovedProgramShift(
  tx: any,
  args: {
    studentNumber: string;
    academicYear: string;
    semester: number;
    toProgramId: number;
    toMajorId: number | null;
    approvedBy: number | null;
    reason: string | null;
    requestId: number | null;
  },
) {
  const {
    studentNumber,
    academicYear,
    semester,
    toProgramId,
    toMajorId,
    approvedBy,
    reason,
    requestId,
  } = args;

  const enrollment = await getEnrollmentRowForTerm({
    studentNumber,
    academicYear,
    semester,
  });

  if (!enrollment) {
    throw new Error("Enrollment record not found for this student and term.");
  }

  const targetProgram = await tx.program.findUnique({
    where: { id: toProgramId },
    select: { department_id: true },
  });
  if (!targetProgram) {
    throw new Error("Target program was not found.");
  }

  const semesterAliases = getSemesterAliases(semester);
  const assignmentRows = await tx.$queryRaw<
    { id: number; section_id: number }[]
  >`
    SELECT id, section_id
    FROM student_section
    WHERE student_number = ${studentNumber}
      AND academic_year = ${academicYear}
      AND LOWER(COALESCE(semester, '')) IN (${semesterAliases[0]}, ${semesterAliases[1]}, ${semesterAliases[2]}, ${semesterAliases[3]}, ${semesterAliases[4] || semesterAliases[3]})
    ORDER BY id DESC
    LIMIT 1
  `;
  const existingAssignment = assignmentRows[0];

  if (existingAssignment) {
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
    WHERE es.student_number = ${studentNumber}
      AND es.academic_year = ${academicYear}
      AND es.semester = ${semester}
  `;

  const droppedAt = new Date();
  const dropReasonBase = reason?.trim()
    ? `Program shift: ${reason.trim()}`
    : "Program shift";
  const dropReason = requestId
    ? `${dropReasonBase} (request #${requestId})`
    : dropReasonBase;

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
        ${approvedBy},
        ${dropReason},
        false,
        0,
        NULL,
        NULL
      )
    `;
  }

  await tx.$executeRaw`
    DELETE FROM enrolled_subjects
    WHERE student_number = ${studentNumber}
      AND academic_year = ${academicYear}
      AND semester = ${semester}
  `;

  await tx.enrollment.update({
    where: { id: enrollment.id },
    data: {
      course_program: String(toProgramId),
      major_id: toMajorId,
      department: targetProgram.department_id ?? null,
    },
  });

  return enrollment;
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    const roleContext = await getRoleContext(scope?.roleId || 0);

    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canSubmitProgramShift(roleContext)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    await ensureProgramShiftRequestsTable();

    const searchParams = request.nextUrl.searchParams;
    const studentNumber = searchParams.get("studentNumber");
    const status = searchParams.get("status") || "all";
    const academicYear = searchParams.get("academicYear");
    const semesterRaw = searchParams.get("semester");
    const semester = semesterRaw ? normalizeSemesterValue(semesterRaw) : null;

    const requests = await prisma.$queryRaw<any[]>`
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
        SELECT e.first_name, e.middle_name, e.family_name, e.department
        FROM enrollment e
        WHERE e.student_number = psr.student_number
        ORDER BY e.id DESC
        LIMIT 1
      ) enr ON TRUE
      WHERE (${studentNumber}::text IS NULL OR psr.student_number = ${studentNumber})
        AND (${academicYear}::text IS NULL OR psr.academic_year = ${academicYear})
        AND (${semester}::int IS NULL OR psr.semester = ${semester})
        AND (${status}::text = 'all' OR psr.status = ${status})
        AND (${scope.isDean ? scope.deanDepartmentId : null}::int IS NULL OR enr.department = ${scope.deanDepartmentId})
      ORDER BY psr.requested_at DESC NULLS LAST, psr.id DESC
    `;

    return NextResponse.json({
      success: true,
      data: requests.map((item) => ({
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
        reason: item.reason,
        status: item.status,
        requestedBy: item.requested_by,
        requestedByRole: item.requested_by_role,
        requestedByName: item.requested_by_name,
        approvedBy: item.approved_by,
        approvedByRole: item.approved_by_role,
        approvedByName: item.approved_by_name,
        requestedAt: item.requested_at,
        approvedAt: item.approved_at,
        executedAt: item.executed_at,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching program shift requests:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch program shift requests." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const scope = await getSessionScope();
    const userRole = Number((session?.user as any)?.role) || 0;
    const userId = Number((session?.user as any)?.id) || null;
    const userName = String((session?.user as any)?.name || "").trim() || null;
    const roleContext = await getRoleContext(userRole);

    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canSubmitProgramShift(roleContext)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    await ensureProgramShiftRequestsTable();

    const body = await request.json();
    const studentNumber = String(body?.studentNumber || "").trim();
    const academicYear = String(body?.academicYear || "").trim();
    const semester = normalizeSemesterValue(body?.semester);
    const toProgramId = Number(body?.toProgramId);
    const toMajorId =
      body?.toMajorId === null ||
      body?.toMajorId === undefined ||
      body?.toMajorId === ""
        ? null
        : Number(body?.toMajorId);
    const reason = String(body?.reason || "").trim();

    if (
      !studentNumber ||
      !academicYear ||
      !Number.isFinite(Number(semester)) ||
      !Number.isFinite(toProgramId)
    ) {
      return NextResponse.json(
        {
          error:
            "studentNumber, academicYear, semester, and toProgramId are required.",
        },
        { status: 400 },
      );
    }

    if (semester !== 1 && semester !== 2 && semester !== 3) {
      return NextResponse.json(
        { error: "semester must be 1, 2, or 3." },
        { status: 400 },
      );
    }

    const targetProgram = await prisma.program.findUnique({
      where: { id: toProgramId },
      select: { id: true, code: true, name: true, department_id: true },
    });
    if (!targetProgram) {
      return NextResponse.json(
        { error: "Selected target program was not found." },
        { status: 404 },
      );
    }

    if (
      scope.isDean &&
      targetProgram.department_id !== scope.deanDepartmentId
    ) {
      return NextResponse.json(
        { error: "Target program is outside your department scope." },
        { status: 403 },
      );
    }

    if (toMajorId !== null) {
      const targetMajor = await prisma.major.findFirst({
        where: { id: toMajorId, program_id: toProgramId },
        select: { id: true },
      });
      if (!targetMajor) {
        return NextResponse.json(
          { error: "Selected major does not belong to the target program." },
          { status: 400 },
        );
      }
    }

    const currentTerm = await getServerCurrentTerm();
    const currentSemesterNum =
      currentTerm.semester === "First"
        ? 1
        : currentTerm.semester === "Second"
          ? 2
          : 3;
    if (
      academicYear !== currentTerm.academicYear ||
      semester !== currentSemesterNum
    ) {
      return NextResponse.json(
        {
          error:
            "Program shifting can only be requested for the current academic term.",
        },
        { status: 403 },
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

    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: [
            "program_shifting_allowed_days",
            "semester_start_month",
            "semester_start_day",
            "second_semester_start_month",
            "second_semester_start_day",
            "summer_semester_start_month",
            "summer_semester_start_day",
          ],
        },
      },
    });
    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    const allowedDaysRaw = Number.parseInt(
      settingsMap.program_shifting_allowed_days || "15",
      10,
    );
    const allowedDays = Number.isNaN(allowedDaysRaw) ? 15 : allowedDaysRaw;

    const serverTimeResult = await prisma.$queryRaw<{ now: Date }[]>`
      SELECT NOW() as now
    `;
    const serverNow = new Date(serverTimeResult[0]?.now || new Date());

    const termStartDate = getSemesterStartDate(
      academicYear,
      semester,
      settingsMap,
    );
    if (!termStartDate) {
      return NextResponse.json(
        { error: "Invalid academic year format for shift validation." },
        { status: 400 },
      );
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceStart = Math.floor(
      (serverNow.getTime() - termStartDate.getTime()) / msPerDay,
    );

    if (daysSinceStart > allowedDays) {
      return NextResponse.json(
        {
          error: "SHIFT_WINDOW_EXPIRED",
          message: `Program shifting is only allowed within ${allowedDays} days from term start.`,
          data: {
            termStartDate: termStartDate.toISOString(),
            serverTime: serverNow.toISOString(),
            daysSinceStart,
            allowedDays,
          },
        },
        { status: 400 },
      );
    }

    const enrollment = await getEnrollmentRowForTerm({
      studentNumber,
      academicYear,
      semester,
    });
    if (!enrollment) {
      return NextResponse.json(
        { error: "Student enrollment record not found for this term." },
        { status: 404 },
      );
    }

    const fromProgramId = await resolveProgramId(enrollment.course_program);
    const fromMajorId = enrollment.major_id ?? null;

    if (fromProgramId === toProgramId && fromMajorId === (toMajorId ?? null)) {
      return NextResponse.json(
        { error: "Student is already in the selected program/major." },
        { status: 400 },
      );
    }

    const existingPending = await prisma.$queryRaw<any[]>`
      SELECT id
      FROM student_program_shift_requests
      WHERE student_number = ${studentNumber}
        AND academic_year = ${academicYear}
        AND semester = ${semester}
        AND status = 'pending_approval'
      LIMIT 1
    `;
    if (existingPending.length > 0) {
      return NextResponse.json(
        {
          error:
            "A pending program shift request already exists for this student and term.",
        },
        { status: 409 },
      );
    }

    const autoApprove = canAutoApproveProgramShift(roleContext);

    if (!autoApprove) {
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO student_program_shift_requests (
          student_number,
          academic_year,
          semester,
          from_program_id,
          from_major_id,
          to_program_id,
          to_major_id,
          reason,
          status,
          requested_by,
          requested_by_role,
          requested_by_name
        )
        VALUES (
          ${studentNumber},
          ${academicYear},
          ${semester},
          ${fromProgramId},
          ${fromMajorId},
          ${toProgramId},
          ${toMajorId},
          ${reason || null},
          'pending_approval',
          ${userId},
          ${roleContext.roleId || null},
          ${userName}
        )
        RETURNING id
      `;

      return NextResponse.json({
        success: true,
        id: inserted[0]?.id ?? null,
        message: "Program shift request submitted for admin/dean approval.",
        status: "pending_approval",
        requiresApproval: true,
      });
    }

    const inserted = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>`
        INSERT INTO student_program_shift_requests (
          student_number,
          academic_year,
          semester,
          from_program_id,
          from_major_id,
          to_program_id,
          to_major_id,
          reason,
          status,
          requested_by,
          requested_by_role,
          requested_by_name,
          approved_by,
          approved_by_role,
          approved_by_name,
          approved_at,
          executed_at
        )
        VALUES (
          ${studentNumber},
          ${academicYear},
          ${semester},
          ${fromProgramId},
          ${fromMajorId},
          ${toProgramId},
          ${toMajorId},
          ${reason || "Directly processed by admin/dean"},
          'approved',
          ${userId},
          ${roleContext.roleId || null},
          ${userName},
          ${userId},
          ${roleContext.roleId || null},
          ${userName},
          NOW(),
          NOW()
        )
        RETURNING id
      `;

      const requestId = Number(rows[0]?.id || 0) || null;

      await executeApprovedProgramShift(tx, {
        studentNumber,
        academicYear,
        semester,
        toProgramId,
        toMajorId,
        approvedBy: userId,
        reason,
        requestId,
      });

      return rows;
    });

    return NextResponse.json({
      success: true,
      id: inserted[0]?.id ?? null,
      message: "Program shift applied successfully.",
      status: "approved",
      requiresApproval: false,
    });
  } catch (error: any) {
    console.error("Error creating program shift request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit program shift request." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const scope = await getSessionScope();
    const userRole = Number((session?.user as any)?.role) || 0;
    const userId = Number((session?.user as any)?.id) || null;
    const userName = String((session?.user as any)?.name || "").trim() || null;
    const roleContext = await getRoleContext(userRole);

    if (!scope) {
      return NextResponse.json(
        { error: "Unauthorized to manage program shift approvals." },
        { status: 401 },
      );
    }

    if (!canManageProgramShiftApprovals(roleContext)) {
      return NextResponse.json(
        { error: "Unauthorized to manage program shift approvals." },
        { status: 403 },
      );
    }

    await ensureProgramShiftRequestsTable();

    const body = await request.json();
    const requestId = Number(body?.id);
    const action = String(body?.action || "approve")
      .trim()
      .toLowerCase();

    if (!Number.isFinite(requestId)) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'." },
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
        { error: "Program shift request not found." },
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
        { error: "This program shift request is no longer pending approval." },
        { status: 409 },
      );
    }

    if (action === "reject") {
      await prisma.$executeRaw`
        UPDATE student_program_shift_requests
        SET status = 'rejected',
            approved_by = ${userId},
            approved_by_role = ${roleContext.roleId || null},
            approved_by_name = ${userName},
            approved_at = NOW()
        WHERE id = ${requestId}
      `;

      return NextResponse.json({
        success: true,
        message: "Program shift request rejected.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await executeApprovedProgramShift(tx, {
        studentNumber: shiftRequest.student_number,
        academicYear: shiftRequest.academic_year,
        semester: Number(shiftRequest.semester),
        toProgramId: Number(shiftRequest.to_program_id),
        toMajorId:
          shiftRequest.to_major_id === null ||
          shiftRequest.to_major_id === undefined
            ? null
            : Number(shiftRequest.to_major_id),
        approvedBy: userId,
        reason: shiftRequest.reason || null,
        requestId,
      });

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

    return NextResponse.json({
      success: true,
      message: "Program shift request approved successfully.",
    });
  } catch (error: any) {
    console.error("Error processing program shift approval:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process program shift approval." },
      { status: 500 },
    );
  }
}
