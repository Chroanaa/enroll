import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getAcademicTerm } from "@/app/utils/academicTermUtils";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";

const ALLOWED_ROLES = [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN];

type ReportRow = {
  id: number;
  student_number: string;
  student_name: string | null;
  course_code: string | null;
  descriptive_title: string | null;
  units_total: number | null;
  status: string | null;
  dropped_at: Date | string | null;
  drop_reason: string | null;
  refundable: boolean | null;
  academic_year: string;
  semester: number;
  year_level: number | null;
  program_id: number | null;
  program_code: string | null;
  program_name: string | null;
  major_id: number | null;
  major_name: string | null;
  department_id: number | null;
  department_name: string | null;
};

function getSemesterNumber(value: string | null): number | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "first") return 1;
  if (normalized === "2" || normalized === "second") return 2;
  return null;
}

function getSemesterAliases(semester: number): string[] {
  if (semester === 1) {
    return ["first", "first semester", "1", "1st semester"];
  }

  return ["second", "second semester", "2", "2nd semester"];
}

function normalizeStatus(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "pending_approval") return "Pending Approval";
  if (normalized === "dropped") return "Dropped";
  if (normalized) {
    return normalized
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return "Unknown";
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const serverTimeResult =
      await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
    const serverNow = serverTimeResult[0]?.now || new Date();
    const detectedTerm = getAcademicTerm(serverNow);

    const academicYear =
      searchParams.get("academicYear") || detectedTerm.academicYear;
    const semester =
      getSemesterNumber(searchParams.get("semester")) ||
      (detectedTerm.semester === "First" ? 1 : 2);
    const departmentIdParam = searchParams.get("departmentId");
    const programIdParam = searchParams.get("programId");
    const majorIdParam = searchParams.get("majorId");
    const yearLevelParam = searchParams.get("yearLevel");

    const departmentId = departmentIdParam
      ? Number.parseInt(departmentIdParam, 10)
      : null;
    const programId = programIdParam ? Number.parseInt(programIdParam, 10) : null;
    const majorId = majorIdParam ? Number.parseInt(majorIdParam, 10) : null;
    const yearLevel = yearLevelParam
      ? Number.parseInt(yearLevelParam, 10)
      : null;

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year is required." },
        { status: 400 },
      );
    }

    if (semester !== 1 && semester !== 2) {
      return NextResponse.json(
        { error: "Semester must be 1 or 2." },
        { status: 400 },
      );
    }

    const termAliasClause =
      semester === 1
        ? Prisma.sql`AND LOWER(COALESCE(e.term, '')) IN ('first', 'first semester', '1', '1st semester')`
        : Prisma.sql`AND LOWER(COALESCE(e.term, '')) IN ('second', 'second semester', '2', '2nd semester')`;

    const deanDepartmentClause =
      scope.isDean && scope.deanDepartmentId
        ? Prisma.sql`AND COALESCE(enrollment_scope.department, p.department_id) = ${scope.deanDepartmentId}`
        : Prisma.empty;

    const departmentClause =
      departmentId && Number.isFinite(departmentId)
        ? Prisma.sql`AND COALESCE(enrollment_scope.department, p.department_id) = ${departmentId}`
        : Prisma.empty;

    const programClause =
      programId && Number.isFinite(programId)
        ? Prisma.sql`AND sdh.program_id = ${programId}`
        : Prisma.empty;

    const majorClause =
      majorId && Number.isFinite(majorId)
        ? Prisma.sql`AND enrollment_scope.major_id = ${majorId}`
        : Prisma.empty;

    const yearLevelClause =
      yearLevel && Number.isFinite(yearLevel)
        ? Prisma.sql`AND COALESCE(sdh.year_level, enrollment_scope.year_level) = ${yearLevel}`
        : Prisma.empty;

    const rows = await prisma.$queryRaw<ReportRow[]>`
      SELECT
        sdh.id,
        sdh.student_number,
        NULLIF(TRIM(
          CONCAT(
            COALESCE(enrollment_scope.family_name, ''),
            CASE WHEN COALESCE(enrollment_scope.family_name, '') <> '' AND COALESCE(enrollment_scope.first_name, '') <> '' THEN ', ' ELSE '' END,
            COALESCE(enrollment_scope.first_name, ''),
            CASE WHEN COALESCE(enrollment_scope.middle_name, '') <> '' THEN CONCAT(' ', enrollment_scope.middle_name) ELSE '' END
          )
        ), '') AS student_name,
        sdh.course_code,
        sdh.descriptive_title,
        sdh.units_total,
        sdh.status,
        sdh.dropped_at,
        sdh.drop_reason,
        sdh.refundable,
        sdh.academic_year,
        sdh.semester,
        COALESCE(sdh.year_level, enrollment_scope.year_level) AS year_level,
        sdh.program_id,
        p.code AS program_code,
        p.name AS program_name,
        enrollment_scope.major_id,
        m.name AS major_name,
        COALESCE(enrollment_scope.department, p.department_id) AS department_id,
        d.name AS department_name
      FROM subject_drop_history sdh
      LEFT JOIN program p ON p.id = sdh.program_id
      LEFT JOIN LATERAL (
        SELECT
          e.department,
          e.major_id,
          e.year_level,
          e.family_name,
          e.first_name,
          e.middle_name
        FROM enrollment e
        WHERE e.student_number = sdh.student_number
          AND e.academic_year = sdh.academic_year
          ${termAliasClause}
        ORDER BY e.id DESC
        LIMIT 1
      ) AS enrollment_scope ON true
      LEFT JOIN major m ON m.id = enrollment_scope.major_id
      LEFT JOIN department d ON d.id = COALESCE(enrollment_scope.department, p.department_id)
      WHERE sdh.academic_year = ${academicYear}
        AND sdh.semester = ${semester}
        ${deanDepartmentClause}
        ${departmentClause}
        ${programClause}
        ${majorClause}
        ${yearLevelClause}
      ORDER BY sdh.dropped_at DESC NULLS LAST, sdh.id DESC
    `;

    const mappedRows = rows.map((row) => ({
      id: Number(row.id),
      studentNumber: row.student_number,
      studentName: row.student_name || row.student_number,
      courseCode: row.course_code || "N/A",
      descriptiveTitle: row.descriptive_title || "N/A",
      unitsTotal: row.units_total != null ? Number(row.units_total) : 0,
      status: normalizeStatus(row.status),
      droppedAt: row.dropped_at ? new Date(row.dropped_at).toISOString() : null,
      dropReason: row.drop_reason || "",
      refundable: Boolean(row.refundable),
      academicYear: row.academic_year,
      semester: Number(row.semester),
      yearLevel: row.year_level != null ? Number(row.year_level) : null,
      programId: row.program_id != null ? Number(row.program_id) : null,
      programCode: row.program_code || null,
      programName: row.program_name || null,
      majorId: row.major_id != null ? Number(row.major_id) : null,
      majorName: row.major_name || null,
      departmentId: row.department_id != null ? Number(row.department_id) : null,
      departmentName: row.department_name || null,
    }));

    const totalDropRequests = mappedRows.length;
    const uniqueStudents = new Set(mappedRows.map((row) => row.studentNumber)).size;
    const totalUnitsDropped = mappedRows.reduce(
      (sum, row) => sum + Number(row.unitsTotal || 0),
      0,
    );
    const refundableCount = mappedRows.filter((row) => row.refundable).length;
    const pendingCount = mappedRows.filter(
      (row) => row.status === "Pending Approval",
    ).length;
    const completedCount = mappedRows.filter(
      (row) => row.status === "Dropped",
    ).length;

    const subjectMap = new Map<
      string,
      {
        courseCode: string;
        descriptiveTitle: string;
        dropCount: number;
        uniqueStudents: Set<string>;
        totalUnits: number;
      }
    >();

    for (const row of mappedRows) {
      const key = `${row.courseCode}|||${row.descriptiveTitle}`;
      const existing =
        subjectMap.get(key) ||
        {
          courseCode: row.courseCode,
          descriptiveTitle: row.descriptiveTitle,
          dropCount: 0,
          uniqueStudents: new Set<string>(),
          totalUnits: 0,
        };

      existing.dropCount += 1;
      existing.uniqueStudents.add(row.studentNumber);
      existing.totalUnits += Number(row.unitsTotal || 0);
      subjectMap.set(key, existing);
    }

    const mostDroppedSubjects = Array.from(subjectMap.values())
      .map((item) => ({
        courseCode: item.courseCode,
        descriptiveTitle: item.descriptiveTitle,
        dropCount: item.dropCount,
        uniqueStudents: item.uniqueStudents.size,
        totalUnits: item.totalUnits,
      }))
      .sort((a, b) => {
        if (b.dropCount !== a.dropCount) {
          return b.dropCount - a.dropCount;
        }
        return a.courseCode.localeCompare(b.courseCode);
      })
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      filters: {
        academicYear,
        semester,
        semesterLabel: semester === 1 ? "First Semester" : "Second Semester",
        departmentId,
        programId,
        majorId,
        yearLevel,
        currentAcademicYear: detectedTerm.academicYear,
        currentSemester: detectedTerm.semester === "First" ? 1 : 2,
      },
      summary: {
        totalDropRequests,
        uniqueStudents,
        totalUnitsDropped,
        refundableCount,
        pendingCount,
        completedCount,
      },
      analytics: {
        mostDroppedSubjects,
      },
      rows: mappedRows,
    });
  } catch (error: any) {
    console.error("Error generating subject drop report:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate subject drop report." },
      { status: 500 },
    );
  }
}
