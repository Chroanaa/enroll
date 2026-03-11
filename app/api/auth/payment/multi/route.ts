import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  generateARNumber,
  generateORNumber,
  getServerDate,
} from "@/app/utils/arNumberUtils";

/**
 * POST /api/auth/payment/multi
 *
 * Record multiple payments for a single assessment in one transaction.
 * Supports split payments (e.g., part cash + part gcash).
 *
 * Body:
 * - assessmentId: number
 * - payments: Array<{ payment_type: string, amount: number, reference_no?: string }>
 * - scheduleLabel?: string (for installment mode)
 * - student_number?: string (for order/receipt generation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId, payments, scheduleLabel, student_number } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 },
      );
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "At least one payment entry is required" },
        { status: 400 },
      );
    }

    // Validate all payment entries
    for (const p of payments) {
      if (!p.payment_type || p.amount === undefined || Number(p.amount) <= 0) {
        return NextResponse.json(
          {
            error:
              "Each payment must have a valid payment_type and positive amount",
          },
          { status: 400 },
        );
      }
      if (
        (p.payment_type === "gcash" || p.payment_type === "bank_transfer") &&
        !p.reference_no
      ) {
        return NextResponse.json(
          {
            error: `Reference number is required for ${p.payment_type} payments`,
          },
          { status: 400 },
        );
      }
    }

    // Verify assessment exists and is finalized
    const assessment = await prisma.student_assessment.findUnique({
      where: { id: parseInt(assessmentId) },
      include: {
        payment_schedules: {
          orderBy: { due_date: "asc" },
        },
        payments: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    if (assessment.status !== "finalized") {
      return NextResponse.json(
        { error: "Assessment must be finalized before accepting payments" },
        { status: 400 },
      );
    }

    const totalPaymentAmount = payments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    );

    const result = await prisma.$transaction(async (tx) => {
      // Create a payment record for each payment entry
      const createdPayments = [];
      for (const p of payments) {
        const payment = await tx.student_payment.create({
          data: {
            assessment_id: parseInt(assessmentId),
            amount_paid: Number(p.amount),
            payment_type: p.payment_type,
            payment_date: new Date(),
            reference_no: p.reference_no || null,
          },
        });
        createdPayments.push(payment);
      }

      // For ALL payment modes: if down_payment is not yet set AND this is NOT a schedule
      // term payment (no scheduleLabel), then this payment is the downpayment — save it.
      if (!scheduleLabel && assessment.payments.length === 0) {
        await tx.student_assessment.update({
          where: { id: parseInt(assessmentId) },
          data: { down_payment: totalPaymentAmount },
        });
      }

      // For installment payments, update payment_schedule if label is provided
      if (
        assessment.payment_mode.toLowerCase() === "installment" &&
        scheduleLabel
      ) {
        const scheduleItem = assessment.payment_schedules.find(
          (s) => s.label.toLowerCase() === scheduleLabel.toLowerCase(),
        );

        if (scheduleItem) {
          await tx.payment_schedule.update({
            where: { id: scheduleItem.id },
            data: { is_paid: true },
          });
        }
      }

      // Calculate updated payment summary
      const allPayments = await tx.student_payment.findMany({
        where: { assessment_id: parseInt(assessmentId) },
      });

      const totalPaid = allPayments.reduce(
        (sum, p) => sum + Number(p.amount_paid),
        0,
      );

      const totalDue =
        assessment.payment_mode.toLowerCase() === "cash"
          ? Number(assessment.total_due_cash || assessment.total_due)
          : Number(assessment.total_due_installment || assessment.total_due);

      const remainingBalance = Math.max(0, totalDue - totalPaid);

      const updatedSchedule = await tx.payment_schedule.findMany({
        where: { assessment_id: parseInt(assessmentId) },
        orderBy: { due_date: "asc" },
      });

      // === Create order_header, order_details, and payment_details ===
      const studentNum =
        student_number || assessment.student_number || undefined;
      const arNumber = await generateARNumber(studentNum);
      const orNumber = await generateORNumber();
      const serverDate = await getServerDate();

      const orderHeader = await tx.order_header.create({
        data: {
          order_date: serverDate,
          order_amount: totalPaymentAmount,
          billing_id: null,
          ar_number: arNumber,
          or_number: orNumber,
          isvoided: 0,
          student_number: studentNum || null,
          user_id: null,
          created_at: serverDate,
          updated_at: serverDate,
        },
      });

      // Create order_details — one line item per payment line
      for (const p of payments) {
        await tx.order_details.create({
          data: {
            order_header_id: orderHeader.id,
            product_id: 0, // 0 = enrollment/assessment payment (not a product)
            quantity: 1,
            selling_price: Number(p.amount),
            total: Number(p.amount),
            created_at: serverDate,
            updated_at: serverDate,
          },
        });
      }

      // Create payment_details — one per payment line
      for (const p of payments) {
        const paymentId =
          p.payment_type === "cash" ? 1 : p.payment_type === "gcash" ? 2 : 3;
        await tx.payment_details.create({
          data: {
            order_header_id: orderHeader.id,
            payment_id: paymentId,
            amount: Number(p.amount),
            tendered_amount: Number(p.amount),
            change_amount: 0,
            transaction_ref: p.reference_no || null,
            created_at: serverDate,
            updated_at: serverDate,
          },
        });
      }

      return {
        payments: createdPayments,
        total_paid: Math.round(totalPaid * 100) / 100,
        total_due: Math.round(totalDue * 100) / 100,
        remaining_balance: Math.round(remainingBalance * 100) / 100,
        payment_schedule: updatedSchedule,
        is_fully_paid: remainingBalance <= 0.01,
        order_id: orderHeader.id,
        ar_number: arNumber,
        or_number: orNumber,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `${payments.length} payment(s) recorded successfully. ${result.is_fully_paid ? "Account is fully paid." : `Remaining balance: ₱${result.remaining_balance.toFixed(2)}`}`,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error recording multi-payment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to record payments",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
