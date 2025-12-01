import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, programName, ...restData } = data;
    
    // Only include valid fields from schema
    const validFields = ["code", "name", "description", "program_id", "status"];
    const majorData: any = {};
    
    validFields.forEach((field) => {
      if (restData[field] !== undefined) {
        majorData[field] = restData[field];
      }
    });
    
    // Ensure required fields are present
    if (!majorData.code || !majorData.name || !majorData.program_id) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, and program_id are required" },
        { status: 400 }
      );
    }
    
    // Set default status if not provided
    if (!majorData.status) {
      majorData.status = "active";
    }
    
    const newMajor = await prisma.major.create({
      data: majorData,
    });
    return NextResponse.json(newMajor);
  } catch (error: any) {
    console.error("Error creating major:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create major", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const majors = await prisma.major.findMany();
    return NextResponse.json(majors);
  } catch (error: any) {
    console.error("Error fetching majors:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch majors", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedMajor = await prisma.major.delete({
      where: { id },
    });
    return NextResponse.json(deletedMajor);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete major" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, programName, ...updateData } = data;
    const validFields = ["code", "name", "description", "program_id", "status"];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    const updatedMajor = await prisma.major.update({
      where: { id: Number(id) },
      data: {
        ...cleanData,
      },
    });
    return NextResponse.json(updatedMajor);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update major" },
      { status: 500 }
    );
  }
}
