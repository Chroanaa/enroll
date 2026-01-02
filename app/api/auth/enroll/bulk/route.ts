import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  const data = await request.json();

  try {
    prisma.enrollment.createMany({
      data: data,
      skipDuplicates: true,
    });
  } catch (error) {
    console.error("Excel import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
