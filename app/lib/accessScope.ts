import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/app/lib/prisma";
import { ROLES } from "@/app/lib/rbac";

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
