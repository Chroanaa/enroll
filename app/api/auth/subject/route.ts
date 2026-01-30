import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...subjectData } = data;
    
    // Ensure required fields are present
    if (!subjectData.code || !subjectData.name || (!subjectData.units_lec && !subjectData.units_lab)) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, and at least one unit (lecture or lab) are required" },
        { status: 400 }
      );
    }
    
    // Validate fixedAmount if provided (must be non-negative)
    if (subjectData.fixedAmount !== undefined && subjectData.fixedAmount !== null) {
      const fixedAmount = Number(subjectData.fixedAmount);
      if (isNaN(fixedAmount) || fixedAmount < 0) {
        return NextResponse.json(
          { error: "fixedAmount must be a valid non-negative decimal number" },
          { status: 400 }
        );
      }
      subjectData.fixedAmount = fixedAmount;
    }
    
    // Set default status if not provided
    if (!subjectData.status) {
      subjectData.status = "active";
    }
    
    const newSubject = await prisma.subject.create({
      data: subjectData,
    });
    return NextResponse.json(newSubject);
  } catch (error: any) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create subject", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany();
    return NextResponse.json(subjects);
    } catch (error: any) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch subjects", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedSubject = await prisma.subject.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json(deletedSubject);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, ...updateData } = data;
    
    // Validate fixedAmount if provided (must be non-negative)
    if (updateData.fixedAmount !== undefined && updateData.fixedAmount !== null) {
      const fixedAmount = Number(updateData.fixedAmount);
      if (isNaN(fixedAmount) || fixedAmount < 0) {
        return NextResponse.json(
          { error: "fixedAmount must be a valid non-negative decimal number" },
          { status: 400 }
        );
      }
      updateData.fixedAmount = fixedAmount;
    }
    
    const updatedSubject = await prisma.subject.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(updatedSubject);
  } catch (error: any) {
    console.error("Error updating subject:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update subject", details: error?.code || error },
      { status: 500 }
    );
  }
}
