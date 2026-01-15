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
            OR: [
              { name: courseProgramValue },
              { code: courseProgramValue },
            ],
            status: "active",
          },
        });
        
        // If not found with active status, try without status filter
        if (!program) {
          program = await prisma.program.findFirst({
            where: {
              OR: [
                { name: courseProgramValue },
                { code: courseProgramValue },
              ],
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

    // Return data from enrollment table with joined program data
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
      course_program: enrollment.course_program, // Keep original for backward compatibility
      program: programData, // Add joined program data
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

