import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newMajor = await prisma.major.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newMajor);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create major" },
      { status: 500 }
    );
  }
}

