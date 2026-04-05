import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { ensureOnlinePaymentTables } from "@/app/lib/onlinePayment";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    await ensureOnlinePaymentTables();
    const { token } = await params;
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const linkRows = await prisma.$queryRawUnsafe<any[]>(
      `
        SELECT *
        FROM online_payment_links
        WHERE token = $1 AND is_active = true
        LIMIT 1
      `,
      normalizedToken,
    );
    const link = linkRows[0];
    if (!link) {
      return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Payment link has expired. Please request a new link." },
        { status: 410 },
      );
    }

    const assessment = await prisma.student_assessment.findUnique({
      where: { id: Number(link.assessment_id) },
      include: {
        fees: true,
      },
    });
    if (!assessment || assessment.status !== "finalized") {
      return NextResponse.json(
        { error: "Assessment is not available for payment." },
        { status: 404 },
      );
    }

    const paymentSum = await prisma.student_payment.aggregate({
      where: { assessment_id: assessment.id },
      _sum: { amount_paid: true },
    });
    const paymentHistory = await prisma.student_payment.findMany({
      where: { assessment_id: assessment.id },
      orderBy: [{ payment_date: "desc" }, { id: "desc" }],
      select: {
        id: true,
        amount_paid: true,
        payment_date: true,
        payment_type: true,
        reference_no: true,
      },
    });
    const pendingSubmissions = await prisma.$queryRawUnsafe<any[]>(
      `
        SELECT
          id,
          payment_method_name,
          amount,
          reference_no,
          created_at,
          status
        FROM online_payment_submissions
        WHERE assessment_id = $1 AND status = 'pending'
        ORDER BY created_at DESC, id DESC
      `,
      assessment.id,
    );
    const totalPaid = Number(paymentSum._sum.amount_paid || 0);
    const totalDue =
      assessment.payment_mode.toLowerCase() === "installment"
        ? Number(assessment.total_due_installment || assessment.total_due)
        : Number(assessment.total_due_cash || assessment.total_due);
    const remainingBalance = Math.max(0, totalDue - totalPaid);

    const minDownpaymentRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT value FROM settings WHERE key = 'min_downpayment' LIMIT 1`,
    );
    const minDownpaymentSetting = Number(minDownpaymentRows?.[0]?.value || 3000);
    const configuredDownpayment = Number(
      assessment.down_payment ?? minDownpaymentSetting,
    );
    const isFirstInstallmentPayment =
      String(assessment.payment_mode || "").toLowerCase() === "installment" &&
      totalPaid <= 0.01;
    const amountDueNow = isFirstInstallmentPayment
      ? Math.min(remainingBalance, configuredDownpayment)
      : remainingBalance;
    const minAmountAllowed = isFirstInstallmentPayment
      ? Math.min(remainingBalance, configuredDownpayment)
      : 1;

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_number: link.student_number,
        academic_year: link.academic_year || undefined,
      },
      select: {
        first_name: true,
        middle_name: true,
        family_name: true,
        email_address: true,
      },
      orderBy: { id: "desc" },
    });

    const methods = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, receiver_name, receiver_account, instructions, sort_order
      FROM payment_gateway_methods
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `);

    return NextResponse.json({
      success: true,
      data: {
        token: normalizedToken,
        student_number: link.student_number,
        student_name:
          `${enrollment?.first_name || ""} ${enrollment?.middle_name || ""} ${enrollment?.family_name || ""}`
            .replace(/\s+/g, " ")
            .trim(),
        student_email: enrollment?.email_address || link.email_address,
        assessment_id: assessment.id,
        academic_year: assessment.academic_year,
        semester: assessment.semester,
        payment_mode: assessment.payment_mode,
        total_due: totalDue,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        amount_due_now: amountDueNow,
        min_amount_allowed: minAmountAllowed,
        payment_history: paymentHistory.map((payment) => ({
          id: payment.id,
          amount_paid: Number(payment.amount_paid || 0),
          payment_date: payment.payment_date,
          payment_type: payment.payment_type,
          reference_no: payment.reference_no,
        })),
        pending_submissions: pendingSubmissions.map((submission) => ({
          id: Number(submission.id),
          payment_method_name: submission.payment_method_name,
          amount: Number(submission.amount || 0),
          reference_no: submission.reference_no,
          created_at: submission.created_at,
          status: submission.status,
        })),
        is_first_installment_payment: isFirstInstallmentPayment,
        configured_downpayment: configuredDownpayment,
        fee_breakdown: assessment.fees.map((fee) => ({
          id: fee.id,
          fee_name: fee.fee_name,
          fee_category: fee.fee_category,
          amount: Number(fee.amount || 0),
        })),
        methods,
      },
    });
  } catch (error: any) {
    console.error("GET payment link error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load payment link" },
      { status: 500 },
    );
  }
}
