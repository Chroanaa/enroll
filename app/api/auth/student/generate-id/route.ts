import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const currentYear = new Date().getFullYear().toString().substring(2);
    
    // Find latest student_number from students table
    const students = await prisma.students.findMany({
      where: {
        student_number: {
          startsWith: currentYear,
        },
      },
      select: {
        student_number: true,
      },
      orderBy: {
        student_number: 'desc',
      },
      take: 1,
    });

    // Find latest student_number from enrollment table
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
      orderBy: {
        student_number: 'desc',
      },
      take: 1,
    });

    let nextNumber = 1;
    let maxNumber = 0;

    // Check students table
    if (students.length > 0 && students[0].student_number) {
      const lastStudentNumber = students[0].student_number;
      // Remove the year and dash (first 3 characters: YY-)
      const numberPart = lastStudentNumber.substring(3);
      const lastNumber = parseInt(numberPart, 10);
      if (!isNaN(lastNumber) && lastNumber > maxNumber) {
        maxNumber = lastNumber;
      }
    }

    // Check enrollment table
    if (enrollments.length > 0 && enrollments[0].student_number) {
      const lastEnrollmentNumber = enrollments[0].student_number;
      // Remove the year and dash (first 3 characters: YY-)
      const numberPart = lastEnrollmentNumber.substring(3);
      const lastNumber = parseInt(numberPart, 10);
      if (!isNaN(lastNumber) && lastNumber > maxNumber) {
        maxNumber = lastNumber;
      }
    }

    // Set next number to max + 1
    if (maxNumber > 0) {
      nextNumber = maxNumber + 1;
    }

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

