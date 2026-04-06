import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";
import { getAcademicTerm } from "../../../utils/academicTermUtils";
import {
  ensureDeanStudentAccess,
  getSessionScope,
} from "@/app/lib/accessScope";

const ROLES = {
  ADMIN: 1,
  REGISTRAR: 4,
} as const;

type RoleContext = {
  roleId: number;
  roleName: string;
  isDean: boolean;
};

const EXTERNAL_CROSS_ENROLLMENT_TABLE_SQL = `
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

async function ensureExternalCrossEnrollmentRequestsTable() {
  await prisma.$executeRawUnsafe(EXTERNAL_CROSS_ENROLLMENT_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_external_cross_enrollment_term ON student_external_cross_enrollment_requests(academic_year, semester)",
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_external_cross_enrollment_status ON student_external_cross_enrollment_requests(status)",
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_external_cross_enrollment_student ON student_external_cross_enrollment_requests(student_number)",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_external_cross_enrollment_requests ADD COLUMN IF NOT EXISTS school_id INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE student_external_cross_enrollment_requests ADD COLUMN IF NOT EXISTS remarks TEXT NULL",
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

  const roleName = String(roleRow?.role || "").trim().toLowerCase();
  return {
    roleId,
    roleName,
    isDean: roleName === "dean",
  };
}

function canSubmitExternalCrossEnrollment(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.roleId === ROLES.REGISTRAR || role.isDean;
}

async function getServerCurrentTerm() {
  const serverTimeResult = await prisma.$queryRaw<[{ now: Date }]>`
    SELECT NOW() AS now
  `;
  return getAcademicTerm(serverTimeResult[0].now);
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    const roleContext = await getRoleContext(scope?.roleId || 0);

    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canSubmitExternalCrossEnrollment(roleContext)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    await ensureExternalCrossEnrollmentRequestsTable();

    const searchParams = request.nextUrl.searchParams;
    const studentNumber = String(searchParams.get("studentNumber") || "").trim();
    const status = String(searchParams.get("status") || "all").trim();
    const academicYearParam = String(searchParams.get("academicYear") || "").trim();
    const semesterParam = Number(searchParams.get("semester"));
    const currentTerm = await getServerCurrentTerm();
    const academicYear = academicYearParam || currentTerm.academicYear;
    const semester =
      semesterParam === 1 || semesterParam === 2
        ? semesterParam
        : currentTerm.semester === "First"
          ? 1
          : 2;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        req.id,
        req.student_number,
        req.school_id,
        req.external_school_name,
        req.subject_code,
        req.subject_title,
        req.units_total,
        req.year_level,
        req.academic_year,
        req.semester,
        req.reason,
        req.status,
        req.requested_at,
        req.approved_at,
        req.remarks,
        sch.name AS school_name,
        enr.first_name,
        enr.family_name AS last_name,
        CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
        prog.code AS home_program_code,
        prog.name AS home_program_name
      FROM student_external_cross_enrollment_requests req
      LEFT JOIN schools sch ON sch.id = req.school_id
      LEFT JOIN LATERAL (
        SELECT e.first_name, e.middle_name, e.family_name, e.course_program, e.department
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
      LEFT JOIN program prog
        ON prog.code = enr.course_program
        OR prog.name = enr.course_program
      WHERE req.academic_year = ${academicYear}
        AND req.semester = ${semester}
        AND (${studentNumber}::text = '' OR req.student_number = ${studentNumber})
        AND (${status}::text = 'all' OR req.status = ${status})
        AND (${scope.isDean ? scope.deanDepartmentId : null}::int IS NULL OR enr.department = ${scope.deanDepartmentId})
      ORDER BY req.requested_at DESC NULLS LAST, req.id DESC
    `;

    return NextResponse.json({
      success: true,
      data: rows.map((item) => ({
        id: item.id,
        studentNumber: item.student_number,
        studentName: item.student_name || item.student_number,
        firstName: item.first_name || "",
        lastName: item.last_name || "",
        schoolId: item.school_id,
        schoolName: item.school_name || item.external_school_name,
        externalSchoolName: item.external_school_name,
        subjectCode: item.subject_code,
        subjectTitle: item.subject_title,
        unitsTotal: Number(item.units_total || 0),
        yearLevel: item.year_level,
        academicYear: item.academic_year,
        semester: item.semester,
        reason: item.reason,
        status: item.status,
        requestedAt: item.requested_at,
        approvedAt: item.approved_at,
        remarks: item.remarks,
        homeProgramCode: item.home_program_code,
        homeProgramName: item.home_program_name,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching external cross-enrollment requests:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch external cross-enrollment requests." },
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
    const roleContext = await getRoleContext(userRole);

    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canSubmitExternalCrossEnrollment(roleContext)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    await ensureExternalCrossEnrollmentRequestsTable();

    const body = await request.json();
    const studentNumber = String(body?.studentNumber || "").trim();
    const externalSchoolName = String(body?.externalSchoolName || "").trim();
    const subjectCode = String(body?.subjectCode || "").trim().toUpperCase();
    const subjectTitle = String(body?.subjectTitle || "").trim();
    const unitsTotal = Number(body?.unitsTotal);
    const yearLevel =
      body?.yearLevel === null || body?.yearLevel === undefined || body?.yearLevel === ""
        ? null
        : Number(body.yearLevel);
    const reason = String(body?.reason || "").trim();
    const academicYear = String(body?.academicYear || "").trim();
    const semester = Number(body?.semester);

    if (!studentNumber || !academicYear || !Number.isFinite(semester)) {
      return NextResponse.json(
        { error: "studentNumber, academicYear, and semester are required." },
        { status: 400 },
      );
    }

    if (!externalSchoolName) {
      return NextResponse.json(
        { error: "An external school is required." },
        { status: 400 },
      );
    }

    if (!subjectCode || !subjectTitle) {
      return NextResponse.json(
        { error: "Subject code and subject title are required." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(unitsTotal) || unitsTotal <= 0) {
      return NextResponse.json(
        { error: "Units must be greater than 0." },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required for external cross-enrollment requests." },
        { status: 400 },
      );
    }

    const currentTerm = await getServerCurrentTerm();
    const currentSemesterNum = currentTerm.semester === "First" ? 1 : 2;
    if (academicYear !== currentTerm.academicYear || semester !== currentSemesterNum) {
      return NextResponse.json(
        {
          error:
            "External cross-enrollment requests can only be submitted for the current academic term.",
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

    const existingPending = await prisma.$queryRaw<any[]>`
      SELECT id
      FROM student_external_cross_enrollment_requests
      WHERE student_number = ${studentNumber}
        AND LOWER(external_school_name) = LOWER(${externalSchoolName})
        AND subject_code = ${subjectCode}
        AND academic_year = ${academicYear}
        AND semester = ${semester}
        AND status = 'pending_approval'
      LIMIT 1
    `;
    if (existingPending.length > 0) {
      return NextResponse.json(
        { error: "A pending external cross-enrollment request already exists for this subject." },
        { status: 409 },
      );
    }

    const insertedRows = await prisma.$queryRaw<any[]>`
      INSERT INTO student_external_cross_enrollment_requests (
        student_number,
        school_id,
        external_school_name,
        subject_code,
        subject_title,
        units_total,
        year_level,
        academic_year,
        semester,
        reason,
        status,
        requested_by
      )
      VALUES (
        ${studentNumber},
        NULL,
        ${externalSchoolName},
        ${subjectCode},
        ${subjectTitle},
        ${unitsTotal},
        ${yearLevel},
        ${academicYear},
        ${semester},
        ${reason},
        'pending_approval',
        ${userId}
      )
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      id: insertedRows[0]?.id ?? null,
      message: "External cross-enrollment request submitted for approval.",
      status: "pending_approval",
    });
  } catch (error: any) {
    console.error("Error creating external cross-enrollment request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create external cross-enrollment request." },
      { status: 500 },
    );
  }
}
