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
        admission_date: formData.admissionDate
          ? new Date(formData.admissionDate)
          : null,
        admission_status: formData.admissionStatus || null,
        term: formData.term || null,
        department: formData.department,
        course_program: formData.courseProgram || null,
        requirements: formData.requirements || [],
        family_name: formData.familyName || null,
        first_name: formData.firstName || null,
        middle_name: formData.middleName || null,
        sex: formData.sex || null,
        civil_status: formData.civilStatus || null,
        birthdate: formData.birthdate ? new Date(formData.birthdate) : null,
        birthplace: formData.birthplace || null,
        complete_address: formData.completeAddress || null,
        contact_number: formData.contactNumber || null,
        email_address: formData.emailAddress || null,
        emergency_contact_name: formData.emergencyContactName || null,
        emergency_relationship: formData.emergencyRelationship || null,
        emergency_contact_number: formData.emergencyContactNumber || null,
        last_school_attended: formData.lastSchoolAttended || null,
        school_year: formData.schoolYear || null,
        program_shs: formData.programSHS || null,
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
