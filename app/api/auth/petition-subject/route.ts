import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
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
const DEFAULT_MIN_PETITION_STUDENTS = 15;

type RoleContext = {
  roleId: number;
  roleName: string;
  isDean: boolean;
};

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

function termLabelFromSemester(semester: number): string {
  if (semester === 1) return "First Semester";
  if (semester === 2) return "Second Semester";
  return "Third Semester";
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

function canSubmitPetition(role: RoleContext) {
  return (
    role.roleId === ROLES.ADMIN ||
    role.roleId === ROLES.REGISTRAR ||
    role.isDean
  );
}

function shouldAutoApprovePetition(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.isDean;
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

async function getActiveCurriculum(args: {
  programCode: string;
  programName: string;
  majorName?: string | null;
  majorCode?: string | null;
}) {
  if (args.majorName || args.majorCode) {
    const direct = await prisma.curriculum.findFirst({
      where: {
        program_code: args.programCode,
        major: args.majorName || args.majorCode || undefined,
        status: "active",
      },
      orderBy: { effective_year: "desc" },
    });
    if (direct) return direct;

    const byCode = args.majorCode
      ? await prisma.curriculum.findFirst({
          where: {
            program_code: args.programCode,
            major: args.majorCode,
            status: "active",
          },
          orderBy: { effective_year: "desc" },
        })
      : null;
    if (byCode) return byCode;

    const all = await prisma.curriculum.findMany({
      where: {
        program_code: args.programCode,
        status: "active",
      },
      orderBy: { effective_year: "desc" },
    });
    const normalizedMajorName = String(args.majorName || "").toLowerCase();
    const normalizedMajorCode = String(args.majorCode || "").toLowerCase();
    const matched = all.find((item) => {
      const value = String(item.major || "").toLowerCase();
      return value && (value === normalizedMajorName || value === normalizedMajorCode);
    });
    if (matched) return matched;
  }

  const noMajor = await prisma.curriculum.findFirst({
    where: {
      program_code: args.programCode,
      status: "active",
      OR: [{ major: null }, { major: "" }],
    },
    orderBy: { effective_year: "desc" },
  });
  if (noMajor) return noMajor;

  const anyByProgram = await prisma.curriculum.findFirst({
    where: {
      program_code: args.programCode,
      status: "active",
    },
    orderBy: { effective_year: "desc" },
  });
  if (anyByProgram) return anyByProgram;

  return prisma.curriculum.findFirst({
    where: {
      program_name: args.programName,
      status: "active",
    },
    orderBy: { effective_year: "desc" },
  });
}

async function getPetitionCandidates(args: {
  studentNumber: string;
  academicYear: string;
  semester: number;
}) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { student_number: args.studentNumber },
    orderBy: { id: "desc" },
    select: {
      student_number: true,
      course_program: true,
      major_id: true,
      year_level: true,
    },
  });

  if (!enrollment) {
    return {
      enrollment: null,
      candidates: [],
    };
  }

  const homeProgramId = await resolveProgramId(enrollment.course_program);
  if (!homeProgramId) {
    return {
      enrollment,
      candidates: [],
    };
  }

  const homeProgram = await prisma.program.findUnique({
    where: { id: homeProgramId },
    select: { id: true, code: true, name: true },
  });

  if (!homeProgram) {
    return {
      enrollment,
      candidates: [],
    };
  }

  const major = enrollment.major_id
    ? await prisma.major.findUnique({
        where: { id: enrollment.major_id },
        select: { name: true, code: true },
      })
    : null;

  const curriculum = await getActiveCurriculum({
    programCode: homeProgram.code,
    programName: homeProgram.name,
    majorName: major?.name || null,
    majorCode: major?.code || null,
  });

  if (!curriculum) {
    return {
      enrollment,
      candidates: [],
    };
  }

  const curriculumCourses = await prisma.curriculum_course.findMany({
    where: { curriculum_id: curriculum.id },
    orderBy: [{ year_level: "asc" }, { semester: "asc" }, { course_code: "asc" }],
  });

  if (!curriculumCourses.length) {
    return {
      enrollment,
      candidates: [],
    };
  }

  const courseIds = curriculumCourses.map((item) => item.id);
  const termAliases = getSemesterAliases(args.semester);

  const [enrolledRows, pendingRows, openRows] = await Promise.all([
    prisma.enrolled_subjects.findMany({
      where: {
        student_number: args.studentNumber,
        academic_year: args.academicYear,
        semester: args.semester,
        curriculum_course_id: { in: courseIds },
      },
      select: { curriculum_course_id: true },
    }),
    prisma.$queryRaw<{ curriculum_course_id: number }[]>`
      SELECT curriculum_course_id
      FROM student_petition_subject_requests
      WHERE student_number = ${args.studentNumber}
        AND academic_year = ${args.academicYear}
        AND semester = ${args.semester}
        AND status = 'pending_approval'
    `,
    prisma.$queryRaw<{ curriculum_course_id: number }[]>`
      SELECT DISTINCT cs.curriculum_course_id
      FROM class_schedule cs
      INNER JOIN sections s ON s.id = cs.section_id
      WHERE s.program_id = ${homeProgram.id}
        AND cs.academic_year = ${args.academicYear}
        AND LOWER(COALESCE(cs.semester, '')) IN (${Prisma.join(termAliases)})
        AND LOWER(COALESCE(cs.status, 'active')) = 'active'
        AND LOWER(COALESCE(s.status, 'active')) = 'active'
        AND cs.curriculum_course_id IN (${Prisma.join(courseIds)})
    `,
  ]);

  const enrolledSet = new Set(
    enrolledRows.map((item) => Number(item.curriculum_course_id)).filter(Number.isFinite),
  );
  const pendingSet = new Set(
    pendingRows.map((item) => Number(item.curriculum_course_id)).filter(Number.isFinite),
  );
  const openSet = new Set(
    openRows.map((item) => Number(item.curriculum_course_id)).filter(Number.isFinite),
  );

  const subjectIds = Array.from(
    new Set(
      curriculumCourses
        .map((item) => item.subject_id)
        .filter((value): value is number => Number.isFinite(Number(value))),
    ),
  );

  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, code: true, name: true },
      })
    : [];
  const subjectById = new Map(subjects.map((item) => [item.id, item]));

  const candidates = curriculumCourses
    .filter((course) => {
      if (enrolledSet.has(course.id) || pendingSet.has(course.id)) {
        return false;
      }
      const isLastSemesterSubject = Number(course.semester) !== args.semester;
      const isCurrentButNotOpen =
        Number(course.semester) === args.semester && !openSet.has(course.id);
      return isLastSemesterSubject || isCurrentButNotOpen;
    })
    .map((course) => {
      const subject = course.subject_id ? subjectById.get(course.subject_id) : null;
      const isLastSemesterSubject = Number(course.semester) !== args.semester;
      return {
        curriculumCourseId: course.id,
        subjectId: course.subject_id || null,
        courseCode: course.course_code || subject?.code || null,
        descriptiveTitle: course.descriptive_title || subject?.name || null,
        unitsTotal: course.units_total || 0,
        yearLevel: course.year_level || null,
        subjectSemester: course.semester || null,
        petitionType: isLastSemesterSubject ? "last_semester" : "not_open",
      };
    });

  return {
    enrollment,
    candidates,
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensurePetitionSubjectRequestsTable();

    const scope = await getSessionScope();
    const roleContext = await getRoleContext(scope?.roleId || 0);

    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canSubmitPetition(roleContext)) {
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
      semesterParam === "1" || semesterParam === "2" || semesterParam === "3"
        ? Number(semesterParam)
        : currentTerm.semester === "First"
          ? 1
          : currentTerm.semester === "Second"
            ? 2
            : 3;
    const academicYear = academicYearParam || currentTerm.academicYear;

    if (!studentNumber) {
      return NextResponse.json(
        { error: "studentNumber is required." },
        { status: 400 },
      );
    }

    const access = await ensureDeanStudentAccess(scope, {
      studentNumber,
      academicYear,
      semester: semesterNum,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access });
    }

    const requests = await prisma.$queryRaw<any[]>`
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
        COALESCE(cc.course_code, sub.code) AS course_code,
        COALESCE(cc.descriptive_title, sub.name) AS descriptive_title
      FROM student_petition_subject_requests psr
      LEFT JOIN curriculum_course cc ON cc.id = psr.curriculum_course_id
      LEFT JOIN subject sub ON sub.id = psr.subject_id
      WHERE psr.student_number = ${studentNumber}
        AND psr.academic_year = ${academicYear}
        AND psr.semester = ${semesterNum}
        AND (${status}::text = 'all' OR psr.status = ${status})
      ORDER BY psr.requested_at DESC NULLS LAST, psr.id DESC
    `;

    const { candidates } = await getPetitionCandidates({
      studentNumber,
      academicYear,
      semester: semesterNum,
    });
    const minimumRequiredStudents = await getMinimumPetitionStudents();

    return NextResponse.json({
      success: true,
      data: {
        minimumRequiredStudents,
        requests: requests.map((item) => ({
          id: item.id,
          studentNumber: item.student_number,
          academicYear: item.academic_year,
          semester: item.semester,
          curriculumCourseId: item.curriculum_course_id,
          subjectId: item.subject_id,
          requestedSubjectSemester: item.requested_subject_semester,
          requestedSubjectYearLevel: item.requested_subject_year_level,
          unitsTotal: item.units_total,
          reason: item.reason,
          petitionType: item.petition_type,
          status: item.status,
          requestedAt: item.requested_at,
          approvedAt: item.approved_at,
          courseCode: item.course_code,
          descriptiveTitle: item.descriptive_title,
        })),
        candidates,
      },
    });
  } catch (error: any) {
    console.error("Error fetching petition subject requests:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch petition subject requests." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensurePetitionSubjectRequestsTable();

    const session = await getServerSession(authOptions);
    const scope = await getSessionScope();
    const userRole = Number((session?.user as any)?.role) || 0;
    const userId = Number((session?.user as any)?.id) || null;
    const roleContext = await getRoleContext(userRole);

    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canSubmitPetition(roleContext)) {
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
    const curriculumCourseId = Number(body?.curriculumCourseId);
    const academicYear = String(body?.academicYear || "").trim();
    const semester = Number(body?.semester);
    const reason = String(body?.reason || "").trim();

    if (
      !studentNumber ||
      !Number.isFinite(curriculumCourseId) ||
      !academicYear ||
      !Number.isFinite(semester)
    ) {
      return NextResponse.json(
        {
          error:
            "studentNumber, curriculumCourseId, academicYear, and semester are required.",
        },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required for petition subject requests." },
        { status: 400 },
      );
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
            "Petition subject requests can only be submitted for the current academic term.",
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

    const { enrollment, candidates } = await getPetitionCandidates({
      studentNumber,
      academicYear,
      semester,
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const selectedCandidate = candidates.find(
      (candidate) => Number(candidate.curriculumCourseId) === curriculumCourseId,
    );

    if (!selectedCandidate) {
      return NextResponse.json(
        {
          error:
            "Selected subject is not eligible for petition (must be last-semester subject or currently not open).",
        },
        { status: 400 },
      );
    }

    const homeProgramId = await resolveProgramId(enrollment.course_program);
    const existingPending = await prisma.$queryRaw<any[]>`
      SELECT id
      FROM student_petition_subject_requests
      WHERE student_number = ${studentNumber}
        AND academic_year = ${academicYear}
        AND semester = ${semester}
        AND curriculum_course_id = ${curriculumCourseId}
        AND status = 'pending_approval'
      LIMIT 1
    `;
    if (existingPending.length > 0) {
      return NextResponse.json(
        { error: "A pending petition request already exists for this subject." },
        { status: 409 },
      );
    }

    const minimumRequiredStudents = await getMinimumPetitionStudents();
    const demandRows = await prisma.$queryRaw<{ demand_count: bigint }[]>`
      SELECT COUNT(DISTINCT student_number)::bigint AS demand_count
      FROM student_petition_subject_requests
      WHERE academic_year = ${academicYear}
        AND semester = ${semester}
        AND curriculum_course_id = ${curriculumCourseId}
        AND LOWER(COALESCE(status, '')) IN ('pending_approval', 'approved')
    `;
    const currentDemand = Number(demandRows[0]?.demand_count || 0);
    const projectedDemand = currentDemand + 1;

    const autoApprove = shouldAutoApprovePetition(roleContext);
    const canAutoApprove = autoApprove && projectedDemand >= minimumRequiredStudents;
    const requestStatus = canAutoApprove ? "approved" : "pending_approval";

    const insertedRows = await prisma.$transaction(async (tx) => {
      const insertedRequest = await tx.$queryRaw<any[]>`
        INSERT INTO student_petition_subject_requests (
          student_number,
          home_program_id,
          home_major_id,
          curriculum_course_id,
          subject_id,
          academic_year,
          semester,
          requested_subject_semester,
          requested_subject_year_level,
          units_total,
          reason,
          petition_type,
          status,
          requested_by,
          approved_by,
          approved_at
        )
        VALUES (
          ${studentNumber},
          ${homeProgramId},
          ${enrollment.major_id ?? null},
          ${curriculumCourseId},
          ${selectedCandidate.subjectId ?? null},
          ${academicYear},
          ${semester},
          ${selectedCandidate.subjectSemester ?? null},
          ${selectedCandidate.yearLevel ?? null},
          ${selectedCandidate.unitsTotal ?? 0},
          ${reason},
          ${selectedCandidate.petitionType},
          ${requestStatus},
          ${userId},
          ${canAutoApprove ? userId : null},
          ${canAutoApprove ? new Date() : null}
        )
        RETURNING id
      `;

      if (canAutoApprove) {
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
            ${selectedCandidate.subjectId ?? null},
            ${academicYear},
            ${semester},
            ${termLabelFromSemester(semester)},
            ${selectedCandidate.yearLevel ?? null},
            ${selectedCandidate.unitsTotal ?? 0},
            'enrolled',
            'none',
            NOW()
          )
          ON CONFLICT DO NOTHING
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
      message: canAutoApprove
        ? "Petition subject approved and added successfully."
        : `Petition subject request submitted for approval. Needs at least ${minimumRequiredStudents} students requesting the same subject (current demand: ${projectedDemand}).`,
      status: requestStatus,
      minimumRequiredStudents,
      currentDemand: projectedDemand,
    });
  } catch (error: any) {
    console.error("Error creating petition subject request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create petition subject request." },
      { status: 500 },
    );
  }
}
