import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

// Get enrolled students with status = 1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentNumber = searchParams.get("studentNumber");

    if (studentNumber) {
      // Search for specific student by student number
      const student = await prisma.enrollment.findFirst({
        where: {
          student_number: studentNumber,
          status: 1,
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
      });

      if (!student) {
        return NextResponse.json(
          { error: "Student not found or not enrolled" },
          { status: 404 },
        );
      }

      return NextResponse.json(student);
    }

    // Get all enrolled students
    const students = await prisma.enrollment.findMany({
      where: {
        status: 1,
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
    });

    return NextResponse.json(students);
  } catch (error: any) {
    console.error("Error fetching enrolled students:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch enrolled students",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
