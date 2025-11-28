import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newMajor = await prisma.major.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newMajor);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create major" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const majors = await prisma.major.findMany();
    return NextResponse.json(majors);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch majors" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedMajor = await prisma.major.delete({
      where: { id },
    });
    return NextResponse.json(deletedMajor);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete major" },
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
    const updatedMajor = await prisma.major.update({
      where: { id: data.id },
      data: {
        ...cleanData,
      },
    });
    return NextResponse.json(updatedMajor);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update major" },
      { status: 500 }
    );
  }
}
