import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import {
  ensureDeanStudentAccess,
  getSessionScope,
  type SessionScope,
} from "@/app/lib/accessScope";
import {
  getEnrolledSubjectIdsForTerm,
  getMatchingScheduleIdsForSection,
  normalizeSemesterValue,
} from "../../../utils/studentSectionMatching";

type ShiftRequest = {
  studentNumber?: string;
  toSectionId?: number;
  academicYear?: string;
  semester?: string;
  overrideCapacity?: boolean;
  reason?: string;
};

const ROLES = {
  ADMIN: 1,
  REGISTRAR: 4,
} as const;

type RoleContext = {
  roleId: number;
  roleName: string;
  isDean: boolean;
};

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

async function getRoleContext(roleId: number): Promise<RoleContext> {
  if (!Number.isFinite(roleId) || roleId <= 0) {
    return { roleId: 0, roleName: "", isDean: false };
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

function canSubmitShift(role: RoleContext) {
  return (
    role.roleId === ROLES.ADMIN ||
    role.roleId === ROLES.REGISTRAR ||
    role.isDean
  );
}

function canAutoApproveShift(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.isDean;
}

async function ensureDeanSectionAccess(
  scope: SessionScope | null,
  sectionId: number,
) {
  if (!scope?.isDean) {
    return null;
  }

  if (!scope.deanDepartmentId) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Dean account is not linked to a department.",
      },
      { status: 403 },
    );
  }

  const sectionRows = await prisma.$queryRaw<
    { department_id: number | null }[]
  >`
    SELECT prog.department_id
    FROM sections sec
    JOIN program prog ON prog.id = sec.program_id
    WHERE sec.id = ${sectionId}
    LIMIT 1
  `;

  if (!sectionRows[0]) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Destination section not found." },
      { status: 404 },
    );
  }

  if (sectionRows[0].department_id !== scope.deanDepartmentId) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Destination section is outside your department scope.",
      },
      { status: 403 },
    );
  }

  return null;
}

const parseAcademicYearStart = (academicYear: string): number | null => {
  const startYear = Number.parseInt(String(academicYear).split("-")[0], 10);
  return Number.isNaN(startYear) ? null : startYear;
};

const getSemesterStartDate = (
  academicYear: string,
  semester: "first" | "second" | "summer",
  settingsMap: Record<string, string>,
) => {
  const startYear = parseAcademicYearStart(academicYear);
  if (startYear === null) return null;

  if (semester === "first") {
    const startMonth = Number.parseInt(
      settingsMap.semester_start_month || "8",
      10,
    );
    const startDay = Number.parseInt(settingsMap.semester_start_day || "1", 10);
    return new Date(startYear, startMonth - 1, startDay);
  }

  if (semester === "second") {
    const startMonth = Number.parseInt(
      settingsMap.second_semester_start_month || "1",
      10,
    );
    const startDay = Number.parseInt(
      settingsMap.second_semester_start_day || "12",
      10,
    );
    return new Date(startYear + 1, startMonth - 1, startDay);
  }

  const summerStartMonth = Number.parseInt(
    settingsMap.summer_semester_start_month || "5",
    10,
  );
  const summerStartDay = Number.parseInt(
    settingsMap.summer_semester_start_day || "1",
    10,
  );
  return new Date(startYear + 1, summerStartMonth - 1, summerStartDay);
};

