import axios from "axios";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newFaculty = await prisma.fee.create({
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
    const faculties = await prisma.fee.findMany();
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
    const deletedFaculty = await prisma.fee.delete({
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
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, ...updateData } = data;
    const validFields = ["name", "code", "description", "status"];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    const updatedFaculty = await prisma.fee.update({
      where: { id: data.id },
      data: {
        ...cleanData,
      },
    });
    return NextResponse.json(updatedFaculty);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update faculty" },
      { status: 500 }
    );
  }
}
