import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix");

    if (!prefix) {
      return NextResponse.json(
        { error: "Prefix parameter is required" },
        { status: 400 }
      );
    }

    // Fetch sections that start with the given prefix
    const sections = await prisma.sections.findMany({
      where: {
        section_name: {
          startsWith: prefix,
        },
      },
      select: {
        section_name: true,
      },
    });

    return NextResponse.json({
      success: true,
      sections: sections.map((s) => s.section_name),
    });
  } catch (error) {
    console.error("Error fetching sections by prefix:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
