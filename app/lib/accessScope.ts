import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/app/lib/prisma";
import { ROLES } from "@/app/lib/rbac";
import { Prisma } from "@prisma/client";

export type SessionScope = {
  userId: number;
  roleId: number;
  isDean: boolean;
  deanDepartmentId: number | null;
  deanDepartmentName: string | null;
};

export async function getSessionScope(): Promise<SessionScope | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  const userId = Number((session.user as any).id) || 0;
  const roleId = Number((session.user as any).role) || 0;
  const isDean = roleId === ROLES.DEAN;

  let deanDepartmentId = Number((session.user as any).departmentId) || null;
  let deanDepartmentName =
    ((session.user as any).departmentName as string | undefined) || null;

  if (isDean && !deanDepartmentId && userId > 0) {
    const faculty = await prisma.faculty.findFirst({
      where: { user_id: userId },
      select: { department_id: true },
    });

    deanDepartmentId = faculty?.department_id ?? null;

    if (deanDepartmentId) {
      const department = await prisma.department.findUnique({
        where: { id: deanDepartmentId },
        select: { name: true },
      });
      deanDepartmentName = department?.name ?? null;
    }
  }

  return {
    userId,
    roleId,
    isDean,
    deanDepartmentId,
    deanDepartmentName,
  };
}

export function isRoleAllowed(roleId: number, allowedRoles: number[]) {
  return allowedRoles.includes(roleId);
}

function getEnrollmentSemesterAliases(
  semester: string | number | null | undefined,
): string[] {
  if (semester === null || semester === undefined) {
    return [];
  }

  const normalized = String(semester).trim().toLowerCase();

  if (
    normalized === "1" ||
    normalized === "first" ||
    normalized === "first semester" ||
    normalized === "1st semester"
  ) {
    return ["first", "first semester", "1", "1st semester"];
  }

  if (
    normalized === "2" ||
    normalized === "second" ||
    normalized === "second semester" ||
    normalized === "2nd semester"
  ) {
    return ["second", "second semester", "2", "2nd semester"];
  }

  if (
    normalized === "3" ||
    normalized === "third" ||
    normalized === "third semester" ||
    normalized === "3rd semester" ||
    normalized === "summer"
  ) {
    return ["third", "third semester", "3", "3rd semester", "summer"];
  }

  return [];
}

async function getStudentDepartmentForScope(args: {
  studentNumber: string;
  academicYear?: string | null;
  semester?: string | number | null;
}) {
  const studentNumber = String(args.studentNumber || "").trim();

  if (!studentNumber) {
    return undefined;
  }

  const semesterAliases = getEnrollmentSemesterAliases(args.semester);
  if (args.academicYear && semesterAliases.length > 0) {
    const scopedRows = await prisma.$queryRaw<{ department: number | null }[]>`
      SELECT department
      FROM enrollment
      WHERE student_number = ${studentNumber}
        AND academic_year = ${args.academicYear}
        AND LOWER(COALESCE(term, '')) IN (${Prisma.join(semesterAliases)})
      ORDER BY id DESC
      LIMIT 1
    `;

    if (scopedRows[0]) {
      return scopedRows[0].department ?? null;
    }
  }

  const latestEnrollment = await prisma.enrollment.findFirst({
    where: { student_number: studentNumber },
    select: { department: true },
    orderBy: [{ admission_date: "desc" }, { id: "desc" }],
  });

  if (!latestEnrollment) {
    return undefined;
  }

  return latestEnrollment.department ?? null;
}

export async function ensureDeanStudentAccess(
  scope: SessionScope | null,
  args: {
    studentNumber: string;
    academicYear?: string | null;
    semester?: string | number | null;
  },
): Promise<
  | { ok: true; departmentId: number | null | undefined }
  | { ok: false; status: number; error: string }
> {
  if (!scope?.isDean) {
    return { ok: true, departmentId: undefined };
  }

  if (!scope.deanDepartmentId) {
    return {
      ok: false,
      status: 403,
      error: "Dean account is not linked to a department.",
    };
  }

  const studentDepartmentId = await getStudentDepartmentForScope(args);

  if (studentDepartmentId === undefined) {
    return {
      ok: false,
      status: 404,
      error: "Student not found",
    };
  }

  if (studentDepartmentId !== scope.deanDepartmentId) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden. Student is outside your department scope.",
    };
  }

  return { ok: true, departmentId: studentDepartmentId };
}
