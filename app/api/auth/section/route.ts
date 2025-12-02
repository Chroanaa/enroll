import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, programName, ...sectionData } = data;

    // Ensure required fields are present
    if (!sectionData.section_name || !sectionData.program_id) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: section_name and program_id are required",
        },
        { status: 400 }
      );
    }

    // Set default values if not provided
    if (sectionData.student_count === undefined) {
      sectionData.student_count = 0;
    }
    if (!sectionData.status) {
      sectionData.status = "active";
    }

    const newSection = await prisma.sections.create({
      data: sectionData,
    });
    return NextResponse.json(newSection);
  } catch (error: any) {
    console.error("Error creating section:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create section",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sections = await prisma.sections.findMany();
    return NextResponse.json(sections);
  } catch (error: any) {
    console.error("Error fetching sections:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch sections",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedSection = await prisma.sections.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json(deletedSection);
  } catch (error: any) {
    console.error("Error deleting section:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to delete section",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, programName, ...updateData } = data;

    const updatedSection = await prisma.sections.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(updatedSection);
  } catch (error: any) {
    console.error("Error updating section:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to update section",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}
