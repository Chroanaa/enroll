import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentNumber: string }> }
) {
  try {
    const { studentNumber } = await params;

    // Search enrollment table first (ordered by most recent admission date)
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_number: studentNumber,
      },
      orderBy: {
        admission_date: 'desc',
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Return data from enrollment table
    return NextResponse.json({
      student_number: enrollment.student_number,
      first_name: enrollment.first_name,
      middle_name: enrollment.middle_name,
      last_name: enrollment.family_name,
      email_address: enrollment.email_address,
      contact_number: enrollment.contact_number,
      complete_address: enrollment.complete_address,
      emergency_contact_name: enrollment.emergency_contact_name,
      emergency_relationship: enrollment.emergency_relationship,
      emergency_contact_number: enrollment.emergency_contact_number,
      department: enrollment.department,
      course_program: enrollment.course_program,
      from_enrollment: true, // Flag to indicate data is from enrollment table
    });
  } catch (error) {
    console.error("Fetch student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

