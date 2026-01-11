import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

interface ResidentEnrollmentData {
  student_number: string;
  term: string;
  department?: number;
  course_program?: string;
  academic_year?: string;
  remarks?: string;
  emergency_contact_name?: string;
  emergency_relationship?: string;
  emergency_contact_number?: string;
  contact_number?: string;
  email_address?: string;
  complete_address?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: ResidentEnrollmentData = await request.json();

    // Validate required fields
    if (!data.student_number || !data.term) {
      return NextResponse.json(
        { error: "Student number and term are required" },
        { status: 400 }
      );
    }

    // Fetch from enrollment table only (resident enrollment uses previous enrollment data)
    const lastEnrollment = await prisma.enrollment.findFirst({
      where: { student_number: data.student_number },
      orderBy: { admission_date: 'desc' },
    });

    if (!lastEnrollment) {
      return NextResponse.json(
        { error: "Student not found. Please enroll as a new student first." },
        { status: 404 }
      );
    }

    // Use data from last enrollment for re-enrollment
    const studentData = {
      first_name: lastEnrollment.first_name || "",
      middle_name: lastEnrollment.middle_name || "",
      last_name: lastEnrollment.family_name || "",
      email_address: lastEnrollment.email_address,
      contact_number: lastEnrollment.contact_number,
      complete_address: lastEnrollment.complete_address,
      emergency_contact_name: lastEnrollment.emergency_contact_name,
      emergency_relationship: lastEnrollment.emergency_relationship,
      emergency_contact_number: lastEnrollment.emergency_contact_number,
    };

    // Create new enrollment record for the term
    const enrollment = await prisma.enrollment.create({
      data: {
        student_number: data.student_number,
        admission_date: new Date(),
        admission_status: "transferee", // Resident students re-enrolling (returning option removed)
        term: data.term,
        department: data.department || lastEnrollment.department || null,
        course_program: data.course_program || lastEnrollment.course_program || null,
        family_name: studentData.last_name || "",
        first_name: studentData.first_name || "",
        middle_name: studentData.middle_name || null,
        contact_number: data.contact_number || studentData.contact_number || null,
        email_address: data.email_address || studentData.email_address || null,
        complete_address: data.complete_address || studentData.complete_address || null,
        emergency_contact_name: data.emergency_contact_name || studentData.emergency_contact_name || null,
        emergency_relationship: data.emergency_relationship || studentData.emergency_relationship || null,
        emergency_contact_number: data.emergency_contact_number || studentData.emergency_contact_number || null,
        remarks: data.remarks || null,
        academic_year: data.academic_year || null,
      } as any, // Type assertion until Prisma client is regenerated
    });

    return NextResponse.json(
      {
        success: true,
        data: enrollment,
        message: "Re-enrollment submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Resident enrollment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

