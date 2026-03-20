import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";

const ENROLLED_STUDENTS_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.REGISTRAR,
  ROLES.CASHIER,
  ROLES.FACULTY,
  ROLES.DEAN,
];

// Get enrolled students with status = 1
export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, ENROLLED_STUDENTS_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const studentNumber = searchParams.get("studentNumber");

    if (studentNumber) {
      // Search for specific student by student number
      const student = await prisma.enrollment.findFirst({
        where: {
          student_number: studentNumber,
          status: 1,
          ...(scope.isDean && scope.deanDepartmentId
            ? { department: scope.deanDepartmentId }
            : {}),
        },
        select: {
          id: true,
          student_number: true,
          first_name: true,
          middle_name: true,
          family_name: true,
          course_program: true,
          term: true,
          academic_year: true,
        },
      });

      if (!student) {
        return NextResponse.json(
          { error: "Student not found or not enrolled" },
          { status: 404 },
        );
      }

      return NextResponse.json(student);
    }

    // Get all enrolled students
    const students = await prisma.enrollment.findMany({
      where: {
        status: 1,
        ...(scope.isDean && scope.deanDepartmentId
          ? { department: scope.deanDepartmentId }
          : {}),
      },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
        term: true,
        academic_year: true,
      },
      orderBy: {
        family_name: "asc",
      },
    });

    return NextResponse.json(students);
  } catch (error: any) {
    console.error("Error fetching enrolled students:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch enrolled students",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
