import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { first_name, family_name, middle_name, birthdate } =
      await request.json();

    if (!first_name || !family_name) {
      return NextResponse.json(
        { error: "First name and family name are required" },
        { status: 400 },
      );
    }

    // Check for duplicate enrollment based on first name, family name, middle name, and birthdate
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        first_name: {
          equals: first_name.trim().toUpperCase(),
          mode: "insensitive",
        },
        family_name: {
          equals: family_name.trim().toUpperCase(),
          mode: "insensitive",
        },
        ...(middle_name &&
          middle_name.trim() && {
            middle_name: {
              equals: middle_name.trim().toUpperCase(),
              mode: "insensitive",
            },
          }),
        ...(birthdate && {
          birthdate: new Date(birthdate),
        }),
      },
      select: {
        id: true,
        first_name: true,
        family_name: true,
        middle_name: true,
        student_number: true,
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({
        isDuplicate: true,
        message: `A student with the name "${first_name} ${middle_name ? middle_name + " " : ""}${family_name}" already exists in the system.`,
        existingStudent: {
          student_number: existingEnrollment.student_number,
        },
      });
    }

    return NextResponse.json({
      isDuplicate: false,
      message: "No duplicate found",
    });
  } catch (error) {
    console.error("Duplicate check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
