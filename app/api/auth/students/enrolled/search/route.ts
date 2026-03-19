import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";

const ENROLLED_SEARCH_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.REGISTRAR,
  ROLES.CASHIER,
  ROLES.FACULTY,
  ROLES.DEAN,
];

// Search enrolled students with status = 1 (for autocomplete)
export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, ENROLLED_SEARCH_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    const searchTerm = query.trim();

    // Search enrolled students by name or student number
    const students = await prisma.enrollment.findMany({
      where: {
        status: 1, // Only enrolled/active students
        ...(scope.isDean && scope.deanDepartmentId
          ? { department: scope.deanDepartmentId }
          : {}),
        OR: [
          {
            student_number: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            first_name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            middle_name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            family_name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
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
      take: limit,
    });

    return NextResponse.json(students);
  } catch (error: any) {
    console.error("Error searching enrolled students:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to search enrolled students",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
