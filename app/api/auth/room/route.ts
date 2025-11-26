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
export async function GET() {
  try {
    const rooms = await prisma.room.findMany();
    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedRoom = await prisma.room.delete({
      where: { id },
    });
    return NextResponse.json(deletedRoom);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
