import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newSubject = await prisma.subject.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newSubject);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany();
    return NextResponse.json(subjects);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    const deletedSubject = await prisma.subject.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json(deletedSubject);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, ...updateData } = data;
    // Only include fields that exist in the subject schema
    const validFields = [
      "subject_code",
      "subject_name",
      "description",
      "credits",
    ];
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    const updatedSubject = await prisma.subject.update({
      where: { id: Number(id) },
      data: cleanData,
    });
    return NextResponse.json(updatedSubject);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update subject" },
      { status: 500 }
    );
  }
}
