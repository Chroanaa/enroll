import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";

const REFUND_REPORT_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.REGISTRAR,
  ROLES.CASHIER,
];

function getSemesterAliases(semester: number): string[] {
  if (semester === 1) {
    return ["First Semester", "1st Semester", "first", "1"];
  }
  if (semester === 2) {
    return ["Second Semester", "2nd Semester", "second", "2"];
  }
  return ["Summer", "summer", "3"];
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, REFUND_REPORT_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const academicYear = String(searchParams.get("academicYear") || "").trim();
    const semester = Number(searchParams.get("semester"));
    const departmentId = Number(searchParams.get("departmentId") || "");
    const programId = Number(searchParams.get("programId") || "");
    const majorId = Number(searchParams.get("majorId") || "");
    const yearLevel = Number(searchParams.get("yearLevel") || "");

    if (!academicYear || !Number.isFinite(semester)) {
      return NextResponse.json(
        { error: "Academic year and semester are required." },
        { status: 400 },
      );
    }

    const semesterAliases = getSemesterAliases(semester);

    const departmentClause =
      Number.isFinite(departmentId) && departmentId > 0
        ? Prisma.sql`AND enr.department = ${departmentId}`
        : Prisma.empty;
    const programClause =
      Number.isFinite(programId) && programId > 0
        ? Prisma.sql`AND (
            enr.course_program = ${String(programId)}
            OR prog.id = ${programId}
          )`
        : Prisma.empty;
    const majorClause =
      Number.isFinite(majorId) && majorId > 0
        ? Prisma.sql`AND enr.major_id = ${majorId}`
        : Prisma.empty;
    const yearClause =
      Number.isFinite(yearLevel) && yearLevel > 0
        ? Prisma.sql`AND enr.year_level = ${yearLevel}`
        : Prisma.empty;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        rt.id,
        rt.student_number,
        COALESCE(
          NULLIF(
            TRIM(
              CASE
                WHEN enr.family_name IS NOT NULL AND TRIM(enr.family_name) <> ''
                  THEN CONCAT(
                    enr.family_name,
                    ', ',
                    TRIM(CONCAT_WS(' ', enr.first_name, enr.middle_name))
                  )
                ELSE TRIM(CONCAT_WS(' ', enr.first_name, enr.middle_name))
              END
            ),
            ''
          ),
          rt.student_number
        ) AS student_name,
        rt.academic_year,
        rt.semester,
        rt.course_code,
        rt.descriptive_title,
        rt.refund_amount,
        rt.payout_amount,
        (COALESCE(rt.refund_amount, 0) - COALESCE(rt.payout_amount, 0)) AS adjustment_amount,
        rt.total_due_before,
        rt.total_due_after,
        rt.total_paid_before,
        rt.total_paid_after,
        rt.payment_mode,
        rt.drop_reason,
        rt.refund_reason,
        rt.processed_by_name,
        rt.processed_at,
        rt.reference_no,
        enr.department,
        dept.name AS department_name,
        enr.course_program,
        enr.major_id,
        enr.year_level,
        COALESCE(prog.code, enr.course_program) AS program_code,
        prog.name AS program_name,
        maj.name AS major_name
      FROM refund_transactions rt
      LEFT JOIN LATERAL (
        SELECT
          e.first_name,
          e.middle_name,
          e.family_name,
          e.department,
          e.course_program,
          e.major_id,
          e.year_level
        FROM enrollment e
        WHERE e.student_number = rt.student_number
          AND e.academic_year = rt.academic_year
          AND e.term IN (${semesterAliases[0]}, ${semesterAliases[1]}, ${semesterAliases[2]}, ${semesterAliases[3]})
        ORDER BY e.id DESC
        LIMIT 1
      ) enr ON TRUE
      LEFT JOIN department dept ON dept.id = enr.department
      LEFT JOIN program prog
        ON prog.id = CASE
          WHEN enr.course_program ~ '^[0-9]+$' THEN CAST(enr.course_program AS INTEGER)
          ELSE NULL
        END
        OR UPPER(COALESCE(prog.code, '')) = UPPER(COALESCE(enr.course_program, ''))
      LEFT JOIN major maj ON maj.id = enr.major_id
      WHERE rt.academic_year = ${academicYear}
        AND rt.semester = ${semester}
        ${scope.isDean && scope.deanDepartmentId
          ? Prisma.sql`AND enr.department = ${scope.deanDepartmentId}`
          : Prisma.empty}
        ${departmentClause}
        ${programClause}
        ${majorClause}
        ${yearClause}
      ORDER BY rt.processed_at DESC, rt.id DESC
    `;

    const mappedRows = rows.map((row) => ({
      id: row.id,
      studentNumber: row.student_number,
      studentName: row.student_name || row.student_number,
      academicYear: row.academic_year,
      semester: row.semester,
      courseCode: row.course_code || "",
      descriptiveTitle: row.descriptive_title || "",
      refundAmount: Number(row.refund_amount || 0),
      payoutAmount: Number(row.payout_amount || 0),
      adjustmentAmount: Number(row.adjustment_amount || 0),
      totalDueBefore: row.total_due_before != null ? Number(row.total_due_before) : null,
      totalDueAfter: row.total_due_after != null ? Number(row.total_due_after) : null,
      totalPaidBefore: row.total_paid_before != null ? Number(row.total_paid_before) : null,
      totalPaidAfter: row.total_paid_after != null ? Number(row.total_paid_after) : null,
      paymentMode: row.payment_mode || "",
      dropReason: row.drop_reason || "",
      refundReason: row.refund_reason || "",
      processedByName: row.processed_by_name || "",
      processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
      processedAtLabel: row.processed_at
        ? new Date(row.processed_at).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })
        : "N/A",
      referenceNo: row.reference_no || `ADJ-SDH-${row.id}`,
      departmentName: row.department_name || "N/A",
      programCode: row.program_code || "",
      programName: row.program_name || "",
      majorName: row.major_name || "",
      yearLevel: row.year_level ?? null,
      disposition:
        Number(row.payout_amount || 0) > 0 &&
        Number(row.adjustment_amount || 0) > 0
          ? "Adjustment + Cash Refund"
          : Number(row.payout_amount || 0) > 0
            ? "Cash Refund"
            : "Assessment Adjustment",
      status:
        Number(row.payout_amount || 0) > 0
          ? "Refunded"
          : "Adjusted",
    }));

    const summary = {
      totalRefunds: mappedRows.length,
      uniqueStudents: new Set(mappedRows.map((row) => row.studentNumber)).size,
      totalRefundAmount: mappedRows.reduce(
        (sum, row) => sum + row.refundAmount,
        0,
      ),
      totalCashPayout: mappedRows.reduce(
        (sum, row) => sum + row.payoutAmount,
        0,
      ),
      totalAdjustment: mappedRows.reduce(
        (sum, row) => sum + row.adjustmentAmount,
        0,
      ),
    };

    return NextResponse.json({
      success: true,
      rows: mappedRows,
      summary,
    });
  } catch (error: any) {
    console.error("Error generating refund report:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate refund report." },
      { status: 500 },
    );
  }
}
