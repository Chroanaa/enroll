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
