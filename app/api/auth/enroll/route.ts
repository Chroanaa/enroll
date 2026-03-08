import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import path from "path";

// Helper function to generate unique filename
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName) || ".jpg";
  return `${timestamp}-${randomString}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await request.formData();

    // Extract all form fields
    const student_number = formData.get("student_number") as string | null;
    const admission_date = formData.get("admission_date") as string | null;
    const admission_status = formData.get("admission_status") as string | null;
    const term = formData.get("term") as string | null;
    const department = formData.get("department") as string | null;
    const course_program = formData.get("course_program") as string | null;
    const major_id = formData.get("major_id") as string | null;
    const year_level = formData.get("year_level") as string | null;
    const requirementsStr = formData.get("requirements") as string | null;
    const requirements = requirementsStr ? JSON.parse(requirementsStr) : [];
    const family_name = formData.get("family_name") as string | null;
    const first_name = formData.get("first_name") as string | null;
    const middle_name = formData.get("middle_name") as string | null;
    const sex = formData.get("sex") as string | null;
    const civil_status = formData.get("civil_status") as string | null;
    const birthdate = formData.get("birthdate") as string | null;
    const birthplaceStr = formData.get("birthplace") as string | null;
    // Parse birthplace array: [province, city]
    let birthplace: string[] | null = null;
    if (birthplaceStr) {
      try {
        birthplace = JSON.parse(birthplaceStr);
        if (!Array.isArray(birthplace) || birthplace.length !== 2) {
          birthplace = null;
        }
      } catch {
        // If not valid JSON array, treat as null
        birthplace = null;
      }
    }
    const complete_address = formData.get("complete_address") as string | null;
    const contact_number = formData.get("contact_number") as string | null;
    const email_address = formData.get("email_address") as string | null;
    const emergency_contact_name = formData.get("emergency_contact_name") as
      | string
      | null;
    const emergency_relationship = formData.get("emergency_relationship") as
      | string
      | null;
    const emergency_contact_number = formData.get(
      "emergency_contact_number",
    ) as string | null;
    const last_school_attended = formData.get("last_school_attended") as
      | string
      | null;
    const previous_school_year = formData.get("previous_school_year") as
      | string
      | null;
    const academic_year = formData.get("academic_year") as string | null;
    const program_shs = formData.get("program_shs") as string | null;
    const remarks = formData.get("remarks") as string | null;

    // Handle photo upload - save to filesystem
    let photoPath: string | null = null;
    const photoFile = formData.get("photo") as File | null;
    if (photoFile && photoFile.size > 0) {
      const arrayBuffer = await photoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        // Try filesystem write (works locally, fails on Vercel)
        const uploadsDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "enrollments",
        );
        await mkdir(uploadsDir, { recursive: true });

        const fileName = generateUniqueFileName(photoFile.name);
        const filePath = path.join(uploadsDir, fileName);
        await writeFile(filePath, buffer);

        photoPath = `/uploads/enrollments/${fileName}`;
      } catch {
        // Vercel has a read-only filesystem — store as base64 data URL
        const mimeType = photoFile.type || "image/jpeg";
        photoPath = `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
    }

    // Validate date of birth
    if (birthdate) {
      const birthDate = new Date(birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      if (actualAge < 15) {
        return NextResponse.json(
          {
            error: "Invalid birthdate",
            message: "Student must be at least 15 years old",
          },
          { status: 400 },
        );
      }
      if (birthDate > today) {
        return NextResponse.json(
          {
            error: "Invalid birthdate",
            message: "Birthdate cannot be in the future",
          },
          { status: 400 },
        );
      }
      if (actualAge > 100) {
        return NextResponse.json(
          {
            error: "Invalid birthdate",
            message: "Please enter a valid birthdate",
          },
          { status: 400 },
        );
      }
    }

    // Check for duplicate enrollment based on first name, family name, middle name, and birthdate
    if (first_name && family_name && birthdate) {
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          first_name: {
            equals: first_name.trim().toUpperCase(),
            mode: "insensitive",
          },
          family_name: {
            equals: family_name.trim().toUpperCase(),
            mode: "insensitive",
          },
          ...(middle_name && middle_name.trim() && {
            middle_name: {
              equals: middle_name.trim().toUpperCase(),
              mode: "insensitive",
            },
          }),
          birthdate: new Date(birthdate),
        },
      });

      if (existingEnrollment) {
        return NextResponse.json(
          {
            error: "Duplicate enrollment detected",
            message: `A student with the name "${first_name} ${middle_name ? middle_name + " " : ""}${family_name}" and birthdate already exists in the system.`,
          },
          { status: 409 },
        );
      }
    }

    // Handle major_id and course_program (program_id) logic
    let finalMajorId: number | null = null;
    let finalDepartmentId: number | null = null;
    let finalCourseProgram: string | null = course_program;

    if (major_id && major_id !== "0") {
      // When major is selected: get program_id from major and department_id from program
      const majorIdNum = parseInt(major_id);
      const selectedMajor = await prisma.major.findUnique({
        where: { id: majorIdNum },
      });

      if (selectedMajor) {
        finalMajorId = majorIdNum;
        // course_program stores the program ID (from major's program_id)
        finalCourseProgram = String(selectedMajor.program_id);
        
        // Get department from program
        const selectedProgram = await prisma.program.findUnique({
          where: { id: selectedMajor.program_id },
        });
        
        if (selectedProgram && selectedProgram.department_id) {
          finalDepartmentId = selectedProgram.department_id;
        }
      }
    } else if (course_program && course_program !== "0" && course_program !== "") {
      // When no major: use course_program (which contains program ID) and get department_id from program
      const programIdNum = parseInt(course_program);
      
      if (!isNaN(programIdNum)) {
        const selectedProgram = await prisma.program.findUnique({
          where: { id: programIdNum },
        });
        
        if (selectedProgram && selectedProgram.department_id) {
          finalDepartmentId = selectedProgram.department_id;
        } else if (department) {
          // Fallback to provided department if program doesn't have one
          finalDepartmentId = parseInt(department);
        }
      } else if (department) {
        // Fallback: use provided department
        finalDepartmentId = parseInt(department);
      }
    } else if (department) {
      // Fallback: use provided department
      finalDepartmentId = parseInt(department);
    }

    const result = await prisma.enrollment.create({
      data: {
        student_number: student_number || null,
        admission_date: admission_date ? new Date(admission_date) : null,
        admission_status: admission_status || null,
        term: term || null,
        department: finalDepartmentId,
        course_program: finalCourseProgram,
        major_id: finalMajorId,
        year_level: year_level ? parseInt(year_level) : null,
        photo: photoPath,
        requirements: requirements || [],
        family_name: family_name ? family_name.trim().toUpperCase() : null,
        first_name: first_name ? first_name.trim().toUpperCase() : null,
        middle_name: middle_name ? middle_name.trim().toUpperCase() : null,
        sex: sex || null,
        civil_status: civil_status || null,
        birthdate: birthdate ? new Date(birthdate) : null,
        birthplace: birthplace ? JSON.stringify([birthplace[0].trim().toUpperCase(), birthplace[1].trim().toUpperCase()]) : null,
        complete_address: complete_address ? complete_address.trim().toUpperCase() : null,
        contact_number: contact_number || null,
        email_address: email_address || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_relationship: emergency_relationship || null,
        emergency_contact_number: emergency_contact_number || null,
        last_school_attended: last_school_attended ? last_school_attended.trim().toUpperCase() : null,
        previous_school_year: previous_school_year || null,
        academic_year: academic_year || null,
        program_shs: program_shs ? program_shs.trim().toUpperCase() : null,
        remarks: remarks ? remarks.trim().toUpperCase() : null,
        status: 4,
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create enrollment" },
        { status: 400 },
      );
    }
    await insertIntoReports({
      action: `Enrolled new student: ${first_name} ${family_name} by ${session?.user?.name}`,
      user_id: Number(session?.user?.id),
      created_at: new Date(),
    });
    return NextResponse.json(
      {
        success: true,
        message: "Enrollment submitted successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
export async function GET() {
  try {
    const enrollments = await prisma.enrollment.findMany();
    
    // Enrich enrollments with program names if course_program is a number
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        // If course_program is a number (program ID), fetch the program name
        const programId = parseInt(enrollment.course_program || '');
        if (!isNaN(programId)) {
          try {
            const program = await prisma.program.findUnique({
              where: { id: programId },
              select: { name: true, code: true },
            });
            return {
              ...enrollment,
              course_program: program?.code || enrollment.course_program,
              program_name: program?.name,
              program_code: program?.code,
            };
          } catch (error) {
            console.error('Error fetching program:', error);
            return enrollment;
          }
        }
        return enrollment;
      })
    );
    
    return NextResponse.json({ data: enrichedEnrollments }, { status: 200 });
  } catch (error) {
    console.error("Fetch enrollments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    await prisma.enrollment.delete({
      where: { id },
    });
    return NextResponse.json(
      { message: "All enrollments deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete enrollments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: data.id },
      data: {
        student_number: data.student_number || null,
        admission_date: data.admission_date
          ? new Date(data.admission_date)
          : null,
        admission_status: data.admission_status || null,
        term: data.term || null,
        department: data.department,
        course_program: data.course_program || null,
        year_level: data.year_level ? parseInt(String(data.year_level)) : null,
        requirements: data.requirements || [],
        family_name: data.family_name || null,
        first_name: data.first_name || null,
        middle_name: data.middle_name || null,
        sex: data.sex || null,
        civil_status: data.civil_status || null,
        birthdate: data.birthdate ? new Date(data.birthdate) : null,
        birthplace: data.birthplace || null,
        complete_address: data.complete_address || null,
        contact_number: data.contact_number || null,
        email_address: data.email_address || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_relationship: data.emergency_relationship || null,
        emergency_contact_number: data.emergency_contact_number || null,
        last_school_attended: data.last_school_attended || null,
        previous_school_year:
          (data as any).previous_school_year ||
          (data as any).school_year ||
          null,
        academic_year: (data as any).academic_year || null,
        program_shs: data.program_shs || null,
        remarks: data.remarks || null,
      } as any, // Type assertion until Prisma client is regenerated
    });
    return NextResponse.json(updatedEnrollment);
  } catch (error) {
    console.error("Update enrollment error:", error);
    return NextResponse.json(
      { error: "Failed to update enrollment" },
      { status: 500 },
    );
  }
}
