import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const programs = await prisma.shsProgram.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: programs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching SHS programs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Program name is required" },
        { status: 400 }
      );
    }

    // Check if program already exists
    const existing = await prisma.shsProgram.findFirst({
      where: { name: { equals: name.trim().toUpperCase(), mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Program already exists" },
        { status: 409 }
      );
    }

    const program = await prisma.shsProgram.create({
      data: {
        name: name.trim().toUpperCase(),
        is_custom: true,
      },
    });

    return NextResponse.json(
      { success: true, data: program },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating SHS program:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


