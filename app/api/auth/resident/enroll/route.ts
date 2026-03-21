import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getSessionScope } from "@/app/lib/accessScope";

interface ResidentEnrollmentData {
  enrollment_id?: number;
  student_number: string;
  term?: string;
  department?: number;
  course_program?: string;
  major_id?: number;
  year_level?: number;
  academic_year?: string;
  remarks?: string;
  emergency_contact_name?: string;
  emergency_relationship?: string;
  emergency_contact_number?: string;
  contact_number?: string;
  email_address?: string;
  complete_address?: string;
  admission_status?: string;
  sex?: string;
  civil_status?: string;
  birthdate?: string;
  birthplace?: string;
  last_school_attended?: string;
  previous_school_year?: string;
  program_shs?: string;
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (scope.isDean) {
      return NextResponse.json(
        { error: "Forbidden. Dean accounts cannot manage resident enrollment." },
        { status: 403 },
      );
    }

    const data: ResidentEnrollmentData = await request.json();

    // Validate required fields
    if (!data.student_number) {
      return NextResponse.json(
        { error: "Student number is required" },
        { status: 400 },
      );
    }

    // Find the enrollment record to update
    let enrollmentToUpdate = null;

    if (data.enrollment_id) {
      // Use provided enrollment_id
      enrollmentToUpdate = await prisma.enrollment.findUnique({
        where: { id: data.enrollment_id },
      });
    } else {
      // Find most recent enrollment for this student
      enrollmentToUpdate = await prisma.enrollment.findFirst({
        where: { student_number: data.student_number },
        orderBy: { admission_date: "desc" },
      });
    }

    if (!enrollmentToUpdate) {
      return NextResponse.json(
        {
          error:
            "Student enrollment not found. Please enroll as a new student first.",
        },
        { status: 404 },
      );
    }

    // Build update data - only include fields that are provided (changed)
    const updateData: any = {};

    // Handle program and major updates
    let finalDepartmentId = enrollmentToUpdate.department;
    let finalCourseProgram = enrollmentToUpdate.course_program;
    let finalMajorId = enrollmentToUpdate.major_id;

    if (data.major_id && data.major_id !== 0) {
      // If major is provided, get program and department from major
      const majorIdNum = parseInt(String(data.major_id));
      const selectedMajor = await prisma.major.findUnique({
        where: { id: majorIdNum },
      });

      if (selectedMajor) {
        finalMajorId = majorIdNum;
        finalCourseProgram = String(selectedMajor.program_id);

        const selectedProgram = await prisma.program.findUnique({
          where: { id: selectedMajor.program_id },
        });

        if (selectedProgram && selectedProgram.department_id) {
          finalDepartmentId = selectedProgram.department_id;
        }
      }
    } else if (
      data.course_program &&
      data.course_program !== "0" &&
      data.course_program !== ""
    ) {
      // If program is provided (but no major), get department from program
      const programIdNum = parseInt(data.course_program);
      if (!isNaN(programIdNum)) {
        const selectedProgram = await prisma.program.findUnique({
          where: { id: programIdNum },
        });

        if (selectedProgram) {
          finalCourseProgram = data.course_program;
          if (selectedProgram.department_id) {
            finalDepartmentId = selectedProgram.department_id;
          }
        }
      }
    }

    // Auto-set admission_status to "Resident" for all re-enrollments
    updateData.admission_status = "Resident";

    // Auto-increment year level logic:
    // Only increment when: Previous Term = Second Semester AND New Term = First Semester AND Academic Year changes
    if (
      data.term &&
      data.academic_year &&
      enrollmentToUpdate.term &&
      enrollmentToUpdate.academic_year
    ) {
      const previousTerm = enrollmentToUpdate.term.toLowerCase();
      const newTerm = data.term.toLowerCase();
      const previousAcademicYear = enrollmentToUpdate.academic_year;
      const newAcademicYear = data.academic_year;

      // Check if we're moving from 2nd Sem to 1st Sem with a new academic year
      const isSecondToFirst = previousTerm === "second" && newTerm === "first";
      const isNewAcademicYear = previousAcademicYear !== newAcademicYear;

      if (isSecondToFirst && isNewAcademicYear) {
        // Increment year level
        const currentYearLevel = enrollmentToUpdate.year_level || 1;
        const newYearLevel = Math.min(currentYearLevel + 1, 5); // Cap at 5th year
        updateData.year_level = newYearLevel;
      } else if (data.year_level !== undefined) {
        // If year_level is explicitly provided, use it
        updateData.year_level = data.year_level;
      } else {
        // Otherwise, keep the existing year level
        updateData.year_level = enrollmentToUpdate.year_level;
      }
    } else if (data.year_level !== undefined) {
      // If year_level is explicitly provided, use it
      updateData.year_level = data.year_level;
    }

    // Only update fields that are provided in the request
    if (data.term !== undefined) updateData.term = data.term;
    if (data.academic_year !== undefined)
      updateData.academic_year = data.academic_year;
    if (data.contact_number !== undefined)
      updateData.contact_number = data.contact_number;
    if (data.email_address !== undefined)
      updateData.email_address = data.email_address;
    if (data.complete_address !== undefined)
      updateData.complete_address = data.complete_address;
    if (data.emergency_contact_name !== undefined)
      updateData.emergency_contact_name = data.emergency_contact_name;
    if (data.emergency_relationship !== undefined)
      updateData.emergency_relationship = data.emergency_relationship;
    if (data.emergency_contact_number !== undefined)
      updateData.emergency_contact_number = data.emergency_contact_number;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    // admission_status is always set to "Resident" above, don't allow frontend to override
    if (data.sex !== undefined) updateData.sex = data.sex;
    if (data.civil_status !== undefined)
      updateData.civil_status = data.civil_status;
    if (data.birthdate !== undefined)
      updateData.birthdate = data.birthdate ? new Date(data.birthdate) : null;
    if (data.birthplace !== undefined) updateData.birthplace = data.birthplace;
    if (data.last_school_attended !== undefined)
      updateData.last_school_attended = data.last_school_attended;
    if (data.previous_school_year !== undefined)
      updateData.previous_school_year = data.previous_school_year;
    if (data.program_shs !== undefined)
      updateData.program_shs = data.program_shs;

    // Update program/major/department if changed
    if (data.course_program !== undefined || data.major_id !== undefined) {
      updateData.course_program = finalCourseProgram;
      updateData.major_id = finalMajorId;
      updateData.department = finalDepartmentId;
    }

    // Perform update
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentToUpdate.id },
      data: updateData,
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedEnrollment,
        message: "Re-enrollment updated successfully",
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Resident enrollment error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Internal server error",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
