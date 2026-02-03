import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/auth/assessment/financial-summary
 * 
 * Fetch complete financial information for a student by combining:
 * - Assessment Module (what is due)
 * - Payment Module (what is paid)
 * - Payment Schedule (installment breakdown with labels)
 * 
 * Query Parameters:
 * - student_number: Student number (required)
 * - academic_year: Academic year e.g., "2025-2026" (required)
 * - semester: Semester number (1 or 2) (required)
 * 
 * Returns unified financial summary with:
 * - Assessment summary (gross_tuition, discount, net_tuition, fees, etc.)
 * - Installment schedule (if payment_mode is INSTALLMENT)
 * - Payment summary (total_paid, remaining_balance, payment_status)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentNumber = searchParams.get("student_number");
    const academicYear = searchParams.get("academic_year");
    const semester = searchParams.get("semester");

    // Validate required parameters
    if (!studentNumber || !academicYear || !semester) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          message: "student_number, academic_year, and semester are required",
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

    // Fetch finalized assessment record
    const assessment = await prisma.student_assessment.findFirst({
      where: {
        student_number: studentNumber,
        academic_year: academicYear,
        semester: semesterNum,
        status: "finalized", // Only fetch finalized assessments
      },
      include: {
        payment_schedules: {
          orderBy: { due_date: "asc" },
        },
        payments: {
          orderBy: { payment_date: "asc" },
        },
      },
    });

    // If no finalized assessment exists, return error
    if (!assessment) {
      return NextResponse.json(
        {
          error: "Assessment not found",
          message: `No finalized assessment found for student ${studentNumber}, A.Y. ${academicYear}, Semester ${semesterNum}`,
        },
        { status: 404 }
      );
    }

    // Extract assessment summary
    const assessmentSummary = {
      gross_tuition: Number(assessment.gross_tuition),
      discount_amount: assessment.discount_amount ? Number(assessment.discount_amount) : 0,
      net_tuition: Number(assessment.net_tuition),
      total_fees: Number(assessment.total_fees),
      fixed_amount_total: assessment.fixed_amount_total ? Number(assessment.fixed_amount_total) : 0,
      base_total: Number(assessment.base_total),
      payment_mode: assessment.payment_mode,
      total_due_cash: assessment.total_due_cash ? Number(assessment.total_due_cash) : null,
      total_due_installment: assessment.total_due_installment ? Number(assessment.total_due_installment) : null,
      down_payment: assessment.down_payment ? Number(assessment.down_payment) : null,
      insurance_amount: assessment.insurance_amount ? Number(assessment.insurance_amount) : null,
    };

    // Determine total_due based on payment mode
    const totalDue =
      assessment.payment_mode.toLowerCase() === "installment"
        ? assessment.total_due_installment
          ? Number(assessment.total_due_installment)
          : Number(assessment.base_total)
        : assessment.total_due_cash
          ? Number(assessment.total_due_cash)
          : Number(assessment.base_total);

    // Fetch installment schedule if payment mode is INSTALLMENT
    let installmentSchedule: Array<{
      label: string;
      due_date: string;
      amount: number;
      is_paid: boolean;
    }> = [];

    if (assessment.payment_mode.toLowerCase() === "installment") {
      installmentSchedule = assessment.payment_schedules.map((schedule) => ({
        label: schedule.label, // "Prelim", "Midterm", "Finals"
        due_date: schedule.due_date.toISOString(),
        amount: Number(schedule.amount),
        is_paid: schedule.is_paid,
      }));
    }

    // Calculate payment summary
    const totalPaid = assessment.payments.reduce(
      (sum, payment) => sum + Number(payment.amount_paid),
      0
    );

    const remainingBalance = Math.max(0, totalDue - totalPaid); // Cap at 0, cannot be negative

    // Determine payment status
    let paymentStatus: "Unpaid" | "Partial" | "Fully Paid";
    if (totalPaid === 0) {
      paymentStatus = "Unpaid";
    } else if (totalPaid < totalDue) {
      paymentStatus = "Partial";
    } else {
      paymentStatus = "Fully Paid";
    }

    // Round all monetary values to 2 decimals
    const roundToTwoDecimals = (value: number): number => {
      return Math.round(value * 100) / 100;
    };

    // Build response
    const response = {
      success: true,
      data: {
        assessment_summary: {
          gross_tuition: roundToTwoDecimals(assessmentSummary.gross_tuition),
          discount_amount: roundToTwoDecimals(assessmentSummary.discount_amount),
          net_tuition: roundToTwoDecimals(assessmentSummary.net_tuition),
          total_fees: roundToTwoDecimals(assessmentSummary.total_fees),
          fixed_amount_total: roundToTwoDecimals(assessmentSummary.fixed_amount_total),
          base_total: roundToTwoDecimals(assessmentSummary.base_total),
          payment_mode: assessmentSummary.payment_mode,
          total_due: roundToTwoDecimals(totalDue),
          total_due_cash: assessmentSummary.total_due_cash
            ? roundToTwoDecimals(assessmentSummary.total_due_cash)
            : null,
          total_due_installment: assessmentSummary.total_due_installment
            ? roundToTwoDecimals(assessmentSummary.total_due_installment)
            : null,
          down_payment: assessmentSummary.down_payment
            ? roundToTwoDecimals(assessmentSummary.down_payment)
            : null,
          insurance_amount: assessmentSummary.insurance_amount
            ? roundToTwoDecimals(assessmentSummary.insurance_amount)
            : null,
        },
        installment_schedule:
          assessment.payment_mode.toLowerCase() === "installment"
            ? installmentSchedule.map((schedule) => ({
                label: schedule.label,
                due_date: schedule.due_date,
                amount: roundToTwoDecimals(schedule.amount),
                is_paid: schedule.is_paid,
              }))
            : [],
        payment_summary: {
          total_paid: roundToTwoDecimals(totalPaid),
          remaining_balance: roundToTwoDecimals(remainingBalance),
          payment_status: paymentStatus,
        },
        payment_transactions: assessment.payments.map((payment) => ({
          id: payment.id,
          amount_paid: roundToTwoDecimals(Number(payment.amount_paid)),
          payment_type: payment.payment_type,
          payment_date: payment.payment_date.toISOString(),
          reference_no: payment.reference_no,
        })),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Failed to fetch financial summary",
      },
      { status: 500 }
    );
  }
}

