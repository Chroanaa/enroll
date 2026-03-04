import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { getProgramsWithMajorsFromDB } from "../../utils/programUtils";

export async function GET(request: NextRequest) {
  try {
    const result = await getProgramsWithMajorsFromDB(prisma);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching programs with majors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
