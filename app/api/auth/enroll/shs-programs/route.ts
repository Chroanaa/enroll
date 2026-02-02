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

export async function PUT(request: NextRequest) {
  try {
    const { id, name } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Program ID is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Program name is required" },
        { status: 400 }
      );
    }

    // Check if program exists
    const existing = await prisma.shsProgram.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Check if another program with the same name exists
    const duplicate = await prisma.shsProgram.findFirst({
      where: {
        name: { equals: name.trim().toUpperCase(), mode: "insensitive" },
        id: { not: Number(id) },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Program name already exists" },
        { status: 409 }
      );
    }

    const oldName = existing.name;
    const newName = name.trim().toUpperCase();

    // Update the program
    const program = await prisma.shsProgram.update({
      where: { id: Number(id) },
      data: {
        name: newName,
      },
    });

    // Update all enrollments that use this program name
    if (oldName !== newName) {
      await prisma.enrollment.updateMany({
        where: {
          program_shs: oldName,
        },
        data: {
          program_shs: newName,
        },
      });
    }

    return NextResponse.json(
      { success: true, data: program },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating SHS program:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Program ID is required" },
        { status: 400 }
      );
    }

    // Check if program exists
    const existing = await prisma.shsProgram.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Check if program is being used in enrollments
    const enrollmentCount = await prisma.enrollment.count({
      where: {
        program_shs: existing.name,
      },
    });

    if (enrollmentCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete program. It is used in ${enrollmentCount} enrollment(s).`,
          enrollmentCount: enrollmentCount
        },
        { status: 409 }
      );
    }

    await prisma.shsProgram.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json(
      { success: true, message: "Program deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting SHS program:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


