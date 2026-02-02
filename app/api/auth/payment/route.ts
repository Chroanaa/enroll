import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// POST - Record a payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId, amountPaid, paymentType, paymentDate, referenceNo } = body;

    if (!assessmentId || amountPaid === undefined || !paymentType) {
      return NextResponse.json(
        { error: "Missing required fields: assessmentId, amountPaid, paymentType" },
        { status: 400 }
      );
    }

    // Verify assessment exists
    const assessment = await prisma.student_assessment.findUnique({
      where: { id: parseInt(assessmentId) },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Create payment record
    const payment = await prisma.student_payment.create({
      data: {
        assessment_id: parseInt(assessmentId),
        amount_paid: parseFloat(amountPaid),
        payment_type: paymentType,
        payment_date: paymentDate ? new Date(paymentDate) : new Date(),
        reference_no: referenceNo || null,
      },
    });

    // Calculate updated balance
    const allPayments = await prisma.student_payment.findMany({
      where: { assessment_id: parseInt(assessmentId) },
    });

    const totalPaid = allPayments.reduce(
      (sum, p) => sum + Number(p.amount_paid),
      0
    );
    const remainingBalance = Number(assessment.total_due) - totalPaid;

    return NextResponse.json(
      {
        payment,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
      },
      { status: 201 }
    );
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

// GET - Fetch payments for an assessment
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

    const payments = await prisma.student_payment.findMany({
      where: { assessment_id: parseInt(assessmentId) },
      orderBy: {
        payment_date: "desc",
      },
    });

    return NextResponse.json(payments);
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

