import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { studentNumber: string } }
) {
  try {
    const { studentNumber } = params;

    // Fetch student from students table
    const student = await prisma.students.findUnique({
      where: {
        student_number: studentNumber,
      },
    });

    if (!student) {
      // Also check enrollment table for student data (ordered by most recent admission date)
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

      // Return data from enrollment table if student doesn't exist in students table
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
    }

    // Return data from students table
    return NextResponse.json({
      student_id: student.student_id,
      student_number: student.student_number,
      first_name: student.first_name,
      middle_name: student.middle_name,
      last_name: student.last_name,
      suffix: student.suffix,
      gender: student.gender,
      date_of_birth: student.date_of_birth,
      place_of_birth: student.place_of_birth,
      nationality: student.nationality,
      civil_status: student.civil_status,
      email_address: student.email_address,
      contact_number: student.contact_number,
      street: student.street,
      barangay: student.barangay,
      city: student.city,
      province: student.province,
      postal_code: student.postal_code,
      father_name: student.father_name,
      mother_name: student.mother_name,
      guardian_name: student.guardian_name,
      guardian_contact_number: student.guardian_contact_number,
      guardian_address: student.guardian_address,
      course_id: student.course_id,
      year_level: student.year_level,
      section_id: student.section_id,
      academic_year: student.academic_year,
      from_enrollment: false,
    });
  } catch (error) {
    console.error("Fetch student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

