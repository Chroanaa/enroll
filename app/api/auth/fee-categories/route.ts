import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category_type = searchParams.get("category_type") || "miscellaneous";

    const categories = await prisma.fee_category.findMany({
      where: {
        category_type,
      },
      include: {
        _count: {
          select: {
            miscellaneous_fees: true,
          },
        },
      },
      orderBy: { academic_year: "desc" },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Error fetching fee categories:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch fee categories", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const newCategory = await prisma.fee_category.create({
      data,
    });
    
    return NextResponse.json(newCategory);
  } catch (error: any) {
    console.error("Error creating fee category:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create fee category", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    const updatedCategory = await prisma.fee_category.update({
      where: { id: Number(id) },
      data: updateData,
    });
    
    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error("Error updating fee category:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update fee category", details: error?.code || error },
      { status: 500 }
    );
  }
}
