import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";
import { ensureOnlinePaymentTables } from "@/app/lib/onlinePayment";

const MAX_PROOF_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export async function POST(request: NextRequest) {
  try {
    await ensureOnlinePaymentTables();
    const formData = await request.formData();

    const token = String(formData.get("token") || "").trim();
    const paymentMethodId = Number(formData.get("payment_method_id"));
    const referenceNo = String(formData.get("reference_no") || "").trim();
    const orNumberRaw = formData.get("or_number");
    const amount = Number(formData.get("amount"));
    const proof = formData.get("proof");

    if (!token || !Number.isFinite(paymentMethodId) || !referenceNo || !Number.isFinite(amount)) {
      return NextResponse.json(
        { error: "token, payment_method_id, reference_no, and amount are required." },
        { status: 400 },
      );
    }

    if (!(proof instanceof File)) {
      return NextResponse.json({ error: "Payment proof image is required." }, { status: 400 });
    }
    if (proof.size <= 0 || proof.size > MAX_PROOF_FILE_SIZE) {
      return NextResponse.json(
        { error: "Payment proof must be between 1 byte and 8MB." },
        { status: 400 },
      );
    }

    const linkRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM online_payment_links WHERE token = $1 AND is_active = true LIMIT 1`,
      token,
    );
    const link = linkRows[0];
    if (!link) {
      return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
    }
    if (new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Payment link has expired. Please request a new payment link." },
        { status: 410 },
      );
    }

    const methodRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM payment_gateway_methods WHERE id = $1 AND is_active = true LIMIT 1`,
      paymentMethodId,
    );
    const method = methodRows[0];
    if (!method) {
      return NextResponse.json({ error: "Payment method is not available." }, { status: 404 });
    }

    const assessment = await prisma.student_assessment.findUnique({
      where: { id: Number(link.assessment_id) },
    });
    if (!assessment || assessment.status !== "finalized") {
      return NextResponse.json({ error: "Assessment is not valid for payment." }, { status: 400 });
    }

    const paymentSum = await prisma.student_payment.aggregate({
      where: { assessment_id: assessment.id },
      _sum: { amount_paid: true },
    });
    const totalPaid = Number(paymentSum._sum.amount_paid || 0);
    const totalDue =
      String(assessment.payment_mode || "").toLowerCase() === "installment"
        ? Number(assessment.total_due_installment || assessment.total_due)
        : Number(assessment.total_due_cash || assessment.total_due);
    const remainingBalance = Math.max(0, totalDue - totalPaid);

    if (amount > remainingBalance + 0.01) {
      return NextResponse.json(
        { error: `Amount exceeds remaining balance (₱${remainingBalance.toFixed(2)}).` },
        { status: 400 },
      );
    }

    const isFirstInstallmentPayment =
      String(assessment.payment_mode || "").toLowerCase() === "installment" &&
      totalPaid <= 0.01;
    if (isFirstInstallmentPayment) {
      const minDownpaymentRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT value FROM settings WHERE key = 'min_downpayment' LIMIT 1`,
      );
      const minDownpaymentSetting = Number(minDownpaymentRows?.[0]?.value || 3000);
      const requiredDownpayment = Number(
        assessment.down_payment ?? minDownpaymentSetting,
      );
      const effectiveRequired = Math.min(remainingBalance, requiredDownpayment);
      if (amount + 0.01 < effectiveRequired) {
        return NextResponse.json(
          {
            error: `Installment requires at least ₱${effectiveRequired.toFixed(2)} downpayment for first payment.`,
          },
          { status: 400 },
        );
      }
    }

    const existingPendingRows = await prisma.$queryRawUnsafe<any[]>(
      `
        SELECT id
        FROM online_payment_submissions
        WHERE assessment_id = $1 AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      assessment.id,
    );
    if (existingPendingRows.length > 0) {
      return NextResponse.json(
        { error: "A pending payment submission already exists for this assessment." },
        { status: 409 },
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-proofs");
    await mkdir(uploadDir, { recursive: true });

    const fileExt = path.extname(proof.name || "").toLowerCase() || ".jpg";
    const fileName = `${assessment.student_number}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${fileExt}`;
    const savePath = path.join(uploadDir, fileName);
    const fileBuffer = Buffer.from(await proof.arrayBuffer());
    await writeFile(savePath, fileBuffer);
    const publicProofPath = `/uploads/payment-proofs/${fileName}`;

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_number: assessment.student_number,
        academic_year: assessment.academic_year,
      },
      select: {
        first_name: true,
        middle_name: true,
        family_name: true,
      },
      orderBy: { id: "desc" },
    });
    const studentName =
      `${enrollment?.first_name || ""} ${enrollment?.middle_name || ""} ${enrollment?.family_name || ""}`
        .replace(/\s+/g, " ")
        .trim() || assessment.student_number;

    const orNumber =
      typeof orNumberRaw === "string" && orNumberRaw.trim()
        ? orNumberRaw.trim()
        : null;

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO online_payment_submissions (
          assessment_id,
          student_number,
          student_name,
          academic_year,
          semester,
          payment_method_id,
          payment_method_name,
          receiver_name,
          receiver_account,
          reference_no,
          or_number,
          amount,
          proof_path,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',NOW(),NOW()
        )
      `,
      assessment.id,
      assessment.student_number,
      studentName,
      assessment.academic_year,
      assessment.semester,
      paymentMethodId,
      method.name,
      method.receiver_name,
      method.receiver_account,
      referenceNo,
      orNumber,
      Number(amount),
      publicProofPath,
    );

    return NextResponse.json({
      success: true,
      message: "Payment submission received. Please wait for admin verification.",
    });
  } catch (error: any) {
    console.error("POST payment submission error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit payment proof" },
      { status: 500 },
    );
  }
}
