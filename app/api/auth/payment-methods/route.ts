import { NextRequest, NextResponse } from "next/server";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";
import { prisma } from "@/app/lib/prisma";
import { ensureOnlinePaymentTables } from "@/app/lib/onlinePayment";

const ALLOWED_ROLES = [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN];

export async function GET() {
  try {
    const scope = await getSessionScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isRoleAllowed(scope.roleId, ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureOnlinePaymentTables();
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        id, name, receiver_name, receiver_account, instructions, is_active, sort_order, created_at, updated_at
      FROM payment_gateway_methods
      ORDER BY sort_order ASC, name ASC
    `);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("GET payment methods error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch payment methods" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isRoleAllowed(scope.roleId, ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureOnlinePaymentTables();
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const receiverName = String(body?.receiver_name || "").trim();
    const receiverAccount = String(body?.receiver_account || "").trim();
    const instructions =
      typeof body?.instructions === "string" ? body.instructions.trim() : null;
    const isActive = body?.is_active !== false;
    const sortOrder = Number(body?.sort_order || 0);

    if (!name || !receiverName || !receiverAccount) {
      return NextResponse.json(
        { error: "name, receiver_name, and receiver_account are required." },
        { status: 400 },
      );
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
        INSERT INTO payment_gateway_methods
          (name, receiver_name, receiver_account, instructions, is_active, sort_order, updated_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `,
      name,
      receiverName,
      receiverAccount,
      instructions,
      isActive,
      Number.isFinite(sortOrder) ? sortOrder : 0,
    );

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("POST payment methods error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create payment method" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isRoleAllowed(scope.roleId, ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureOnlinePaymentTables();
    const body = await request.json();
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const name = String(body?.name || "").trim();
    const receiverName = String(body?.receiver_name || "").trim();
    const receiverAccount = String(body?.receiver_account || "").trim();
    const instructions =
      typeof body?.instructions === "string" ? body.instructions.trim() : null;
    const isActive = body?.is_active !== false;
    const sortOrder = Number(body?.sort_order || 0);

    if (!name || !receiverName || !receiverAccount) {
      return NextResponse.json(
        { error: "name, receiver_name, and receiver_account are required." },
        { status: 400 },
      );
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
        UPDATE payment_gateway_methods
        SET
          name = $2,
          receiver_name = $3,
          receiver_account = $4,
          instructions = $5,
          is_active = $6,
          sort_order = $7,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      id,
      name,
      receiverName,
      receiverAccount,
      instructions,
      isActive,
      Number.isFinite(sortOrder) ? sortOrder : 0,
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error("PATCH payment methods error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update payment method" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isRoleAllowed(scope.roleId, ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureOnlinePaymentTables();
    const body = await request.json();
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(`DELETE FROM payment_gateway_methods WHERE id = $1`, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE payment methods error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete payment method" },
      { status: 500 },
    );
  }
}

