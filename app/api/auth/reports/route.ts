import { prisma } from "../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch reports and users separately, then join them
    const [reports, users] = await Promise.all([
      prisma.reports.findMany({
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.users.findMany({
        select: {
          id: true,
          username: true,
        },
      }),
    ]);

    // Create a map of user_id to username for quick lookup
    const userMap = new Map(users.map((user) => [user.id, user.username]));

    // Transform the data to include username
    const reportsWithUsername = reports.map((report) => ({
      id: report.id,
      action: report.action,
      user_id: report.user_id,
      username: userMap.get(report.user_id) || null,
      created_at: report.created_at,
    }));

    return NextResponse.json(reportsWithUsername, { status: 200 });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const newReports = await prisma.reports.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(newReports, { status: 201 });
  } catch (error) {
    console.error("Section creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();
    await prisma.reports.delete({
      where: { id },
    });
    return NextResponse.json(
      { message: "Report deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete report error:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
