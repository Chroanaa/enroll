import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";

const ASSESSMENT_SUMMARY_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.CASHIER,
  ROLES.REGISTRAR,
  ROLES.DEAN,
];

function convertSemesterToInt(semester: string | number): number {
  if (typeof semester === "number") return semester;
  const s = semester.toLowerCase();
  if (s === "first" || s === "1st") return 1;
  if (s === "second" || s === "2nd") return 2;
  return parseInt(semester) || 1;
}

function enrollmentTermValues(semesterInt: number): string[] {
  if (semesterInt === 1) {
    return ["First Semester", "1st Semester", "first", "1"];
  }

  if (semesterInt === 2) {
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

    if (!isRoleAllowed(scope.roleId, ASSESSMENT_SUMMARY_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const search = (searchParams.get("search") || "").trim();
    const statusFilter = searchParams.get("status");
    const programIdFilter = searchParams.get("programId");
    const yearLevelFilter = searchParams.get("yearLevel");
    const assessmentStatusFilter = searchParams.get("assessmentStatus");
    const includeNotAssessed = searchParams.get("includeNotAssessed") === "true";

    if (!academicYear || !semester) {
      return NextResponse.json(
        { error: "Academic year and semester are required" },
        { status: 400 },
      );
    }

    const semesterInt = convertSemesterToInt(semester);
    const hasEnrollmentFilters = !!(programIdFilter || yearLevelFilter || search);

    const enrollmentWhere: any = {};
    enrollmentWhere.academic_year = academicYear;
    enrollmentWhere.term = { in: enrollmentTermValues(semesterInt) };
    enrollmentWhere.verification_status = "approved";
    if (scope.isDean && scope.deanDepartmentId) {
      enrollmentWhere.department = scope.deanDepartmentId;
    }

    if (programIdFilter) {
      const parts = programIdFilter.split("-");
      enrollmentWhere.course_program = parts[0];
      const mId = parts[1] ? parseInt(parts[1]) : null;
      if (mId !== null && !isNaN(mId)) enrollmentWhere.major_id = mId;
    }
    if (yearLevelFilter) {
      const yl = parseInt(yearLevelFilter);
      if (!isNaN(yl)) enrollmentWhere.year_level = yl;
    }
    if (search) {
      enrollmentWhere.OR = [
        { student_number: { contains: search, mode: "insensitive" } },
        { first_name: { contains: search, mode: "insensitive" } },
        { family_name: { contains: search, mode: "insensitive" } },
      ];
    }

    const enrollmentSelect = {
      student_number: true,
      first_name: true,
      middle_name: true,
      family_name: true,
      course_program: true,
      major_id: true,
      year_level: true,
    };
    const assessmentSelect = {
      id: true,
      student_number: true,
      academic_year: true,
      semester: true,
      payment_mode: true,
      total_due: true,
      total_due_cash: true,
      total_due_installment: true,
    };
    const assessmentWhere: any = {
      academic_year: academicYear,
      semester: semesterInt,
    };

    let enrollments: any[];
    let assessments: any[];

    if (hasEnrollmentFilters) {
      const [enr, programs, majors] = await Promise.all([
        prisma.enrollment.findMany({
          where: enrollmentWhere,
          select: enrollmentSelect,
          distinct: ["student_number"],
        }),
        prisma.program.findMany({ select: { id: true, code: true, name: true } }),
        prisma.major.findMany({ select: { id: true, name: true, program_id: true } }),
      ]);
      enrollments = enr;
      const studentNumbers = enrollments
        .map((e) => e.student_number)
        .filter((n): n is string => n != null);
      assessmentWhere.student_number = { in: studentNumbers };
      const [asmts, payGroups] = await Promise.all([
        prisma.student_assessment.findMany({
          where: assessmentWhere,
          select: assessmentSelect,
          orderBy: { student_number: "asc" },
        }),
        prisma.student_payment.groupBy({
          by: ["assessment_id"],
          where: { assessment: { academic_year: academicYear, semester: semesterInt } },
          _sum: { amount_paid: true },
        }),
      ]);
      assessments = asmts;
      return buildResponse(
        enrollments, assessments, payGroups, programs, majors,
        assessmentStatusFilter, statusFilter, includeNotAssessed, academicYear, semesterInt,
      );
    } else {
      const [enr, asmts, programs, majors, payGroups] = await Promise.all([
        prisma.enrollment.findMany({
          where: enrollmentWhere,
          select: enrollmentSelect,
          distinct: ["student_number"],
        }),
        prisma.student_assessment.findMany({
          where: assessmentWhere,
          select: assessmentSelect,
          orderBy: { student_number: "asc" },
        }),
        prisma.program.findMany({ select: { id: true, code: true, name: true } }),
        prisma.major.findMany({ select: { id: true, name: true, program_id: true } }),
        prisma.student_payment.groupBy({
          by: ["assessment_id"],
          where: { assessment: { academic_year: academicYear, semester: semesterInt } },
          _sum: { amount_paid: true },
        }),
      ]);
      enrollments = enr;
      assessments = asmts;
      return buildResponse(
        enrollments, assessments, payGroups, programs, majors,
        assessmentStatusFilter, statusFilter, includeNotAssessed, academicYear, semesterInt,
      );
    }
  } catch (error) {
    console.error("Error fetching assessment summaries:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function buildResponse(
  enrollments: any[],
  assessments: any[],
  payGroups: { assessment_id: number; _sum: { amount_paid: any } }[],
  programs: { id: number; code: string; name: string }[],
  majors: { id: number; name: string; program_id: number }[],
  assessmentStatusFilter: string | null,
  statusFilter: string | null,
  includeNotAssessed: boolean,
  academicYear: string,
  semesterInt: number,
): NextResponse {
  const programMap = new Map(programs.map((p) => [p.id, p]));
  const majorMap = new Map(majors.map((m) => [m.id, m]));
  const enrollmentMap = new Map(
    enrollments
      .filter((e) => e.student_number != null)
      .map((e) => [e.student_number as string, e]),
  );
  const paymentSumMap = new Map(
    payGroups.map((p) => [p.assessment_id, Number(p._sum.amount_paid) || 0]),
  );
  const assessedNumbers = new Set(assessments.map((a) => a.student_number));

  function buildProgramDisplay(
    courseProgram: string | null | undefined,
    majorId: number | null | undefined,
  ): string | null {
    if (!courseProgram) return null;
    const pid = parseInt(courseProgram);
    if (isNaN(pid)) return null;
    const program = programMap.get(pid);
    if (!program) return null;
    if (majorId) {
      const major = majorMap.get(majorId);
      return major ? `${program.code} - ${major.name}` : program.code;
    }
    return program.code;
  }

  function buildName(e: any, fallback: string): string {
    return (
      [e.first_name, e.middle_name, e.family_name].filter(Boolean).join(" ") ||
      fallback
    );
  }

  const assessedSummaries = assessments
    .filter((a) => enrollmentMap.has(a.student_number))
    .map((a) => {
      const enrollment = enrollmentMap.get(a.student_number)!;
      let totalDue = Number(a.total_due) || 0;
      if (a.payment_mode === "cash" && a.total_due_cash) {
        totalDue = Number(a.total_due_cash);
      } else if (a.payment_mode === "installment" && a.total_due_installment) {
        totalDue = Number(a.total_due_installment);
      }
      const totalPaid = paymentSumMap.get(a.id) ?? 0;
      const remainingBalance = Math.max(0, totalDue - totalPaid);
      let paymentStatus: "Unpaid" | "Partial" | "Fully Paid" = "Unpaid";
      if (totalPaid >= totalDue && totalDue > 0) paymentStatus = "Fully Paid";
      else if (totalPaid > 0) paymentStatus = "Partial";
      return {
        assessment_id: a.id,
        student_number: a.student_number,
        student_name: buildName(enrollment, a.student_number),
        first_name: enrollment.first_name,
        middle_name: enrollment.middle_name,
        family_name: enrollment.family_name,
        course_program: buildProgramDisplay(enrollment.course_program, enrollment.major_id),
        year_level: enrollment.year_level ?? null,
        academic_year: a.academic_year,
        semester: a.semester,
        payment_mode: a.payment_mode,
        total_due: totalDue,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        payment_status: paymentStatus,
        has_assessment: true,
      };
    });

  const notAssessedSummaries: any[] = [];
  if (includeNotAssessed) {
    for (const enrollment of enrollments) {
      if (!enrollment.student_number) continue;
      if (assessedNumbers.has(enrollment.student_number)) continue;
      notAssessedSummaries.push({
        assessment_id: null,
        student_number: enrollment.student_number,
        student_name: buildName(enrollment, enrollment.student_number),
        first_name: enrollment.first_name,
        middle_name: enrollment.middle_name,
        family_name: enrollment.family_name,
        course_program: buildProgramDisplay(enrollment.course_program, enrollment.major_id),
        year_level: enrollment.year_level ?? null,
        academic_year: academicYear,
        semester: semesterInt,
        payment_mode: null,
        total_due: 0,
        total_paid: 0,
        remaining_balance: 0,
        payment_status: "Unpaid",
        has_assessment: false,
      });
    }
  }

  let summaries: any[];
  if (assessmentStatusFilter === "assessed") summaries = assessedSummaries;
  else if (assessmentStatusFilter === "not_assessed") summaries = notAssessedSummaries;
  else summaries = [...assessedSummaries, ...notAssessedSummaries];

  if (statusFilter) {
    summaries = summaries.filter((s) => s.payment_status === statusFilter);
  }
  summaries.sort((a, b) =>
    (a.student_number ?? "").localeCompare(b.student_number ?? ""),
  );
  return NextResponse.json({ success: true, data: summaries, total: summaries.length });
}
