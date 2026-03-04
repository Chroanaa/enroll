import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academic_year = searchParams.get("academic_year");

    // Fetch fees with category title
    const fees = await prisma.miscellaneous_fee.findMany({
      where: academic_year ? {
        category: {
          academic_year: academic_year
        }
      } : {},
      include: {
        category: {
          select: {
            title: true,
            academic_year: true,
            description: true
          }
        }
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(fees);
  } catch (error: any) {
    console.error("Error fetching miscellaneous fees:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch miscellaneous fees", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...feeData } = data;
    
    const newFee = await prisma.miscellaneous_fee.create({
      data: feeData,
    });
    
    return NextResponse.json(newFee);
  } catch (error: any) {
    console.error("Error creating miscellaneous fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create miscellaneous fee", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    const validFields = ["item", "amount", "status"];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    
    const updatedFee = await prisma.miscellaneous_fee.update({
      where: { id: Number(id) },
      data: cleanData,
    });
    
    return NextResponse.json(updatedFee);
  } catch (error: any) {
    console.error("Error updating miscellaneous fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update miscellaneous fee", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    
    const deletedFee = await prisma.miscellaneous_fee.delete({
      where: { id: Number(id) },
    });
    
    return NextResponse.json(deletedFee);
  } catch (error: any) {
    console.error("Error deleting miscellaneous fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete miscellaneous fee", details: error?.code || error },
      { status: 500 }
    );
  }
}
