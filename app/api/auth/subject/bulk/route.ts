import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const subjectsData = await request.json();

    if (!Array.isArray(subjectsData) || subjectsData.length === 0) {
      return NextResponse.json(
        { error: "Invalid data: Expected an array of subjects" },
        { status: 400 }
      );
    }

    // Validate all subjects before inserting
    const errors: string[] = [];
    subjectsData.forEach((subject, index) => {
      if (!subject.code || !subject.name) {
        errors.push(`Subject ${index + 1}: Code and name are required`);
      }
      if (!subject.units_lec && !subject.units_lab) {
        errors.push(
          `Subject ${index + 1}: At least one unit (lecture or lab) is required`
        );
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // Set default status for subjects that don't have it
    // Remove id field if present (database will auto-generate it)
    const subjectsWithDefaults = subjectsData.map((subject) => {
      const { id, ...subjectWithoutId } = subject as any;
      
      // Validate fixedAmount if provided (must be non-negative)
      let fixedAmount = null;
      if (subject.fixedAmount !== undefined && subject.fixedAmount !== null) {
        const amount = Number(subject.fixedAmount);
        if (isNaN(amount) || amount < 0) {
          throw new Error(`Subject ${subjectsData.indexOf(subject) + 1}: fixedAmount must be a valid non-negative decimal number`);
        }
        fixedAmount = amount;
      }
      
      return {
        ...subjectWithoutId,
        status: subject.status || "active",
        description: subject.description || null,
        units_lec: subject.units_lec || null,
        units_lab: subject.units_lab || null,
        lecture_hour: subject.lecture_hour || null,
        lab_hour: subject.lab_hour || null,
        fixedAmount: fixedAmount,
      };
    });

    // Use createMany for bulk insert
    const result = await prisma.subject.createMany({
      data: subjectsWithDefaults,
      skipDuplicates: true, // Skip if code already exists
    });

    // Fetch the created subjects to return them
    const codes = subjectsWithDefaults.map((s) => s.code);
    const createdSubjects = await prisma.subject.findMany({
      where: {
        code: {
          in: codes,
        },
      },
    });

    return NextResponse.json(createdSubjects);
  } catch (error: any) {
    console.error("Error creating subjects:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create subjects",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

