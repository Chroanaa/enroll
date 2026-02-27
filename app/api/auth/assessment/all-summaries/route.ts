import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/auth/assessment/all-summaries
 *
 * Fetch all students who have finalized assessments along with their
 * payment summary (total due, total paid, remaining balance).
 *
 * Query Parameters (optional):
 * - academic_year: Filter by academic year
 * - semester: Filter by semester (1 or 2)
 * - search: Search by student number or name
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academic_year");
    const semester = searchParams.get("semester");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {
      status: "finalized",
    };

    if (academicYear) {
      where.academic_year = academicYear;
    }

    if (semester) {
      const semesterNum = parseInt(semester);
      if (!isNaN(semesterNum)) {
        where.semester = semesterNum;
      }
    }

    // Fetch all finalized assessments with payments
    const assessments = await prisma.student_assessment.findMany({
      where,
      include: {
        payments: true,
      },
      orderBy: { created_at: "desc" },
    });

    // For each assessment, get student info and compute summary
    const results = await Promise.all(
      assessments.map(async (assessment) => {
        // Fetch student info from enrollment table
        const enrollment = await prisma.enrollment.findFirst({
          where: { student_number: assessment.student_number },
          select: {
            id: true,
            first_name: true,
            middle_name: true,
            family_name: true,
            course_program: true,
            year_level: true,
          },
        });

        // Calculate totals
        const totalDue =
          assessment.payment_mode.toLowerCase() === "installment"
            ? assessment.total_due_installment
              ? Number(assessment.total_due_installment)
              : Number(assessment.total_due)
            : assessment.total_due_cash
              ? Number(assessment.total_due_cash)
              : Number(assessment.total_due);

        const totalPaid = assessment.payments.reduce(
          (sum, p) => sum + Number(p.amount_paid),
          0,
        );

        const remainingBalance = Math.max(0, totalDue - totalPaid);

        let paymentStatus: "Unpaid" | "Partial" | "Fully Paid";
        if (totalPaid === 0) {
          paymentStatus = "Unpaid";
        } else if (totalPaid < totalDue - 0.01) {
          paymentStatus = "Partial";
        } else {
          paymentStatus = "Fully Paid";
        }

        const studentName = enrollment
          ? `${enrollment.family_name || ""}, ${enrollment.first_name || ""} ${enrollment.middle_name || ""}`.trim()
          : assessment.student_number;

        return {
          assessment_id: assessment.id,
          student_number: assessment.student_number,
          student_name: studentName,
          course_program: enrollment?.course_program || null,
          year_level: enrollment?.year_level || null,
          academic_year: assessment.academic_year,
          semester: assessment.semester,
          payment_mode: assessment.payment_mode,
          total_due: Math.round(totalDue * 100) / 100,
          total_paid: Math.round(totalPaid * 100) / 100,
          remaining_balance: Math.round(remainingBalance * 100) / 100,
          payment_status: paymentStatus,
        };
      }),
    );

    // Apply search filter if provided (after fetching because we need student names)
    let filtered = results;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = results.filter(
        (r) =>
          r.student_number.toLowerCase().includes(searchLower) ||
          r.student_name.toLowerCase().includes(searchLower) ||
          (r.course_program &&
            r.course_program.toLowerCase().includes(searchLower)),
      );
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    console.error("Error fetching all summaries:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Failed to fetch student summaries",
      },
      { status: 500 },
    );
  }
}
