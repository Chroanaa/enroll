import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, departmentName, ...restData } = data;
    
    // Only include valid fields from schema
    const validFields = ["code", "name", "description", "department_id", "duration", "total_units", "status"];
    const programData: any = {};
    
    validFields.forEach((field) => {
      if (restData[field] !== undefined) {
        programData[field] = restData[field];
      }
    });
    
    // Ensure required fields are present
    if (!programData.code || !programData.name) {
      return NextResponse.json(
        { error: "Missing required fields: code and name are required" },
        { status: 400 }
      );
    }
    
    // Set default status if not provided
    if (!programData.status) {
      programData.status = "active";
    }
    
    const newProgram = await prisma.program.create({
      data: programData,
    });
    return NextResponse.json(newProgram);
  } catch (error: any) {
    console.error("Error creating program:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create program", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const programs = await prisma.program.findMany();
    return NextResponse.json(programs);
  } catch (error: any) {
    console.error("Error fetching programs:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch programs", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedProgram = await prisma.program.delete({
      where: { id },
    });
    return NextResponse.json(deletedProgram);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete program" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, departmentName, ...updateData } = data;
    const validFields = ["code", "name", "description", "department_id", "duration", "total_units", "status"];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    const updatedProgram = await prisma.program.update({
      where: { id: Number(id) },
      data: {
        ...cleanData,
      },
    });
    return NextResponse.json(updatedProgram);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update program" },
      { status: 500 }
    );
  }
}