async function performShift(args: {
  studentNumber: string;
  toSectionId: number;
  academicYear: string;
  normalizedSemester: "first" | "second" | "summer";
  overrideCapacity?: boolean;
}) {
  const {
    studentNumber,
    toSectionId,
    academicYear,
    normalizedSemester,
    overrideCapacity,
  } = args;

  const currentAssignment = await prisma.student_section.findUnique({
    where: {
      student_number_academic_year_semester: {
        student_number: studentNumber,
        academic_year: academicYear,
        semester: normalizedSemester,
      },
    },
  });

  if (!currentAssignment) {
    return {
      ok: false,
      status: 404,
      payload: {
        error: "NOT_FOUND",
        message:
          "Student has no section assignment for the selected academic term.",
      },
    };
  }

  if (currentAssignment.section_id === toSectionId) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "VALIDATION_ERROR",
        message:
          "Student is already assigned to the selected destination section.",
      },
    };
  }

  const destinationSection = await prisma.sections.findUnique({
    where: { id: toSectionId },
  });

  if (!destinationSection) {
    return {
      ok: false,
      status: 404,
      payload: {
        error: "NOT_FOUND",
        message: "Destination section not found.",
      },
    };
  }

  if (destinationSection.status !== "active") {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "INVALID_STATE",
        message: `Destination section must be active. Current status: ${destinationSection.status}`,
      },
    };
  }

  if (
    destinationSection.academic_year !== academicYear ||
    destinationSection.semester !== normalizedSemester
  ) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "TERM_MISMATCH",
        message:
          "Destination section does not match student's selected academic year/semester.",
      },
    };
  }

  const currentCount = destinationSection.student_count || 0;
  const maxCapacity = destinationSection.max_capacity || 0;
  if (!overrideCapacity && maxCapacity > 0 && currentCount >= maxCapacity) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "CAPACITY_EXCEEDED",
        message: `Destination section is full (${currentCount}/${maxCapacity}).`,
      },
    };
  }

  const studentEnrolledSubjectIds = await getEnrolledSubjectIdsForTerm(
    prisma,
    studentNumber,
    academicYear,
    normalizedSemester,
  );

  if (studentEnrolledSubjectIds.length === 0) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "ASSESSMENT_REQUIRED",
        message:
          "Student has no enrolled subjects for this term. Assessment must be completed before shifting.",
      },
    };
  }

  const destinationScheduleCount = await prisma.class_schedule.count({
    where: { section_id: toSectionId, status: "active" },
  });
  if (destinationScheduleCount === 0) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "NO_DESTINATION_SCHEDULES",
        message: "Destination section has no active class schedules.",
      },
    };
  }

  const matchedScheduleIds = await getMatchingScheduleIdsForSection(
    prisma,
    toSectionId,
    studentEnrolledSubjectIds,
  );

  if (matchedScheduleIds.length === 0) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "NO_MATCHING_SCHEDULES",
        message:
          "No matching class schedules found in destination section for student's enrolled subjects.",
      },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.student_section_subjects.deleteMany({
      where: { student_section_id: currentAssignment.id },
    });

    await tx.student_section.update({
      where: { id: currentAssignment.id },
      data: { section_id: toSectionId },
    });

    await tx.student_section_subjects.createMany({
      data: matchedScheduleIds.map((scheduleId) => ({
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
      where: { id: toSectionId },
      data: { student_count: { increment: 1 } },
    });
  });

  return {
    ok: true,
    currentAssignment,
    matchedScheduleCount: matchedScheduleIds.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const scope = await getSessionScope();
    const userRole = Number((session?.user as any)?.role) || 0;
    const requesterId = Number((session?.user as any)?.id) || null;
    const requesterName =
      String((session?.user as any)?.name || "").trim() || null;
    const roleContext = await getRoleContext(userRole);

    if (!scope) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Unauthorized." },
        { status: 401 },
      );
    }

    if (!canSubmitShift(roleContext)) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Unauthorized." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as ShiftRequest;
    const studentNumber = body.studentNumber?.trim();
    const normalizedSemester = body.semester
      ? normalizeSemesterValue(body.semester)
      : null;

    if (
      !studentNumber ||
      !body.toSectionId ||
      !body.academicYear ||
      !normalizedSemester
    ) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message:
            "Missing required fields: studentNumber, toSectionId, academicYear, semester",
        },
        { status: 400 },
      );
    }

    const access = await ensureDeanStudentAccess(scope, {
      studentNumber,
      academicYear: body.academicYear,
      semester: normalizedSemester,
    });
    if (!access.ok) {
      return NextResponse.json({ error: "FORBIDDEN", message: access });
    }

    const sectionAccess = await ensureDeanSectionAccess(
      scope,
      body.toSectionId,
    );
    if (sectionAccess) {
      return sectionAccess;
    }

    const serverTimeResult = await prisma.$queryRaw<
      { now: Date }[]
    >`SELECT NOW() as now`;
    const serverTime = new Date(serverTimeResult[0].now);

    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: [
            "section_shifting_allowed_days",
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
      settingsMap.section_shifting_allowed_days || "15",
      10,
    );
    const allowedDays = Number.isNaN(allowedDaysRaw) ? 15 : allowedDaysRaw;

    const termStartDate = getSemesterStartDate(
      body.academicYear,
      normalizedSemester as "first" | "second" | "summer",
      settingsMap,
    );
    if (!termStartDate) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid academic year format for shift validation.",
        },
        { status: 400 },
      );
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceStart = Math.floor(
      (serverTime.getTime() - termStartDate.getTime()) / msPerDay,
    );

    if (daysSinceStart > allowedDays) {
      return NextResponse.json(
        {
          error: "SHIFT_WINDOW_EXPIRED",
          message: `Shifting is only allowed within ${allowedDays} days from term start.`,
          data: {
            termStartDate: termStartDate.toISOString(),
            serverTime: serverTime.toISOString(),
            daysSinceStart,
            allowedDays,
          },
        },
        { status: 400 },
      );
    }

    if (!canAutoApproveShift(roleContext)) {
      await ensureShiftRequestsTable();

      const existingPending = await prisma.$queryRaw<any[]>`
        SELECT id
        FROM student_section_shift_requests
        WHERE student_number = ${studentNumber}
          AND academic_year = ${body.academicYear}
          AND semester = ${normalizedSemester}
          AND status = 'pending_approval'
        LIMIT 1
      `;

      if (existingPending.length > 0) {
        return NextResponse.json(
          {
            error: "DUPLICATE_PENDING_REQUEST",
            message:
              "A pending section shift request already exists for this student and term.",
          },
          { status: 409 },
        );
      }

      const currentAssignment = await prisma.student_section.findUnique({
        where: {
          student_number_academic_year_semester: {
            student_number: studentNumber,
            academic_year: body.academicYear,
            semester: normalizedSemester,
          },
        },
      });

      if (!currentAssignment) {
        return NextResponse.json(
          {
            error: "NOT_FOUND",
            message:
              "Student has no section assignment for the selected academic term.",
          },
          { status: 404 },
        );
      }

      if (currentAssignment.section_id === body.toSectionId) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message:
              "Student is already assigned to the selected destination section.",
          },
          { status: 400 },
        );
      }

      await prisma.$executeRaw`
        INSERT INTO student_section_shift_requests (
          student_number,
          from_section_id,
          to_section_id,
          academic_year,
          semester,
          reason,
          status,
          requested_by,
          requested_by_role,
          requested_by_name
        ) VALUES (
          ${studentNumber},
          ${currentAssignment.section_id},
          ${body.toSectionId},
          ${body.academicYear},
          ${normalizedSemester},
          ${body.reason || null},
          'pending_approval',
          ${requesterId},
          ${roleContext.roleId || null},
          ${requesterName}
        )
      `;

      return NextResponse.json({
        success: true,
        message: "Section shift request submitted for admin/dean approval.",
        data: {
          studentNumber,
          fromSectionId: currentAssignment.section_id,
          toSectionId: body.toSectionId,
          academicYear: body.academicYear,
          semester: normalizedSemester,
          daysSinceTermStart: daysSinceStart,
          allowedDays,
          requiresApproval: true,
          status: "pending_approval",
        },
      });
    }

    const shifted = await performShift({
      studentNumber,
      toSectionId: body.toSectionId,
      academicYear: body.academicYear,
      normalizedSemester: normalizedSemester as "first" | "second" | "summer",
      overrideCapacity: body.overrideCapacity,
    });

    if (!shifted.ok) {
      return NextResponse.json(shifted.payload, { status: shifted.status });
    }

    await ensureShiftRequestsTable();

    await prisma.$executeRaw`
      INSERT INTO student_section_shift_requests (
        student_number,
        from_section_id,
        to_section_id,
        academic_year,
        semester,
        reason,
        status,
        requested_by,
        requested_by_role,
        requested_by_name,
        approved_by,
        approved_by_role,
        approved_by_name,
        approved_at,
        executed_by,
        executed_by_role,
        executed_by_name,
        executed_at
      ) VALUES (
        ${studentNumber},
        ${shifted.currentAssignment.section_id},
        ${body.toSectionId},
        ${body.academicYear},
        ${normalizedSemester},
        ${body.reason || "Directly processed by admin/dean"},
        'approved',
        ${requesterId},
        ${roleContext.roleId || null},
        ${requesterName},
        ${requesterId},
        ${roleContext.roleId || null},
        ${requesterName},
        NOW(),
        ${requesterId},
        ${roleContext.roleId || null},
        ${requesterName},
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Student shifted successfully.",
      data: {
        studentNumber,
        fromSectionId: shifted.currentAssignment.section_id,
        toSectionId: body.toSectionId,
        academicYear: body.academicYear,
        semester: normalizedSemester,
        matchedScheduleCount: shifted.matchedScheduleCount,
        daysSinceTermStart: daysSinceStart,
        allowedDays,
        requiresApproval: false,
        status: "approved",
        audit: {
          requestedBy: requesterId,
          requestedByRole: roleContext.roleId,
          requestedByName: requesterName,
          approvedBy: requesterId,
          approvedByRole: roleContext.roleId,
          approvedByName: requesterName,
          executedBy: requesterId,
          executedByRole: roleContext.roleId,
          executedByName: requesterName,
        },
      },
    });
  } catch (error) {
    console.error("Error shifting student:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to shift student",
      },
      { status: 500 },
    );
  }
}
