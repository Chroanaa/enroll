import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET - Fetch assessment for a student and term
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentNumber = searchParams.get("studentNumber");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!studentNumber || !academicYear || !semester) {
      return NextResponse.json(
        { error: "Missing required parameters: studentNumber, academicYear, semester" },
        { status: 400 }
      );
    }

    const assessment = await prisma.student_assessment.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: parseInt(semester),
        },
      },
      include: {
        discount: true,
        fees: true,
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

    // Calculate remaining balance
    const totalPaid = assessment.payments.reduce(
      (sum: number, payment: any) => sum + Number(payment.amount_paid),
      0
    );
    const remainingBalance = Number(assessment.total_due) - totalPaid;

    return NextResponse.json({
      ...assessment,
      total_paid: totalPaid,
      remaining_balance: remainingBalance,
    });
  } catch (error: any) {
    console.error("Error fetching assessment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch assessment",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

// POST - Create or update assessment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentNumber,
      academicYear,
      semester,
      grossTuition,
      discountId,
      discountPercent,
      discountAmount,
      netTuition,
      totalFees,
      totalDue,
      fees, // Array of { feeId, feeName, feeCategory, amount }
    } = body;

    if (!studentNumber || !academicYear || semester === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: studentNumber, academicYear, semester" },
        { status: 400 }
      );
    }

    if (
      grossTuition === undefined ||
      netTuition === undefined ||
      totalFees === undefined ||
      totalDue === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required financial fields" },
        { status: 400 }
      );
    }

    // Use transaction to ensure data integrity
    let isUpdate = false;
    const result = await prisma.$transaction(async (tx) => {
      // Check if assessment already exists
      const existing = await tx.student_assessment.findUnique({
        where: {
          student_number_academic_year_semester: {
            student_number: studentNumber,
            academic_year: academicYear,
            semester: parseInt(semester),
          },
        },
      });

      let assessment;
      if (existing) {
        isUpdate = true;
        // Update existing assessment
        assessment = await tx.student_assessment.update({
          where: { id: existing.id },
          data: {
            gross_tuition: parseFloat(grossTuition),
            discount_id: discountId || null,
            discount_percent: discountPercent ? parseFloat(discountPercent) : null,
            discount_amount: discountAmount ? parseFloat(discountAmount) : null,
            net_tuition: parseFloat(netTuition),
            total_fees: parseFloat(totalFees),
            total_due: parseFloat(totalDue),
          },
        });

        // Delete existing fee snapshots
        await tx.assessment_fee.deleteMany({
          where: { assessment_id: assessment.id },
        });
      } else {
        // Create new assessment
        assessment = await tx.student_assessment.create({
          data: {
            student_number: studentNumber,
            academic_year: academicYear,
            semester: parseInt(semester),
            gross_tuition: parseFloat(grossTuition),
            discount_id: discountId || null,
            discount_percent: discountPercent ? parseFloat(discountPercent) : null,
            discount_amount: discountAmount ? parseFloat(discountAmount) : null,
            net_tuition: parseFloat(netTuition),
            total_fees: parseFloat(totalFees),
            total_due: parseFloat(totalDue),
          },
        });
      }

      // Create fee snapshots
      if (fees && Array.isArray(fees) && fees.length > 0) {
        await tx.assessment_fee.createMany({
          data: fees.map((fee: any) => ({
            assessment_id: assessment.id,
            fee_id: fee.feeId || null,
            fee_name: fee.feeName,
            fee_category: fee.feeCategory,
            amount: parseFloat(fee.amount),
          })),
        });
      }

      // Fetch complete assessment with relations
      return await tx.student_assessment.findUnique({
        where: { id: assessment.id },
        include: {
          discount: true,
          fees: true,
          payments: true,
        },
      });
    });

    return NextResponse.json(result, { status: isUpdate ? 200 : 201 });
  } catch (error: any) {
    console.error("Error saving assessment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to save assessment",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

