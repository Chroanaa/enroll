import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const currentYear = new Date().getFullYear().toString().substring(2);
    
    const enrollments = await prisma.enrollment.findMany({
      where: {
        student_number: {
          not: null,
          startsWith: currentYear,
        },
      },
      select: {
        student_number: true,
      },
    });

    const students = await prisma.students.findMany({
      where: {
        student_number: {
          startsWith: currentYear,
        },
      },
      select: {
        student_number: true,
      },
    });

    let maxNumber = 0;

    // Process all enrollment student numbers - only consider numeric suffixes
    for (const enrollment of enrollments) {
      if (enrollment.student_number) {
        const numberPart = enrollment.student_number.substring(3); // Remove "YY-"
        // Check if the suffix is purely numeric (matches pattern YY-NNNNN)
        if (/^\d+$/.test(numberPart)) {
          const number = parseInt(numberPart, 10);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    }

    // Process all student student numbers - only consider numeric suffixes
    for (const student of students) {
      if (student.student_number) {
        const numberPart = student.student_number.substring(3); // Remove "YY-"
        // Check if the suffix is purely numeric (matches pattern YY-NNNNN)
        if (/^\d+$/.test(numberPart)) {
          const number = parseInt(numberPart, 10);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    }

    // Set next number to max + 1 (or 1 if no numeric student numbers found)
    const nextNumber = maxNumber + 1;

    // Ensure the number is 5 digits with leading zeros
    const fiveDigitNumber = nextNumber.toString().padStart(5, '0');
    const newStudentNumber = `${currentYear}-${fiveDigitNumber}`;

    return NextResponse.json({ student_number: newStudentNumber }, { status: 200 });
  } catch (error) {
    console.error("Generate student ID error:", error);
    return NextResponse.json(
      { error: "Failed to generate student ID" },
      { status: 500 }
    );
  }
}

