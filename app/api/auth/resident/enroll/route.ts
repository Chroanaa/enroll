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

    // Verify student exists
    const student = await prisma.students.findUnique({
      where: { student_number: data.student_number },
    });

    // If student doesn't exist in students table, check enrollment table
    let studentData = null;
    if (!student) {
      const lastEnrollment = await prisma.enrollment.findFirst({
        where: { student_number: data.student_number },
        orderBy: { id: 'desc' },
      });

      if (!lastEnrollment) {
        return NextResponse.json(
          { error: "Student not found. Please enroll as a new student first." },
          { status: 404 }
        );
      }

      // Use data from last enrollment
      studentData = {
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
    } else {
      studentData = {
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        email_address: student.email_address,
        contact_number: student.contact_number,
        complete_address: `${student.street || ""} ${student.barangay || ""} ${student.city || ""} ${student.province || ""}`.trim(),
        emergency_contact_name: student.guardian_name,
        emergency_relationship: "Guardian",
        emergency_contact_number: student.guardian_contact_number,
      };
    }

    // Create new enrollment record for the term
    const enrollment = await prisma.enrollment.create({
      data: {
        student_number: data.student_number,
        admission_date: new Date(),
        admission_status: "returning", // Resident students are returning
        term: data.term,
        department: data.department || (student?.course_id ? null : data.department),
        course_program: data.course_program || (student?.course_id ? null : data.course_program),
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
        school_year: data.academic_year || null,
      },
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

