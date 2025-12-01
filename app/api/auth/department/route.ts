import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, buildingName, ...departmentData } = data;
    
    // Ensure required fields are present
    if (!departmentData.code || !departmentData.name) {
      return NextResponse.json(
        { error: "Missing required fields: code and name are required" },
        { status: 400 }
      );
    }
    
    // Set default status if not provided
    if (!departmentData.status) {
      departmentData.status = "active";
    }
    
    const newDepartment = await prisma.department.create({
      data: departmentData,
    });
    return NextResponse.json(newDepartment);
  } catch (error: any) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create department", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const departments = await prisma.department.findMany();
    return NextResponse.json(departments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedDepartment = await prisma.department.delete({
      where: { id },
    });
    return NextResponse.json(deletedDepartment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, buildingName, ...updateData } = data;

    const updatedDepartment = await prisma.department.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(updatedDepartment);
  } catch (error: any) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update department", details: error?.code || error },
      { status: 500 }
    );
  }
}
