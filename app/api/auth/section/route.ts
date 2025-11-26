import axios from "axios";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newSection = await prisma.section.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newSection);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create section" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const sections = await prisma.section.findMany();
    return NextResponse.json(sections);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sections" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedSection = await prisma.section.delete({
      where: { id },
    });
    return NextResponse.json(deletedSection);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete section" },
      { status: 500 }
    );
  }
}
