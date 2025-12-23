import { prisma } from "../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newReports = await prisma.reports.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newReports, { status: 201 });
  } catch (error) {
    console.error("Section creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
