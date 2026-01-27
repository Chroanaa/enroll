import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> | { programId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const programId = parseInt(resolvedParams.programId);

    if (isNaN(programId)) {
      return NextResponse.json(
        { error: "Invalid program ID" },
        { status: 400 }
      );
    }

    const majors = await prisma.major.findMany({
      where: {
        program_id: programId,
        status: "active",
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(majors);
  } catch (error: any) {
    console.error("Error fetching majors by program:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch majors", details: error?.code || error },
      { status: 500 }
    );
  }
}

