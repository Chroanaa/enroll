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
