import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentNumber = searchParams.get("studentNumber");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!studentNumber || !academicYear || !semester) {
      return NextResponse.json(
        { error: "studentNumber, academicYear, and semester are required." },
        { status: 400 },
      );
    }

    const semesterNum = Number.parseInt(semester, 10);

    if (semesterNum !== 1 && semesterNum !== 2) {
      return NextResponse.json(
        { error: "semester must be 1 or 2." },
        { status: 400 },
      );
    }

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        sdh.id,
        sdh.enrolled_subject_id,
        sdh.student_number,
        sdh.academic_year,
        sdh.semester,
        sdh.units_total,
        sdh.status,
        sdh.course_code,
        sdh.descriptive_title,
        sdh.dropped_at,
        sdh.drop_reason,
        sdh.refundable
      FROM subject_drop_history sdh
      WHERE sdh.student_number = ${studentNumber}
        AND sdh.academic_year = ${academicYear}
        AND sdh.semester = ${semesterNum}
      ORDER BY sdh.dropped_at DESC, sdh.id DESC
    `;

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("Error fetching subject drop history:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch subject drop history." },
      { status: 500 },
    );
  }
}
