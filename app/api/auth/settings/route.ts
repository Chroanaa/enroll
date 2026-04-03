import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import { authOptions } from "../[...nextauth]/authOptions";
import { insertIntoReports } from "@/app/utils/reportsUtils";

const ADMIN_ROLE = 1;

async function requireAdminActor() {
  const session = await getServerSession(authOptions);
  const actorId = Number((session?.user as any)?.id) || 0;
  const actorRole = Number((session?.user as any)?.role) || 0;
  const actorName = String(session?.user?.name || "Unknown User");

  if (!session || !actorId) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (actorRole !== ADMIN_ROLE) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, actorId, actorName };
}

// GET all settings or specific setting by key
export async function GET(request: NextRequest) {
  try {
    const actor = await requireAdminActor();
    if (!actor.ok) return actor.response;

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
    const actor = await requireAdminActor();
    if (!actor.ok) return actor.response;

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    const previous = await prisma.settings.findUnique({
      where: { key },
      select: { value: true, description: true },
    });

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    if (!previous) {
      await insertIntoReports({
        action: `Created system setting "${key}" = "${value}" by ${actor.actorName}`,
        user_id: actor.actorId,
        created_at: new Date(),
      });
    } else if (
      String(previous.value ?? "") !== String(value ?? "") ||
      String(previous.description ?? "") !== String(description ?? "")
    ) {
      await insertIntoReports({
        action: `Updated system setting "${key}" from "${previous.value}" to "${value}" by ${actor.actorName}`,
        user_id: actor.actorId,
        created_at: new Date(),
      });
    }

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
    const actor = await requireAdminActor();
    if (!actor.ok) return actor.response;

    const body = await request.json();
    const { key, value, description } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    const previous = await prisma.settings.findUnique({
      where: { key },
      select: { value: true, description: true },
    });

    const setting = await prisma.settings.update({
      where: { key },
      data: { value, description },
    });

    if (
      previous &&
      (String(previous.value ?? "") !== String(value ?? "") ||
        String(previous.description ?? "") !== String(description ?? ""))
    ) {
      await insertIntoReports({
        action: `Patched system setting "${key}" from "${previous.value}" to "${value}" by ${actor.actorName}`,
        user_id: actor.actorId,
        created_at: new Date(),
      });
    }

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
