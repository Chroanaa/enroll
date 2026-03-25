import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";
import { recalculateAssessmentForTerm } from "../../../lib/recalculateAssessment";
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

function getSemesterAliases(semester: number): string[] {
  if (semester === 1) {
    return ["first", "first semester", "1", "1st semester"];
  }
  if (semester === 2) {
    return ["second", "second semester", "2", "2nd semester"];
  }
  return [];
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

function canSubmitCrossEnrollment(role: RoleContext) {
  return (
    role.roleId === ROLES.ADMIN ||
    role.roleId === ROLES.REGISTRAR ||
    role.isDean
  );
}

function shouldAutoApproveCrossEnrollment(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.isDean;
}

async function getServerCurrentTerm() {
  const serverTimeResult = await prisma.$queryRaw<[{ now: Date }]>`
    SELECT NOW() AS now
  `;
  return getAcademicTerm(serverTimeResult[0].now);
}

async function resolveProgramId(courseProgram: string | null | undefined) {
  if (!courseProgram) {
    return null;
  }

  const trimmed = String(courseProgram).trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const byId = await prisma.program.findFirst({
      where: { id: Number(trimmed) },
      select: { id: true },
    });

    if (byId) {
      return byId.id;
    }
  }

  const byCodeOrName = await prisma.program.findFirst({
    where: {
      OR: [{ code: trimmed }, { name: trimmed }],
    },
    select: { id: true },
  });

  return byCodeOrName?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    const roleContext = await getRoleContext(scope?.roleId || 0);

    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canSubmitCrossEnrollment(roleContext)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const studentNumber = searchParams.get("studentNumber");
    const status = searchParams.get("status") || "pending_approval";
    const academicYearParam = searchParams.get("academicYear");
    const semesterParam = searchParams.get("semester");
    const currentTerm = await getServerCurrentTerm();
    const semesterNum =
      semesterParam === "1" || semesterParam === "2"
        ? Number(semesterParam)
        : currentTerm.semester === "First"
          ? 1
          : 2;
    const academicYear = academicYearParam || currentTerm.academicYear;
    const firstSemesterAliases = getSemesterAliases(1);
    const secondSemesterAliases = getSemesterAliases(2);

    const requests = await prisma.$queryRaw<any[]>`
      SELECT
        cer.id,
        cer.student_number,
        cer.home_program_id,
        cer.home_major_id,
        cer.host_program_id,
        cer.host_major_id,
        cer.curriculum_course_id,
        cer.subject_id,
        cer.academic_year,
        cer.semester,
        cer.year_level,
        cer.units_total,
        cer.reason,
        cer.status,
        cer.requested_by,
        cer.approved_by,
        cer.requested_at,
        cer.approved_at,
        EXISTS (
          SELECT 1
          FROM enrolled_subjects es
          WHERE es.student_number = cer.student_number
            AND es.academic_year = cer.academic_year
            AND es.semester = cer.semester
            AND es.curriculum_course_id = cer.curriculum_course_id
        ) AS is_currently_enrolled,
        EXISTS (
          SELECT 1
          FROM student_section ss
          INNER JOIN student_section_subjects sss ON sss.student_section_id = ss.id
          INNER JOIN class_schedule cs ON cs.id = sss.class_schedule_id
          WHERE ss.student_number = cer.student_number
            AND ss.academic_year = cer.academic_year
            AND (
              (cer.semester = 1 AND LOWER(COALESCE(ss.semester, '')) IN (${firstSemesterAliases[0]}, ${firstSemesterAliases[1]}, ${firstSemesterAliases[2]}, ${firstSemesterAliases[3]}))
              OR
              (cer.semester = 2 AND LOWER(COALESCE(ss.semester, '')) IN (${secondSemesterAliases[0]}, ${secondSemesterAliases[1]}, ${secondSemesterAliases[2]}, ${secondSemesterAliases[3]}))
            )
            AND cs.curriculum_course_id = cer.curriculum_course_id
        ) AS has_section_assignment,
        COALESCE(cc.course_code, sub.code) AS course_code,
        COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
        home_program.name AS home_program_name,
        home_program.code AS home_program_code,
        home_major.name AS home_major_name,
        host_program.name AS host_program_name,
        host_program.code AS host_program_code,
        host_major.name AS host_major_name,
        dept.id AS department_id,
        dept.name AS department_name,
        CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
        enr.first_name,
        enr.family_name AS last_name
      FROM student_cross_enrollment_requests cer
      LEFT JOIN curriculum_course cc ON cc.id = cer.curriculum_course_id
      LEFT JOIN subject sub ON sub.id = cer.subject_id
      LEFT JOIN program home_program ON home_program.id = cer.home_program_id
      LEFT JOIN major home_major ON home_major.id = cer.home_major_id
      LEFT JOIN program host_program ON host_program.id = cer.host_program_id
      LEFT JOIN major host_major ON host_major.id = cer.host_major_id
      LEFT JOIN LATERAL (
        SELECT e.first_name, e.middle_name, e.family_name, e.department
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
      LEFT JOIN department dept ON dept.id = enr.department
      WHERE cer.academic_year = ${academicYear}
        AND cer.semester = ${semesterNum}
        AND (${studentNumber}::text IS NULL OR cer.student_number = ${studentNumber})
        AND (${status}::text = 'all' OR cer.status = ${status})
        AND (${scope.isDean ? scope.deanDepartmentId : null}::int IS NULL OR enr.department = ${scope.deanDepartmentId})
      ORDER BY cer.requested_at DESC NULLS LAST, cer.id DESC
    `;

    return NextResponse.json({
      success: true,
      data: requests.map((item) => ({
        id: item.id,
        studentNumber: item.student_number,
        studentName: item.student_name || item.student_number,
        firstName: item.first_name || "",
        lastName: item.last_name || "",
        homeProgramId: item.home_program_id,
        homeProgramName: item.home_program_name,
        homeProgramCode: item.home_program_code,
        homeMajorName: item.home_major_name,
        hostProgramId: item.host_program_id,
        hostProgramName: item.host_program_name,
        hostProgramCode: item.host_program_code,
        hostMajorName: item.host_major_name,
        hostMajorId: item.host_major_id,
        departmentId: item.department_id,
        departmentName: item.department_name,
        curriculumCourseId: item.curriculum_course_id,
        subjectId: item.subject_id,
        academicYear: item.academic_year,
        semester: item.semester,
        yearLevel: item.year_level,
        unitsTotal: item.units_total,
        isCurrentlyEnrolled: Boolean(item.is_currently_enrolled),
        hasSectionAssignment: Boolean(item.has_section_assignment),
        reason: item.reason,
        status: item.status,
        requestedAt: item.requested_at,
        approvedAt: item.approved_at,
        courseCode: item.course_code,
        descriptiveTitle: item.descriptive_title,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching cross-enrollee requests:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch cross-enrollee requests." },
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

    if (!canSubmitCrossEnrollment(roleContext)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const studentNumber = String(body?.studentNumber || "").trim();
    const hostProgramId = Number(body?.hostProgramId);
    const hostMajorId =
      body?.hostMajorId === null ||
      body?.hostMajorId === undefined ||
      body?.hostMajorId === ""
        ? null
        : Number(body.hostMajorId);
    const curriculumCourseId = Number(body?.curriculumCourseId);
    const academicYear = String(body?.academicYear || "").trim();
    const semester = Number(body?.semester);
    const reason = String(body?.reason || "").trim();

    if (
      !studentNumber ||
      !Number.isFinite(hostProgramId) ||
      !Number.isFinite(curriculumCourseId) ||
      !academicYear ||
      !Number.isFinite(semester)
    ) {
      return NextResponse.json(
        {
          error:
            "studentNumber, hostProgramId, curriculumCourseId, academicYear, and semester are required.",
        },
        { status: 400 },
      );
    }

    if (semester !== 1 && semester !== 2) {
      return NextResponse.json(
        { error: "semester must be 1 or 2." },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required for cross-enrollee requests." },
        { status: 400 },
      );
    }

    const currentTerm = await getServerCurrentTerm();
    const currentSemesterNum = currentTerm.semester === "First" ? 1 : 2;

    if (
      academicYear !== currentTerm.academicYear ||
      semester !== currentSemesterNum
    ) {
      return NextResponse.json(
        {
          error:
            "Cross-enrollee requests can only be submitted for the current academic term.",
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

    const enrollment = await prisma.enrollment.findFirst({
      where: { student_number: studentNumber },
      orderBy: { id: "desc" },
      select: {
        student_number: true,
        course_program: true,
        major_id: true,
        department: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );
    }

    const homeProgramId = await resolveProgramId(enrollment.course_program);

    if (homeProgramId && homeProgramId === hostProgramId) {
      return NextResponse.json(
        {
          error:
            "Cross-enrollee requests must target a different host program.",
        },
        { status: 400 },
      );
    }

    const hostProgram = await prisma.program.findUnique({
      where: { id: hostProgramId },
      select: { id: true, code: true, name: true },
    });

    if (!hostProgram) {
      return NextResponse.json(
        { error: "Selected host program was not found." },
        { status: 404 },
      );
    }

    const curriculumCourseRows = await prisma.$queryRaw<any[]>`
      SELECT
        cc.id,
        cc.subject_id,
        cc.course_code,
        cc.descriptive_title,
        cc.units_total,
        cc.year_level,
        c.program_code,
        c.program_name
      FROM curriculum_course cc
      INNER JOIN curriculum c ON c.id = cc.curriculum_id
      WHERE cc.id = ${curriculumCourseId}
      LIMIT 1
    `;

    const course = curriculumCourseRows[0];

    if (!course) {
      return NextResponse.json(
        { error: "Selected subject was not found." },
        { status: 404 },
      );
    }

    const belongsToHostProgram =
      course.program_code === hostProgram.code ||
      course.program_name === hostProgram.name;

    if (!belongsToHostProgram) {
      return NextResponse.json(
        {
          error:
            "The selected subject does not belong to the chosen host program.",
        },
        { status: 400 },
      );
    }

    const existingEnrolled = await prisma.$queryRaw<any[]>`
      SELECT id
      FROM enrolled_subjects
      WHERE student_number = ${studentNumber}
        AND academic_year = ${academicYear}
        AND semester = ${semester}
        AND curriculum_course_id = ${curriculumCourseId}
      LIMIT 1
    `;

    if (existingEnrolled.length > 0) {
      return NextResponse.json(
        {
          error: "This subject is already in the student's enrolled subjects.",
        },
        { status: 409 },
      );
    }

    const existingPending = await prisma.$queryRaw<any[]>`
      SELECT id
      FROM student_cross_enrollment_requests
      WHERE student_number = ${studentNumber}
        AND academic_year = ${academicYear}
        AND semester = ${semester}
        AND curriculum_course_id = ${curriculumCourseId}
        AND status = 'pending_approval'
      LIMIT 1
    `;

    if (existingPending.length > 0) {
      return NextResponse.json(
        {
          error:
            "A pending cross-enrollee request already exists for this subject.",
        },
        { status: 409 },
      );
    }

    const autoApprove = shouldAutoApproveCrossEnrollment(roleContext);
    const requestStatus = autoApprove ? "approved" : "pending_approval";

    const insertedRows = await prisma.$transaction(async (tx) => {
      const insertedRequest = await tx.$queryRaw<any[]>`
        INSERT INTO student_cross_enrollment_requests (
          student_number,
          home_program_id,
          home_major_id,
          host_program_id,
          host_major_id,
          curriculum_course_id,
          subject_id,
          academic_year,
          semester,
          year_level,
          units_total,
          reason,
          status,
          requested_by,
          approved_by,
          approved_at
        )
        VALUES (
          ${studentNumber},
          ${homeProgramId},
          ${enrollment.major_id ?? null},
          ${hostProgramId},
          ${hostMajorId},
          ${curriculumCourseId},
          ${course.subject_id ?? null},
          ${academicYear},
          ${semester},
          ${course.year_level ?? null},
          ${course.units_total ?? 0},
          ${reason},
          ${requestStatus},
          ${userId},
          ${autoApprove ? userId : null},
          ${autoApprove ? new Date() : null}
        )
        RETURNING id
      `;

      if (autoApprove) {
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
            ${studentNumber},
            ${homeProgramId},
            ${curriculumCourseId},
            ${course.subject_id ?? null},
            ${academicYear},
            ${semester},
            ${semester === 1 ? "First Semester" : "Second Semester"},
            ${course.year_level ?? null},
            ${course.units_total ?? 0},
            'enrolled',
            'none',
            NOW()
          )
        `;

        await recalculateAssessmentForTerm(
          tx,
          studentNumber,
          academicYear,
          semester,
        );
      }

      return insertedRequest;
    });

    return NextResponse.json({
      success: true,
      id: insertedRows[0]?.id ?? null,
      message: autoApprove
        ? "Cross-enrollee subject added successfully."
        : "Cross-enrollee request submitted for approval.",
      status: requestStatus,
    });
  } catch (error: any) {
    console.error("Error creating cross-enrollee request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create cross-enrollee request." },
      { status: 500 },
    );
  }
}
