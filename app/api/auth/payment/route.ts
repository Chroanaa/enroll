import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * POST - Record a payment
 * Payment module handles all payment processing
 * Updates payment_schedule for installment payments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      assessmentId, 
      amountPaid, 
      paymentType, 
      paymentDate, 
      referenceNo,
      scheduleLabel, // Optional: 'Prelim', 'Midterm', 'Finals' for installment payments
    } = body;

    if (!assessmentId || amountPaid === undefined || !paymentType) {
      return NextResponse.json(
        { error: "Missing required fields: assessmentId, amountPaid, paymentType" },
        { status: 400 }
      );
    }

    // Verify assessment exists and is finalized
    const assessment = await prisma.student_assessment.findUnique({
      where: { id: parseInt(assessmentId) },
      include: {
        payment_schedules: {
          orderBy: { due_date: "asc" },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.status !== 'finalized') {
      return NextResponse.json(
        { error: "Assessment must be finalized before accepting payments" },
        { status: 400 }
      );
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.student_payment.create({
        data: {
          assessment_id: parseInt(assessmentId),
          amount_paid: parseFloat(amountPaid),
          payment_type: paymentType,
          payment_date: paymentDate ? new Date(paymentDate) : new Date(),
          reference_no: referenceNo || null,
        },
      });

      // For installment payments, update payment_schedule if label is provided
      if (assessment.payment_mode === 'installment' && scheduleLabel) {
        const scheduleItem = assessment.payment_schedules.find(
          (s) => s.label.toLowerCase() === scheduleLabel.toLowerCase()
        );

        if (scheduleItem) {
          // Check if payment amount matches or exceeds the schedule amount
          const paidAmount = parseFloat(amountPaid);
          const scheduleAmount = Number(scheduleItem.amount);

          if (paidAmount >= scheduleAmount) {
            // Mark schedule item as paid
            await tx.payment_schedule.update({
              where: { id: scheduleItem.id },
              data: { is_paid: true },
            });
          } else {
            // Partial payment - could create a partial payment tracking system
            // For now, we'll leave it as unpaid until full amount is received
          }
        }
      }

      // Calculate payment summary
      const allPayments = await tx.student_payment.findMany({
        where: { assessment_id: parseInt(assessmentId) },
      });

      const totalPaid = allPayments.reduce(
        (sum, p) => sum + Number(p.amount_paid),
        0
      );

      // Get correct total due based on payment mode
      const totalDue = assessment.payment_mode === 'cash' 
        ? Number(assessment.total_due_cash || assessment.total_due)
        : Number(assessment.total_due_installment || assessment.total_due);

      // For installment mode, down payment is tracked separately by Payment Module
      // Remaining balance = total due - total paid (including any down payment)
      const remainingBalance = Math.max(0, totalDue - totalPaid);

      // Get updated payment schedule status
      const updatedSchedule = await tx.payment_schedule.findMany({
        where: { assessment_id: parseInt(assessmentId) },
        orderBy: { due_date: "asc" },
      });

      return {
        payment,
        total_paid: totalPaid,
        total_due: totalDue,
        remaining_balance: remainingBalance,
        payment_schedule: updatedSchedule,
        is_fully_paid: remainingBalance <= 0.01, // Allow 1 cent tolerance
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Payment recorded successfully",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to record payment",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch payments and balance for an assessment
 * Payment module calculates all payment-related data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Fetch assessment with payment data
    const assessment = await prisma.student_assessment.findUnique({
      where: { id: parseInt(assessmentId) },
      include: {
        payment_schedules: {
          orderBy: { due_date: "asc" },
        },
        payments: {
          orderBy: {
            payment_date: "desc",
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Calculate payment summary (payment module responsibility)
    const totalPaid = assessment.payments.reduce(
      (sum, p) => sum + Number(p.amount_paid),
      0
    );

    const totalDue = assessment.payment_mode === 'cash' 
      ? Number(assessment.total_due_cash || assessment.total_due)
      : Number(assessment.total_due_installment || assessment.total_due);

    const remainingBalance = Math.max(0, totalDue - totalPaid);
    const isFullyPaid = remainingBalance <= 0.01;

    return NextResponse.json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          student_number: assessment.student_number,
          academic_year: assessment.academic_year,
          semester: assessment.semester,
          payment_mode: assessment.payment_mode,
          total_due_cash: assessment.total_due_cash,
          total_due_installment: assessment.total_due_installment,
          total_due: assessment.total_due,
          status: assessment.status,
        },
        payments: assessment.payments,
        payment_schedule: assessment.payment_schedules,
        summary: {
          total_paid: totalPaid,
          total_due: totalDue,
          remaining_balance: remainingBalance,
          is_fully_paid: isFullyPaid,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch payments",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update payment record
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, amountPaid, paymentType, paymentDate, referenceNo } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const payment = await prisma.student_payment.findUnique({
      where: { id: parseInt(paymentId) },
      include: { assessment: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const updatedPayment = await prisma.student_payment.update({
      where: { id: parseInt(paymentId) },
      data: {
        ...(amountPaid !== undefined && { amount_paid: parseFloat(amountPaid) }),
        ...(paymentType && { payment_type: paymentType }),
        ...(paymentDate && { payment_date: new Date(paymentDate) }),
        ...(referenceNo !== undefined && { reference_no: referenceNo }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: "Payment updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to update payment",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Void/cancel a payment
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const payment = await prisma.student_payment.findUnique({
      where: { id: parseInt(paymentId) },
      include: { assessment: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // If this payment was for an installment, update the schedule
    if (payment.assessment.payment_mode === 'installment') {
      // Recalculate which schedule items should be marked as paid
      const allPayments = await prisma.student_payment.findMany({
        where: { 
          assessment_id: payment.assessment_id,
          id: { not: parseInt(paymentId) }, // Exclude the payment being deleted
        },
      });

      const totalPaidAfterDelete = allPayments.reduce(
        (sum, p) => sum + Number(p.amount_paid),
        0
      );

      // Update payment schedule based on remaining payments
      const schedules = await prisma.payment_schedule.findMany({
        where: { assessment_id: payment.assessment_id },
        orderBy: { due_date: "asc" },
      });

      let runningTotal = 0;
      for (const schedule of schedules) {
        runningTotal += Number(schedule.amount);
        await prisma.payment_schedule.update({
          where: { id: schedule.id },
          data: { is_paid: runningTotal <= totalPaidAfterDelete + 0.01 }, // Allow 1 cent tolerance
        });
      }
    }

    await prisma.student_payment.delete({
      where: { id: parseInt(paymentId) },
    });

    return NextResponse.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to delete payment",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}
