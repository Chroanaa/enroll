import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const faculties = await prisma.faculty.findMany();
    return NextResponse.json(faculties);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch faculties" },
      { status: 500 },
    );
  }
}
