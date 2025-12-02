import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Building } from "../../../types";
export async function POST(request: NextRequest) {
  try {
    const data: Building = await request.json();
    const { id, ...buildingData } = data;
    const newBuilding = await prisma.building.create({
      data: buildingData,
    });
    return NextResponse.json(newBuilding);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create building" },
      { status: 500 }
    );
  }
}
export async function GET(request: NextRequest) {
  try {
    const buildings = await prisma.building.findMany();
    return NextResponse.json(buildings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch buildings" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedBuilding = await prisma.building.delete({
      where: { id },
    });
    return NextResponse.json(deletedBuilding);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete building" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data: Building = await nextRequest.json();
    const updatedBuilding = await prisma.building.update({
      where: { id: data.id },
      data: {
        ...data,
      },
    });
    return NextResponse.json(updatedBuilding);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update building" },
      { status: 500 }
    );
  }
}
