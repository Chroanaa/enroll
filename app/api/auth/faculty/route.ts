import axios from "axios";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newFaculty = await prisma.faculty.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newFaculty);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const faculties = await prisma.faculty.findMany();
    return NextResponse.json(faculties);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch faculties" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedFaculty = await prisma.faculty.delete({
      where: { id },
    });
    return NextResponse.json(deletedFaculty);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete faculty" },
      { status: 500 }
    );
  }
}
