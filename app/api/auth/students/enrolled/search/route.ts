import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

// Search enrolled students with status = 1 (for autocomplete)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    const searchTerm = query.trim();

    // Search enrolled students by name or student number
    const students = await prisma.enrollment.findMany({
      where: {
        status: 1, // Only enrolled/active students
        OR: [
          {
            student_number: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            first_name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            middle_name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            family_name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
        term: true,
        academic_year: true,
      },
      orderBy: {
        family_name: "asc",
      },
      take: limit,
    });

    return NextResponse.json(students);
  } catch (error: any) {
    console.error("Error searching enrolled students:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to search enrolled students",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
