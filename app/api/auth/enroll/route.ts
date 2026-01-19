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
    const requirementsStr = formData.get("requirements") as string | null;
    const requirements = requirementsStr ? JSON.parse(requirementsStr) : [];
    const family_name = formData.get("family_name") as string | null;
    const first_name = formData.get("first_name") as string | null;
    const middle_name = formData.get("middle_name") as string | null;
    const sex = formData.get("sex") as string | null;
    const civil_status = formData.get("civil_status") as string | null;
    const birthdate = formData.get("birthdate") as string | null;
    const birthplace = formData.get("birthplace") as string | null;
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
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "enrollments",
      );
      await mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const fileName = generateUniqueFileName(photoFile.name);
      const filePath = path.join(uploadsDir, fileName);

      // Convert file to buffer and save
      const arrayBuffer = await photoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);

      // Store relative path for database (accessible via /uploads/enrollments/...)
      photoPath = `/uploads/enrollments/${fileName}`;
    }

    const result = await prisma.$executeRaw`
      INSERT INTO enrollment (
        student_number, admission_date, admission_status, term, department,
        course_program, photo, requirements, family_name, first_name,
        middle_name, sex, civil_status, birthdate, birthplace,
        complete_address, contact_number, email_address, emergency_contact_name,
        emergency_relationship, emergency_contact_number, last_school_attended,
        previous_school_year, academic_year, program_shs, remarks
      ) VALUES (
        ${student_number}, ${
          admission_date ? new Date(admission_date) : null
        }::date, 
        ${admission_status}, ${term}, ${
          department ? parseInt(department) : null
        },
        ${course_program}, ${photoPath}, ${requirements}::text[], ${family_name}, ${first_name},
        ${middle_name}, ${sex}, ${civil_status}, ${
          birthdate ? new Date(birthdate) : null
        }::date, ${birthplace},
        ${complete_address}, ${contact_number}, ${email_address}, ${emergency_contact_name},
        ${emergency_relationship}, ${emergency_contact_number}, ${last_school_attended},
        ${previous_school_year}, ${academic_year}, ${program_shs}, ${remarks}
      )
    `;

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
    return NextResponse.json({ data: enrollments }, { status: 200 });
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
