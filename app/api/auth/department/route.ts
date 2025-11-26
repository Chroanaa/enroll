import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newDepartment = await prisma.department.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newDepartment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create department" },
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
