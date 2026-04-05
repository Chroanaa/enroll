import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";
import { ensureOnlinePaymentTables, normalizeMethodPaymentType } from "@/app/lib/onlinePayment";
import { sendPaymentSubmissionDecisionEmail } from "@/app/lib/email";
import {
  generateARNumber,
  generateORNumber,
  getServerDate,
} from "@/app/utils/arNumberUtils";

const ALLOWED_ROLES = [ROLES.ADMIN, ROLES.CASHIER, ROLES.REGISTRAR, ROLES.DEAN];

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isRoleAllowed(scope.roleId, ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureOnlinePaymentTables();
    const searchParams = request.nextUrl.searchParams;
    const status = String(searchParams.get("status") || "pending").trim().toLowerCase();
    const search = String(searchParams.get("search") || "").trim();

    const whereParts: string[] = [];
    const values: any[] = [];
    if (status && status !== "all") {
      values.push(status);
      whereParts.push(`s.status = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      whereParts.push(
        `(s.student_name ILIKE $${values.length} OR s.student_number ILIKE $${values.length} OR s.reference_no ILIKE $${values.length})`,
      );
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        s.*,
        e.email_address
      FROM online_payment_submissions s
      LEFT JOIN enrollment e
        ON e.student_number = s.student_number
       AND COALESCE(e.academic_year, '') = COALESCE(s.academic_year, '')
      ${whereClause}
      ORDER BY s.created_at DESC
      `,
      ...values,
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("GET online payment submissions error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isRoleAllowed(scope.roleId, ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureOnlinePaymentTables();
    const body = await request.json();
    const submissionId = Number(body?.submission_id);
    const action = String(body?.action || "").trim().toLowerCase();
    const remarks =
      typeof body?.remarks === "string" && body.remarks.trim()
        ? body.remarks.trim()
        : null;

    if (!Number.isFinite(submissionId)) {
      return NextResponse.json({ error: "Invalid submission_id" }, { status: 400 });
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
    }

    const submissionRows = await prisma.$queryRawUnsafe<any[]>(
      `
        SELECT s.*, e.email_address
        FROM online_payment_submissions s
        LEFT JOIN enrollment e
          ON e.student_number = s.student_number
         AND COALESCE(e.academic_year, '') = COALESCE(s.academic_year, '')
        WHERE s.id = $1
        LIMIT 1
      `,
      submissionId,
    );
    const submission = submissionRows[0];
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    if (submission.status !== "pending") {
      return NextResponse.json({ error: "Submission is already reviewed" }, { status: 409 });
    }

    if (action === "reject") {
      await prisma.$executeRawUnsafe(
        `
          UPDATE online_payment_submissions
          SET status = 'rejected', admin_remarks = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `,
        submissionId,
        remarks,
        scope.userId,
      );

      if (submission.email_address) {
        try {
          await sendPaymentSubmissionDecisionEmail({
            to: submission.email_address,
            studentName: submission.student_name || submission.student_number,
            status: "rejected",
            amount: Number(submission.amount || 0),
            paymentMethod: submission.payment_method_name || "Online Payment",
            referenceNo: submission.reference_no,
            remarks,
          });
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError);
        }
      }

      return NextResponse.json({ success: true, message: "Submission rejected." });
    }

    const assessment = await prisma.student_assessment.findUnique({
      where: { id: Number(submission.assessment_id) },
    });
    if (!assessment || assessment.status !== "finalized") {
      return NextResponse.json(
        { error: "Assessment is not available for payment posting." },
        { status: 400 },
      );
    }

    const paymentType = normalizeMethodPaymentType(submission.payment_method_name || "");
    const amount = Number(submission.amount || 0);

    const txResult = await prisma.$transaction(async (tx) => {
      await tx.student_payment.create({
        data: {
          assessment_id: Number(submission.assessment_id),
          amount_paid: amount,
          payment_type: paymentType,
          payment_date: new Date(),
          reference_no: submission.reference_no || null,
        },
      });

      const paymentSummary = await tx.student_payment.aggregate({
        where: { assessment_id: Number(submission.assessment_id) },
        _sum: { amount_paid: true },
      });
      const totalPaid = Number(paymentSummary._sum.amount_paid || 0);
      const totalDue =
        assessment.payment_mode.toLowerCase() === "installment"
          ? Number(assessment.total_due_installment || assessment.total_due)
          : Number(assessment.total_due_cash || assessment.total_due);
      const remaining = Math.max(0, totalDue - totalPaid);

      const serverDate = await getServerDate();
      const arNumber = await generateARNumber(assessment.student_number);
      const orNumber = await generateORNumber();

      const orderHeader = await tx.order_header.create({
        data: {
          order_date: serverDate,
          order_amount: amount,
          billing_id: null,
          ar_number: arNumber,
          or_number: orNumber,
          isvoided: 0,
          student_number: assessment.student_number,
          user_id: scope.userId,
          created_at: serverDate,
          updated_at: serverDate,
        },
      });

      await tx.order_details.create({
        data: {
          order_header_id: orderHeader.id,
          product_id: 0,
          quantity: 1,
          selling_price: amount,
          total: amount,
          created_at: serverDate,
          updated_at: serverDate,
        },
      });

      await tx.payment_details.create({
        data: {
          order_header_id: orderHeader.id,
          payment_id: paymentType === "gcash" ? 2 : 3,
          amount,
          tendered_amount: amount,
          change_amount: 0,
          transaction_ref: submission.reference_no || null,
          created_at: serverDate,
          updated_at: serverDate,
        },
      });

      if (assessment.payment_mode.toLowerCase() === "installment") {
        const unpaidSchedules = await tx.payment_schedule.findMany({
          where: { assessment_id: assessment.id, is_paid: false },
          orderBy: { due_date: "asc" },
        });
        let runningAmount = totalPaid;
        for (const sched of unpaidSchedules) {
          if (runningAmount >= Number(sched.amount) - 0.01) {
            await tx.payment_schedule.update({
              where: { id: sched.id },
              data: { is_paid: true },
            });
            runningAmount -= Number(sched.amount);
          } else {
            break;
          }
        }
      }

      await tx.$executeRawUnsafe(
        `
          UPDATE online_payment_submissions
          SET status = 'approved', admin_remarks = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `,
        submissionId,
        remarks,
        scope.userId,
      );

      await tx.enrollment.updateMany({
        where: {
          student_number: submission.student_number,
          academic_year: submission.academic_year || undefined,
          status: { in: [4, 5] },
        },
        data: { status: remaining <= 0.01 ? 2 : 5 },
      });

      return { remaining };
    });

    if (submission.email_address) {
      try {
        await sendPaymentSubmissionDecisionEmail({
          to: submission.email_address,
          studentName: submission.student_name || submission.student_number,
          status: "approved",
          amount,
          paymentMethod: submission.payment_method_name || "Online Payment",
          referenceNo: submission.reference_no,
          remarks,
        });
      } catch (emailError) {
        console.error("Failed to send approved email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        txResult.remaining <= 0.01
          ? "Submission approved and account is fully paid."
          : `Submission approved. Remaining balance: ₱${txResult.remaining.toFixed(2)}`,
    });
  } catch (error: any) {
    console.error("PATCH online payment submissions error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to review submission" },
      { status: 500 },
    );
  }
}

