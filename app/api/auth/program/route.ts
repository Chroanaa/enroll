import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newProgram = await prisma.program.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newProgram);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create program" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const programs = await prisma.program.findMany();
    return NextResponse.json(programs);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch programs" },
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
    const { id, ...updateData } = data;
    const validFields = ["name", "code", "description", "status"];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    const updatedProgram = await prisma.program.update({
      where: { id: data.id },
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
