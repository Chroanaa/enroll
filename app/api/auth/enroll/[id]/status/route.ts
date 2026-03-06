import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../[...nextauth]/authOptions";
import { insertIntoReports } from "@/app/utils/reportsUtils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const enrollmentId = parseInt(id);

    if (isNaN(enrollmentId)) {
      return NextResponse.json(
        { error: "Invalid enrollment ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (typeof status !== "number" || status < 1 || status > 4) {
      return NextResponse.json(
        { error: "Invalid status value. Must be 1 (Enrolled), 2 (Reserved), 3 (Dropped), or 4 (Pending)" },
        { status: 400 }
      );
    }

    // Check if enrollment exists
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        first_name: true,
        family_name: true,
        student_number: true,
        status: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Update enrollment status
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status },
    });

    // Log the action
    const statusLabels: { [key: number]: string } = {
      1: "Enrolled",
      2: "Reserved",
      3: "Dropped",
      4: "Pending",
    };

    await insertIntoReports({
      action: `Changed enrollment status for ${enrollment.first_name} ${enrollment.family_name} (${enrollment.student_number}) from ${statusLabels[enrollment.status || 4]} to ${statusLabels[status]} by ${session?.user?.name}`,
      user_id: Number(session?.user?.id),
      created_at: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Enrollment status updated successfully",
        data: updatedEnrollment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update enrollment status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
