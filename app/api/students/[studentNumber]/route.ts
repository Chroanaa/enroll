import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  ensureDeanStudentAccess,
  getSessionScope,
} from "@/app/lib/accessScope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentNumber: string }> },
) {
  try {
    const scope = await getSessionScope();
    const { studentNumber } = await params;

    // Search enrollment table first (ordered by most recent admission date)
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_number: studentNumber,
      },
      orderBy: {
        admission_date: "desc",
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const access = await ensureDeanStudentAccess(scope, {
      studentNumber,
      academicYear: enrollment.academic_year,
      semester: enrollment.term,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access });
    }

    // Fetch program data from program table
    let programData = null;

    // First, try to find program by ID if course_program is numeric
    if (enrollment.course_program) {
      const courseProgramValue = enrollment.course_program.trim();
      const isNumeric = /^\d+$/.test(courseProgramValue);

      let program = null;

      if (isNumeric) {
        // If course_program is numeric, treat it as program ID
        // Try with active status first
        program = await prisma.program.findFirst({
          where: {
            id: parseInt(courseProgramValue),
            status: "active",
          },
        });

        // If not found with active status, try without status filter
        if (!program) {
          program = await prisma.program.findFirst({
            where: {
              id: parseInt(courseProgramValue),
            },
          });
        }
      }

      // If not found by ID or not numeric, try by name or code
      if (!program) {
        program = await prisma.program.findFirst({
          where: {
            OR: [{ name: courseProgramValue }, { code: courseProgramValue }],
            status: "active",
          },
        });

        // If not found with active status, try without status filter
        if (!program) {
          program = await prisma.program.findFirst({
            where: {
              OR: [{ name: courseProgramValue }, { code: courseProgramValue }],
            },
          });
        }
      }

      if (program) {
        programData = {
          id: program.id,
          code: program.code,
          name: program.name,
          description: program.description,
          department_id: program.department_id,
          department_name: program.department_name,
        };
      }
    }

    // If still no program found and department exists, try to find program by department_id
    if (!programData && enrollment.department) {
      const program = await prisma.program.findFirst({
        where: {
          department_id: enrollment.department,
          status: "active",
        },
      });

      // If not found with active status, try without status filter
      if (!program) {
        const programInactive = await prisma.program.findFirst({
          where: {
            department_id: enrollment.department,
          },
        });
        if (programInactive) {
          programData = {
            id: programInactive.id,
            code: programInactive.code,
            name: programInactive.name,
            description: programInactive.description,
            department_id: programInactive.department_id,
            department_name: programInactive.department_name,
          };
        }
      } else {
        programData = {
          id: program.id,
          code: program.code,
          name: program.name,
          description: program.description,
          department_id: program.department_id,
          department_name: program.department_name,
        };
      }
    }

    // Fetch major data if major_id exists
    let majorData = null;
    if (enrollment.major_id) {
      const major = await prisma.major.findUnique({
        where: { id: enrollment.major_id },
      });
      if (major) {
        majorData = {
          id: major.id,
          code: major.code,
          name: major.name,
          program_id: major.program_id,
        };
      }
    }

    // Return data from enrollment table with joined program and major data
    return NextResponse.json({
      enrollment_id: enrollment.id,
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
      major_id: enrollment.major_id,
      year_level: enrollment.year_level,
      term: enrollment.term,
      academic_year: enrollment.academic_year,
      admission_date: enrollment.admission_date,
      admission_status: enrollment.admission_status,
      sex: enrollment.sex,
      civil_status: enrollment.civil_status,
      birthdate: enrollment.birthdate,
      birthplace: enrollment.birthplace,
      last_school_attended: enrollment.last_school_attended,
      previous_school_year: enrollment.previous_school_year,
      program_shs: enrollment.program_shs,
      remarks: enrollment.remarks,
      status: enrollment.status,
      program: programData,
      major: majorData,
      from_enrollment: true,
    });
  } catch (error) {
    console.error("Fetch student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
