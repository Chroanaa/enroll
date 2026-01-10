import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; // Adjust path as needed
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded or invalid format" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
    });

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty" },
        { status: 400 }
      );
    }

    const fieldMapping: Record<string, string> = {
      studentnumber: "student_number",
      admissiondate: "admission_date",
      admissionstatus: "admission_status",
      term: "term",
      department: "department",
      course: "course_program",
      courseprogram: "course_program",
      requirements: "requirements",
      lastname: "family_name",
      familyname: "family_name",
      firstname: "first_name",
      middlename: "middle_name",
      sex: "sex",
      gender: "sex",
      civilstatus: "civil_status",
      birthdate: "birthdate",
      birthplace: "birthplace",
      address: "complete_address",
      completeaddress: "complete_address",
      contactnumber: "contact_number",
      email: "email_address",
      emailaddress: "email_address",
      emergencycontactname: "emergency_contact_name",
      emergencyrelationship: "emergency_relationship",
      emergencycontactnumber: "emergency_contact_number",
      lastschoolattended: "last_school_attended",
      schoolyear: "previous_school_year",
      previousschoolyear: "previous_school_year",
      academicyear: "academic_year",
      programshs: "program_shs",
      remarks: "remarks",
      status: "status",
    };

    const normalizeKey = (k: string) =>
      k.replace(/[^a-z0-9]/gi, "").toLowerCase();

    const firstRowKeys = Object.keys(rawRows[0]);

    const warnings: string[] = [];

    const mappedRows = rawRows
      .map((row, idx) => {
        const mappedData: Record<string, any> = {};

        for (const [key, val] of Object.entries(row)) {
          const cleanKey = normalizeKey(key);
          const prismaField = fieldMapping[cleanKey];

          if (!prismaField) continue;

          if (val === null || val === undefined || val === "") {
            mappedData[prismaField] = null;
            continue;
          }

          if (["admission_date", "birthdate"].includes(prismaField)) {
            if (val instanceof Date && !isNaN(val.getTime())) {
              mappedData[prismaField] = val.toISOString();
            } else {
              const d = new Date(val as string);
              mappedData[prismaField] = !isNaN(d.getTime())
                ? d.toISOString()
                : null;
            }
          } else if (prismaField === "department" || prismaField === "status") {
            const num = Number(val);
            mappedData[prismaField] = isNaN(num) ? null : num;
          } else if (prismaField === "requirements") {
            if (typeof val === "string") {
              mappedData[prismaField] = val.split(",").map((s) => s.trim());
            } else {
              mappedData[prismaField] = [];
            }
          } else {
            mappedData[prismaField] = String(val);
          }
        }

        if (!mappedData.student_number) {
          warnings.push(
            `Row ${idx + 2}: Skipped due to missing Student Number`
          );
          return null;
        }

        return mappedData;
      })
      .filter((row): row is Record<string, any> => row !== null);

    console.log(`Ready to insert ${mappedRows.length} rows.`);

    if (mappedRows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found. Check your Excel headers.", warnings },
        { status: 400 }
      );
    }

    const result = await prisma.enrollment.createMany({
      data: mappedRows,
      skipDuplicates: true,
    });

    return NextResponse.json(
      {
        message: "Import successful",
        count: result.count,
        warnings,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Backend Import Error:", error);
    return NextResponse.json(
      {
        error: "Server Error processing file",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
