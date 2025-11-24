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

