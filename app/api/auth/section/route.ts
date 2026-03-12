import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

const normalizeSemesterValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "first" || normalized === "first semester") return "first";
  if (normalized === "2" || normalized === "second" || normalized === "second semester") return "second";
  if (normalized === "3" || normalized === "summer") return "summer";
  return null;
};


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
    // Validate max_capacity if provided
    if (sectionData.max_capacity !== undefined) {
      const cap = parseInt(sectionData.max_capacity);
      if (isNaN(cap) || cap < 1) {
        return NextResponse.json(
          { error: "max_capacity must be a positive integer" },
          { status: 400 }
        );
      }
      sectionData.max_capacity = cap;
    }
    if (!sectionData.status) {
      sectionData.status = "active";
    }

    if (sectionData.semester) {
      const normalizedSemester = normalizeSemesterValue(sectionData.semester.toString());
      if (!normalizedSemester) {
        return NextResponse.json(
          {
            error: "Invalid semester value. Use 'first', 'second', or 'summer'.",
          },
          { status: 400 }
        );
      }
      sectionData.semester = normalizedSemester;
    }

    if (sectionData.academic_year !== undefined && sectionData.academic_year !== null) {
      sectionData.academic_year = sectionData.academic_year.toString();
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

    if (updateData.semester) {
      const normalizedSemester = normalizeSemesterValue(updateData.semester.toString());
      if (!normalizedSemester) {
        return NextResponse.json(
          {
            error: "Invalid semester value. Use 'first', 'second', or 'summer'.",
          },
          { status: 400 }
        );
      }
      updateData.semester = normalizedSemester;
    }

    if (updateData.max_capacity !== undefined) {
      const cap = parseInt(updateData.max_capacity);
      if (isNaN(cap) || cap < 1) {
        return NextResponse.json(
          { error: "max_capacity must be a positive integer" },
          { status: 400 }
        );
      }
      updateData.max_capacity = cap;
    }

    if (updateData.academic_year !== undefined && updateData.academic_year !== null) {
      updateData.academic_year = updateData.academic_year.toString();
    }

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
