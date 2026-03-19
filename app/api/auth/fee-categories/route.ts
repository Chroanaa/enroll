import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../[...nextauth]/authOptions";

const ROLES = {
  ADMIN: 1,
} as const;

type RoleContext = {
  roleId: number;
  roleName: string;
  isDean: boolean;
};

async function getRoleContext(roleId: number): Promise<RoleContext> {
  if (!Number.isFinite(roleId) || roleId <= 0) {
    return { roleId: 0, roleName: "", isDean: false };
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

function canDeleteFeeCategory(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.isDean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category_type = searchParams.get("category_type") || "miscellaneous";
    const includePermissions = searchParams.get("includePermissions") === "1";

    const categories = await prisma.fee_category.findMany({
      where: {
        category_type,
      },
      include: {
        _count: {
          select: {
            miscellaneous_fees: true,
          },
        },
      },
      orderBy: { academic_year: "desc" },
    });

    if (!includePermissions) {
      return NextResponse.json(categories);
    }

    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role) || 0;
    const roleContext = await getRoleContext(userRole);

    return NextResponse.json({
      data: categories,
      permissions: {
        canDelete: canDeleteFeeCategory(roleContext),
      },
    });
  } catch (error: any) {
    console.error("Error fetching fee categories:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch fee categories", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const newCategory = await prisma.fee_category.create({
      data,
    });
    
    return NextResponse.json(newCategory);
  } catch (error: any) {
    console.error("Error creating fee category:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create fee category", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    const updatedCategory = await prisma.fee_category.update({
      where: { id: Number(id) },
      data: updateData,
    });
    
    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error("Error updating fee category:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update fee category", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role) || 0;
    const roleContext = await getRoleContext(userRole);

    if (!canDeleteFeeCategory(roleContext)) {
      return NextResponse.json(
        { error: "Only Admin or Dean can delete fee categories." },
        { status: 403 },
      );
    }

    const id = await request.json();
    const deletedCategory = await prisma.fee_category.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json(deletedCategory);
  } catch (error: any) {
    console.error("Error deleting fee category:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete fee category", details: error?.code || error },
      { status: 500 },
    );
  }
}
