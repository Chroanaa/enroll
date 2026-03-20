import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAcademicTerm } from "../../../../utils/academicTermUtils";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";

const CHECK_STATUS_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.REGISTRAR,
  ROLES.CASHIER,
  ROLES.FACULTY,
  ROLES.DEAN,
];

/**
 * GET /api/auth/students/check-status
 * Check if a student is resident/returnee or new student
 *
 * Query parameters:
 * - studentNumber: Student number (required)
 *
 * Returns:
 * - isResidentReturnee: boolean - true if student is transferee or has previous enrolled subjects
 * - admissionStatus: string - admission status from enrollment record
 * - hasEnrolledSubjects: boolean - whether student has previous enrolled subjects
 */
export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, CHECK_STATUS_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const studentNumber = searchParams.get("studentNumber");

    if (!studentNumber) {
      return NextResponse.json(
        { error: "studentNumber is required" },
        { status: 400 },
      );
    }

    // Get current academic term to exclude from previous subjects check
    const serverTimeResult = await prisma.$queryRaw<
      [{ now: Date }]
    >`SELECT NOW() as now`;
    const serverTime = serverTimeResult[0].now;
    const currentTerm = getAcademicTerm(serverTime);

    // Map semester name to number: "First" = 1, "Second" = 2, "Summer" = 2 (same as Second)
    // Note: enrolled_subjects table only stores 1 or 2, so Summer is treated as 2
    const currentSemesterNum = currentTerm.semester === "First" ? 1 : 2;

    // Check enrollment table for admission_status
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_number: studentNumber,
        ...(scope.isDean && scope.deanDepartmentId
          ? { department: scope.deanDepartmentId }
          : {}),
      },
      orderBy: {
        admission_date: "desc",
      },
      select: {
        id: true,
        admission_date: true,
        admission_status: true,
        academic_year: true,
        term: true,
      },
    });

    // Check if student has enrolled subjects from PREVIOUS terms only
    // Exclude the current term to avoid marking new students as returnee
    const enrolledSubjectsCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM enrolled_subjects
      WHERE student_number = ${studentNumber}
        AND NOT (
          academic_year = ${currentTerm.academicYear} 
          AND semester = ${currentSemesterNum}
        )
    `;

    const hasEnrolledSubjects = enrolledSubjectsCount[0]?.count > 0;

    // Determine if student is resident/returnee
    // A student is considered resident/returnee if:
    // 1. Their admission_status is "transferee" (or other non-new status), OR
    // 2. They have previous enrolled subjects
    const admissionStatus = enrollment?.admission_status?.toLowerCase() || null;
    const isTransferee =
      admissionStatus === "transferee" ||
      admissionStatus === "returnee" ||
      admissionStatus === "resident";

    const isResidentReturnee = isTransferee || hasEnrolledSubjects;

    return NextResponse.json({
      success: true,
      data: {
        isResidentReturnee,
        admissionStatus: enrollment?.admission_status || null,
        hasEnrolledSubjects,
        enrollmentDate: enrollment?.admission_date || null,
        academicYear: enrollment?.academic_year || null,
        term: enrollment?.term || null,
      },
    });
  } catch (error: any) {
    console.error("Error checking student status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check student status" },
      { status: 500 },
    );
  }
}
