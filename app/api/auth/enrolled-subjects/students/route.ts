import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!academicYear || !semester) {
      return NextResponse.json(
        { error: "academicYear and semester are required." },
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

    const rows = await prisma.$queryRaw<{ student_number: string }[]>`
      SELECT DISTINCT es.student_number
      FROM enrolled_subjects es
      WHERE es.academic_year = ${academicYear}
        AND es.semester = ${semesterNum}
      ORDER BY es.student_number ASC
    `;

    return NextResponse.json({
      success: true,
      data: rows.map((row) => row.student_number).filter(Boolean),
    });
  } catch (error: any) {
    console.error("Error fetching enrolled-subject students:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch enrolled-subject students." },
      { status: 500 },
    );
  }
}
