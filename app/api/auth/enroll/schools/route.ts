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

export async function PUT(request: NextRequest) {
  try {
    const { id, name } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "School name is required" },
        { status: 400 }
      );
    }

    // Check if school exists
    const existing = await prisma.school.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Check if another school with the same name exists
    const duplicate = await prisma.school.findFirst({
      where: {
        name: { equals: name.trim().toUpperCase(), mode: "insensitive" },
        id: { not: Number(id) },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "School name already exists" },
        { status: 409 }
      );
    }

    const oldName = existing.name;
    const newName = name.trim().toUpperCase();

    // Update the school
    const school = await prisma.school.update({
      where: { id: Number(id) },
      data: {
        name: newName,
      },
    });

    // Update all enrollments that use this school name
    if (oldName !== newName) {
      await prisma.enrollment.updateMany({
        where: {
          last_school_attended: oldName,
        },
        data: {
          last_school_attended: newName,
        },
      });
    }

    return NextResponse.json(
      { success: true, data: school },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating school:", error);
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
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Check if school exists
    const existing = await prisma.school.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Check if school is being used in enrollments
    const enrollmentCount = await prisma.enrollment.count({
      where: {
        last_school_attended: existing.name,
      },
    });

    if (enrollmentCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete school. It is used in ${enrollmentCount} enrollment(s).`,
          enrollmentCount: enrollmentCount
        },
        { status: 409 }
      );
    }

    await prisma.school.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json(
      { success: true, message: "School deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


