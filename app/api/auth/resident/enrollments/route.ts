import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getSessionScope } from "@/app/lib/accessScope";

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (scope.isDean) {
      return NextResponse.json(
        { error: "Forbidden. Dean accounts cannot access resident enrollments." },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const studentNumber = searchParams.get("student_number");

    if (!studentNumber) {
      return NextResponse.json(
        { error: "Student number is required" },
        { status: 400 },
      );
    }

    // Fetch all enrollments for this student, ordered by most recent admission date first
    const enrollments = await prisma.enrollment.findMany({
      where: {
        student_number: studentNumber,
      },
      orderBy: {
        admission_date: "desc",
      },
    });

    return NextResponse.json({ data: enrollments }, { status: 200 });
  } catch (error) {
    console.error("Fetch enrollments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
