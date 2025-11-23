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
