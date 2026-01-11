import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET all settings or specific setting by key
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const setting = await prisma.settings.findUnique({
        where: { key },
      });

      if (!setting) {
        return NextResponse.json(
          { error: "Setting not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: setting }, { status: 200 });
    }

    const settings = await prisma.settings.findMany();
    return NextResponse.json({ data: settings }, { status: 200 });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create or update a setting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    return NextResponse.json(
      { success: true, data: setting },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update setting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update a setting
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    const setting = await prisma.settings.update({
      where: { key },
      data: { value, description },
    });

    return NextResponse.json(
      { success: true, data: setting },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update setting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
