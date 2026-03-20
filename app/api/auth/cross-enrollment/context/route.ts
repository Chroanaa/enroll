import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/authOptions";
import { prisma } from "../../../../lib/prisma";

const ROLES = {
  ADMIN: 1,
  REGISTRAR: 4,
} as const;

type RoleContext = {
  roleId: number;
  roleName: string;
  isDean: boolean;
};

async function getRoleContext(roleId: number): Promise<RoleContext> {
  if (!Number.isFinite(roleId) || roleId <= 0) {
    return {
      roleId: 0,
      roleName: "",
      isDean: false,
    };
  }

  const roleRow = await prisma.roles.findUnique({
    where: { id: roleId },
    select: { role: true },
  });

  const roleName = String(roleRow?.role || "").trim().toLowerCase();

  return {
    roleId,
    roleName,
    isDean: roleName === "dean",
  };
}

function canAccessContext(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.roleId === ROLES.REGISTRAR || role.isDean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role) || 0;
    const roleContext = await getRoleContext(userRole);

    if (!canAccessContext(roleContext)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const requestId = Number(request.nextUrl.searchParams.get("id"));
    if (!Number.isFinite(requestId)) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        cer.id,
        cer.student_number,
        cer.academic_year,
        cer.semester,
        cer.curriculum_course_id,
        COALESCE(cc.course_code, sub.code) AS course_code
      FROM student_cross_enrollment_requests cer
      LEFT JOIN curriculum_course cc ON cc.id = cer.curriculum_course_id
      LEFT JOIN subject sub ON sub.id = cer.subject_id
      WHERE cer.id = ${requestId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Cross-enrollee request not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        studentNumber: row.student_number,
        academicYear: row.academic_year,
        semester: row.semester,
        curriculumCourseId: row.curriculum_course_id,
        courseCode: row.course_code,
      },
    });
  } catch (error: any) {
    console.error("Error fetching cross-enrollee context:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch cross-enrollee context." },
      { status: 500 },
    );
  }
}

