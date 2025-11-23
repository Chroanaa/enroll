import axios from "axios";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newFaculty = await prisma.room.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newFaculty);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create faculty" },
      { status: 500 }
    );
  }
}
