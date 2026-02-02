import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET discounts with optional semester filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");

    const whereClause: any = {
      status: "active",
    };

    // Filter by semester if provided
    if (semester) {
      whereClause.semester = semester;
    }

    const discounts = await prisma.discount.findMany({
      where: whereClause,
      orderBy: [
        { percentage: "desc" }, // Highest percentage first
        { code: "asc" },
      ],
    });

    return NextResponse.json(discounts);
  } catch (error: any) {
    console.error("Error fetching discounts:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch discounts",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

// POST - Create a new discount
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, percentage, semester, status } = body;

    if (!code || !name || percentage === undefined || !semester || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const discount = await prisma.discount.create({
      data: {
        code,
        name,
        percentage: parseFloat(percentage),
        semester,
        status,
      },
    });

    return NextResponse.json(discount, { status: 201 });
  } catch (error: any) {
    console.error("Error creating discount:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create discount",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

// PUT - Update a discount
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, code, name, percentage, semester, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Discount ID is required" }, { status: 400 });
    }

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(percentage !== undefined && { percentage: parseFloat(percentage) }),
        ...(semester && { semester }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(discount);
  } catch (error: any) {
    console.error("Error updating discount:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to update discount",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a discount
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Discount ID is required" }, { status: 400 });
    }

    await prisma.discount.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Discount deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting discount:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to delete discount",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

