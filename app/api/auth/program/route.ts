import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { ROLES } from "@/app/lib/rbac";
import { getSessionScope } from "@/app/lib/accessScope";

const READ_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.REGISTRAR,
  ROLES.FACULTY,
  ROLES.DEAN,
];
const WRITE_ALLOWED_ROLES = [ROLES.ADMIN, ROLES.DEAN];

async function requireRole(allowedRoles: number[]) {
  const session = await getServerSession(authOptions);
  const userRole = Number((session?.user as any)?.role) || 0;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      {
        error:
          allowedRoles === WRITE_ALLOWED_ROLES
            ? "View-only access. Only admin and dean can manage programs."
            : "Unauthorized to access programs.",
      },
      { status: 403 },
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireRole(WRITE_ALLOWED_ROLES);
    if (unauthorized) return unauthorized;

    const data = await request.json();
    const { id, departmentName, ...restData } = data;
    
    // Only include valid fields from schema
    const validFields = ["code", "name", "description", "department_id", "duration", "total_units", "status"];
    const programData: any = {};
    
    validFields.forEach((field) => {
      if (restData[field] !== undefined) {
        programData[field] = restData[field];
      }
    });
    
    // Ensure required fields are present
    if (!programData.code || !programData.name) {
      return NextResponse.json(
        { error: "Missing required fields: code and name are required" },
        { status: 400 }
      );
    }
    
    // Set default status if not provided
    if (!programData.status) {
      programData.status = "active";
    }
    
    const newProgram = await prisma.program.create({
      data: programData,
    });
    return NextResponse.json(newProgram);
  } catch (error: any) {
    console.error("Error creating program:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create program", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const unauthorized = await requireRole(READ_ALLOWED_ROLES);
    if (unauthorized) return unauthorized;

    const scope = await getSessionScope();

    if (scope?.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const programs = await prisma.program.findMany({
      where:
        scope?.isDean && scope.deanDepartmentId
          ? { department_id: scope.deanDepartmentId }
          : undefined,
    });
    return NextResponse.json(programs);
  } catch (error: any) {
    console.error("Error fetching programs:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch programs", details: error?.code || error },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const unauthorized = await requireRole(WRITE_ALLOWED_ROLES);
    if (unauthorized) return unauthorized;

    const id = await request.json();
    const deletedProgram = await prisma.program.delete({
      where: { id },
    });
    return NextResponse.json(deletedProgram);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete program" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const unauthorized = await requireRole(WRITE_ALLOWED_ROLES);
    if (unauthorized) return unauthorized;

    const data = await nextRequest.json();
    const { id, departmentName, ...updateData } = data;
    const validFields = ["code", "name", "description", "department_id", "duration", "total_units", "status"];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    const updatedProgram = await prisma.program.update({
      where: { id: Number(id) },
      data: {
        ...cleanData,
      },
    });
    return NextResponse.json(updatedProgram);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update program" },
      { status: 500 }
    );
  }
}
