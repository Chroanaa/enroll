import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

// Get all billing records or students without billing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unbilled = searchParams.get("unbilled");

    if (unbilled === "true") {
      // Get enrollees that don't have a billing record and have status 4 (for payment)
      const billedEnrolleeIds = await prisma.billing.findMany({
        select: { enrollee_id: true },
      });

      const billedIds = billedEnrolleeIds
        .map((b) => b.enrollee_id)
        .filter((id): id is number => id !== null);

      const unbilledEnrollees = await prisma.enrollment.findMany({
        where: {
          id: {
            notIn: billedIds.length > 0 ? billedIds : [-1], // Use -1 to avoid empty array issue
          },
          status: 4, // Status 4 = For Payment
        },
        orderBy: {
          family_name: "asc",
        },
      });

      return NextResponse.json(unbilledEnrollees);
    }

    // Get all billing records with enrollee info
    const billings = await prisma.$queryRaw`
      SELECT 
        b.*,
        e.first_name,
        e.family_name,
        e.middle_name,
        e.student_number,
        e.course_program,
        e.term as enrollment_term
      FROM billing b
      LEFT JOIN enrollment e ON b.enrollee_id = e.id
      ORDER BY b.date_paid DESC NULLS LAST, b.id DESC
    `;

    return NextResponse.json(billings);
  } catch (error: any) {
    console.error("Error fetching billing data:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch billing data",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Create a new billing/payment record
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { enrollee_id, term, payment_type, amount, reference_no, user_id } =
      data;

    // Validate required fields
    if (!enrollee_id || !payment_type || !amount) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: enrollee_id, payment_type, and amount are required",
        },
        { status: 400 },
      );
    }

    // Check if enrollee already has a billing record
    const existingBilling = await prisma.billing.findFirst({
      where: { enrollee_id: Number(enrollee_id) },
    });

    if (existingBilling) {
      return NextResponse.json(
        { error: "This enrollee already has a payment record" },
        { status: 400 },
      );
    }

    const newBilling = await prisma.billing.create({
      data: {
        enrollee_id: Number(enrollee_id),
        term: term || null,
        is_paid: 1,
        date_paid: new Date(),
        user_id: user_id ? Number(user_id) : null,
        payment_type: payment_type,
        amount: Number(amount),
        reference_no: reference_no || null,
      },
    });

    // Update enrollment status to 2 (Enrolled/Paid) after payment
    await prisma.enrollment.update({
      where: { id: Number(enrollee_id) },
      data: { status: 2 },
    });

    return NextResponse.json(newBilling, { status: 201 });
  } catch (error: any) {
    console.error("Error creating billing:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create billing",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Update a billing record
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json(
        { error: "Missing billing ID" },
        { status: 400 },
      );
    }

    const validFields = [
      "term",
      "is_paid",
      "date_paid",
      "payment_type",
      "amount",
      "reference_no",
    ];
    const cleanData: any = {};

    for (const key of validFields) {
      if (updateData[key] !== undefined) {
        if (key === "amount") {
          cleanData[key] = Number(updateData[key]);
        } else if (key === "date_paid" && updateData[key]) {
          cleanData[key] = new Date(updateData[key]);
        } else {
          cleanData[key] = updateData[key];
        }
      }
    }

    const updatedBilling = await prisma.billing.update({
      where: { id: Number(id) },
      data: cleanData,
    });

    return NextResponse.json(updatedBilling);
  } catch (error: any) {
    console.error("Error updating billing:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to update billing",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Delete a billing record
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();

    const deletedBilling = await prisma.billing.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json(deletedBilling);
  } catch (error: any) {
    console.error("Error deleting billing:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to delete billing",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
