import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: schools }, { status: 200 });
  } catch (error) {
    console.error("Error fetching schools:", error);
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
        { error: "School name is required" },
        { status: 400 }
      );
    }

    // Check if school already exists
    const existing = await prisma.school.findFirst({
      where: { name: { equals: name.trim().toUpperCase(), mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "School already exists" },
        { status: 409 }
      );
    }

    const school = await prisma.school.create({
      data: {
        name: name.trim().toUpperCase(),
        is_custom: true,
      },
    });

    return NextResponse.json(
      { success: true, data: school },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


