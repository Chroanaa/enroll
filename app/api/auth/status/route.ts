import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const status = await prisma.enrollment.groupBy({
      by: ["admission_status"],
      _count: {
        admission_status: true,
      },
    });
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.error();
  }
}
