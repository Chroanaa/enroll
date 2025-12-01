import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...feeData } = data;
    const newFee = await prisma.fee.create({
      data: feeData,
    });
    return NextResponse.json(newFee);
  } catch (error: any) {
    console.error("Error creating fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create fee", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const fees = await prisma.fee.findMany();
    return NextResponse.json(fees);
  } catch (error: any) {
    console.error("Error fetching fees:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch fees", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedFee = await prisma.fee.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json(deletedFee);
  } catch (error: any) {
    console.error("Error deleting fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete fee", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, ...updateData } = data;
    const validFields = ["code", "name", "description", "amount", "category", "academic_year", "semester", "status"];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    const updatedFee = await prisma.fee.update({
      where: { id: Number(id) },
      data: {
        ...cleanData,
      },
    });
    return NextResponse.json(updatedFee);
  } catch (error: any) {
    console.error("Error updating fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update fee", details: error?.code || error },
      { status: 500 }
    );
  }
}
