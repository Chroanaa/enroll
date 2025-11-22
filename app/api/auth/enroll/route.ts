import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { EnrollmentFormData } from "@/app/hooks/useEnrollmentForm";
import { useSession } from "next-auth/react";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const formData: EnrollmentFormData = body.formData;

    const enrollment = await prisma.enrollment.create({
      data: {
        admission_date: formData.admission_date
          ? new Date(formData.admission_date)
          : null,
        admission_status: formData.admission_status || null,
        term: formData.term || null,
        department: formData.department ? parseInt(formData.department) : null,
        course_program: formData.course_program || null,
        requirements: formData.requirements || [],
        family_name: formData.family_name || null,
        first_name: formData.first_name || null,
        middle_name: formData.middle_name || null,
        sex: formData.sex || null,
        civil_status: formData.civil_status || null,
        birthdate: formData.birthdate ? new Date(formData.birthdate) : null,
        birthplace: formData.birthplace || null,
        complete_address: formData.complete_address || null,
        contact_number: formData.contact_number || null,
        email_address: formData.email_address || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_relationship: formData.emergency_relationship || null,
        emergency_contact_number: formData.emergency_contact_number || null,
        last_school_attended: formData.last_school_attended || null,
        school_year: formData.school_year || null,
        program_shs: formData.program_shs || null,
        remarks: formData.remarks || null,
      },
    });
    if (!enrollment) {
      return NextResponse.json(
        { error: "Failed to create enrollment" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: enrollment,
        message: "Enrollment submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const enrollments = await prisma.enrollment.findMany();
    return NextResponse.json({ data: enrollments }, { status: 200 });
  } catch (error) {
    console.error("Fetch enrollments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
