import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/auth/assessment/enrollments-summary
 * 
 * Fetch financial summaries for all students with assessments
 * Used by Payment & Billing Management - Enrollments Tab
 * 
 * Query Parameters:
 * - academic_year: Academic year e.g., "2025-2026" (required)
 * - semester: Semester number (1 or 2) (required)
 * - search: Search by student number or name (optional)
 * 
 * Returns array of student financial summaries with:
 * - assessment_id
 * - student_number
 * - student_name
 * - course_program
 * - year_level
 * - academic_year
 * - semester
 * - payment_mode
 * - total_due
 * - total_paid
 * - remaining_balance
 * - payment_status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academic_year");
    const semester = searchParams.get("semester");
    const search = searchParams.get("search") || "";

    // Validate required parameters
    if (!academicYear || !semester) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          message: "academic_year and semester are required",
        },
        { status: 400 }
      );
    }

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || (semesterNum !== 1 && semesterNum !== 2)) {
      return NextResponse.json(
        {
          error: "Invalid semester",
          message: "Semester must be 1 or 2",
        },
        { status: 400 }
      );
    }

    // Build where clause for assessments
    const whereClause: any = {
      academic_year: academicYear,
      semester: semesterNum,
      status: "finalized", // Only fetch finalized assessments
    };

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { student_number: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch all finalized assessments with related data
    const assessments = await prisma.student_assessment.findMany({
      where: whereClause,
      include: {
        payments: {
          select: {
            amount_paid: true,
          },
        },
      },
      orderBy: {
        student_number: "asc",
      },
    });

    // Get unique student numbers to fetch enrollment data
    const studentNumbers = assessments.map((a) => a.student_number);

    // Fetch enrollment data for student names and programs
    const enrollments = await prisma.enrollment.findMany({
      where: {
        student_number: { in: studentNumbers },
      },
      select: {
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
        year_level: true,
      },
    });

    // Create a map of student_number to enrollment data
    const enrollmentMap = new Map(
      enrollments.map((e) => [e.student_number, e])
    );

    // Get unique program IDs to fetch program names
    const programIds = [
      ...new Set(
        enrollments
          .map((e) => e.course_program)
          .filter((p) => p !== null && p !== undefined && p !== "")
          .map((p) => parseInt(p))
          .filter((p) => !isNaN(p))
      ),
    ];

    // Fetch program data
    const programs = await prisma.program.findMany({
      where: { id: { in: programIds } },
      select: { id: true, code: true, name: true },
    });

    const programMap = new Map(programs.map((p) => [p.id, p]));

    // Build response data
    const summaries = assessments.map((assessment) => {
      const enrollment = enrollmentMap.get(assessment.student_number);
      
      // Calculate student name
      const studentName = enrollment
        ? `${enrollment.family_name}, ${enrollment.first_name}${enrollment.middle_name ? " " + enrollment.middle_name : ""}`
        : "Unknown Student";

      // Get program display
      let programDisplay = "N/A";
      if (enrollment?.course_program) {
        const programId = parseInt(enrollment.course_program);
        if (!isNaN(programId)) {
          const program = programMap.get(programId);
          if (program) {
            programDisplay = program.code;
          }
        }
      }

      // Determine total_due based on payment mode
      const totalDue =
        assessment.payment_mode.toLowerCase() === "installment"
          ? assessment.total_due_installment
            ? Number(assessment.total_due_installment)
            : Number(assessment.base_total)
          : assessment.total_due_cash
            ? Number(assessment.total_due_cash)
            : Number(assessment.base_total);

      // Calculate total paid
      const totalPaid = assessment.payments.reduce(
        (sum, payment) => sum + Number(payment.amount_paid),
        0
      );

      // Calculate remaining balance
      const remainingBalance = Math.max(0, totalDue - totalPaid);

      // Determine payment status
      let paymentStatus: "Unpaid" | "Partial" | "Fully Paid";
      if (totalPaid === 0) {
        paymentStatus = "Unpaid";
      } else if (totalPaid < totalDue) {
        paymentStatus = "Partial";
      } else {
        paymentStatus = "Fully Paid";
      }

      // Round to 2 decimals
      const round = (value: number) => Math.round(value * 100) / 100;

      return {
        assessment_id: assessment.id,
        student_number: assessment.student_number,
        student_name: studentName,
        course_program: programDisplay,
        year_level: enrollment?.year_level || null,
        academic_year: assessment.academic_year,
        semester: assessment.semester,
        payment_mode: assessment.payment_mode,
        total_due: round(totalDue),
        total_paid: round(totalPaid),
        remaining_balance: round(remainingBalance),
        payment_status: paymentStatus,
      };
    });

    // Apply name search filter if provided (after building summaries)
    let filteredSummaries = summaries;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSummaries = summaries.filter(
        (s) =>
          s.student_number.toLowerCase().includes(searchLower) ||
          s.student_name.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: filteredSummaries,
        total: filteredSummaries.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching enrollments summary:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Failed to fetch enrollments summary",
      },
      { status: 500 }
    );
  }
}
