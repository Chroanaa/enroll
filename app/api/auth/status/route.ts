import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const status = await prisma.enrollment.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
      where: {
        status: {
          not: null,
        },
      },
    });
    
    console.log('Status API response:', status);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.error();
  }
}
