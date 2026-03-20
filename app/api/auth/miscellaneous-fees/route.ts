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

function canDeleteMiscFee(role: RoleContext) {
  return role.roleId === ROLES.ADMIN || role.isDean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academic_year = searchParams.get("academic_year");

    // Fetch fees with category title
    const fees = await prisma.miscellaneous_fee.findMany({
      where: academic_year ? {
        category: {
          academic_year: academic_year
        }
      } : {},
      include: {
        category: {
          select: {
            title: true,
            academic_year: true,
            description: true
          }
        }
      },
      orderBy: { id: "asc" },
    });

    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role) || 0;
    const roleContext = await getRoleContext(userRole);

    return NextResponse.json({
      data: fees,
      permissions: {
        canDelete: canDeleteMiscFee(roleContext),
      },
    });
  } catch (error: any) {
    console.error("Error fetching miscellaneous fees:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch miscellaneous fees", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...feeData } = data;
    
    const newFee = await prisma.miscellaneous_fee.create({
      data: feeData,
    });
    
    return NextResponse.json(newFee);
  } catch (error: any) {
    console.error("Error creating miscellaneous fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create miscellaneous fee", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    const validFields = ["item", "amount", "status"];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    
    const updatedFee = await prisma.miscellaneous_fee.update({
      where: { id: Number(id) },
      data: cleanData,
    });
    
    return NextResponse.json(updatedFee);
  } catch (error: any) {
    console.error("Error updating miscellaneous fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update miscellaneous fee", details: error?.code || error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role) || 0;
    const roleContext = await getRoleContext(userRole);

    if (!canDeleteMiscFee(roleContext)) {
      return NextResponse.json(
        { error: "Only Admin or Dean can delete miscellaneous fees." },
        { status: 403 },
      );
    }

    const id = await request.json();
    
    const deletedFee = await prisma.miscellaneous_fee.delete({
      where: { id: Number(id) },
    });
    
    return NextResponse.json(deletedFee);
  } catch (error: any) {
    console.error("Error deleting miscellaneous fee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete miscellaneous fee", details: error?.code || error },
      { status: 500 }
    );
  }
}
