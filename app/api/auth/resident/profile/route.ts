import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

interface ProfileUpdateData {
  student_number: string;
  contact_number?: string;
  email_address?: string;
  complete_address?: string;
  emergency_contact_name?: string;
  emergency_relationship?: string;
  emergency_contact_number?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const data: ProfileUpdateData = await request.json();

    if (!data.student_number) {
      return NextResponse.json(
        { error: "Student number is required" },
        { status: 400 }
      );
    }

    // Update student in students table if exists
    const student = await prisma.students.findUnique({
      where: { student_number: data.student_number },
    });

    if (student) {
      // Update students table
      const updatedStudent = await prisma.students.update({
        where: { student_number: data.student_number },
        data: {
          contact_number: data.contact_number || student.contact_number,
          email_address: data.email_address || student.email_address,
          guardian_name: data.emergency_contact_name || student.guardian_name,
          guardian_contact_number: data.emergency_contact_number || student.guardian_contact_number,
          // Address fields - you might need to parse complete_address
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedStudent,
        message: "Profile updated successfully",
      });
    } else {
      // Student doesn't exist in students table, update latest enrollment (ordered by most recent admission date)
      const lastEnrollment = await prisma.enrollment.findFirst({
        where: { student_number: data.student_number },
        orderBy: { admission_date: 'desc' },
      });

      if (!lastEnrollment) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      // Update the latest enrollment record
      const updatedEnrollment = await prisma.enrollment.update({
        where: { id: lastEnrollment.id },
        data: {
          contact_number: data.contact_number || lastEnrollment.contact_number,
          email_address: data.email_address || lastEnrollment.email_address,
          complete_address: data.complete_address || lastEnrollment.complete_address,
          emergency_contact_name: data.emergency_contact_name || lastEnrollment.emergency_contact_name,
          emergency_relationship: data.emergency_relationship || lastEnrollment.emergency_relationship,
          emergency_contact_number: data.emergency_contact_number || lastEnrollment.emergency_contact_number,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedEnrollment,
        message: "Profile updated successfully",
      });
    }
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

