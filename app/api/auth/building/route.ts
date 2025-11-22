import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Building } from "@/app/data/mockData";
export async function POST(request: NextRequest) {
  try {
    const data: Building = await request.json();
    const newBuilding = await prisma.building.create({
      data: {
        ...data,
      },
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
