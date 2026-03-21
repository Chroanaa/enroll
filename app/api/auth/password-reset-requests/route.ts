import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../[...nextauth]/authOptions";

const ADMIN_ROLE_ID = 1;

const PASSWORD_RESET_REQUESTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NULL,
    username VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NULL,
    note TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP(6) NULL,
    processed_by INT NULL,
    resolution VARCHAR(50) NULL,
    resolution_note TEXT NULL
  )
`;

async function ensurePasswordResetRequestsTable() {
  await prisma.$executeRawUnsafe(PASSWORD_RESET_REQUESTS_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS user_id INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS note TEXT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP(6) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS processed_by INT NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS resolution VARCHAR(50) NULL",
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS resolution_note TEXT NULL",
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || Number((session.user as any)?.role) !== ADMIN_ROLE_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await ensurePasswordResetRequestsTable();

    const requests = await prisma.$queryRaw<any[]>`
      SELECT
        prr.id,
        prr.user_id,
        prr.username,
        prr.contact_email,
        prr.note,
        prr.status,
        prr.requested_at,
        prr.processed_at,
        prr.processed_by,
        prr.resolution,
        prr.resolution_note,
        u.firstname,
        u.middlename,
        u.lastname
      FROM password_reset_requests prr
      LEFT JOIN users u ON u.id = prr.user_id
      ORDER BY
        CASE WHEN prr.status = 'pending' THEN 0 ELSE 1 END,
        prr.requested_at DESC,
        prr.id DESC
      LIMIT 100
    `;

    return NextResponse.json({
      requests: requests.map((request) => ({
        id: request.id,
        userId: request.user_id,
        username: request.username,
        contactEmail: request.contact_email,
        note: request.note,
        status: request.status,
        requestedAt: request.requested_at,
        processedAt: request.processed_at,
        processedBy: request.processed_by,
        resolution: request.resolution,
        resolutionNote: request.resolution_note,
        matchedFullName: [request.firstname, request.middlename, request.lastname]
          .filter(Boolean)
          .join(" ")
          .trim(),
      })),
    });
  } catch (error) {
    console.error("Error fetching password reset requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensurePasswordResetRequestsTable();

    const body = await request.json();
    const username = String(body?.username || "").trim();
    const contactEmail = String(body?.contactEmail || "").trim() || null;
    const note = String(body?.note || "").trim() || null;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 },
      );
    }

    const existingPending = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM password_reset_requests
      WHERE LOWER(username) = LOWER(${username})
        AND status = 'pending'
      ORDER BY requested_at DESC, id DESC
      LIMIT 1
    `;

    if (existingPending[0]) {
      return NextResponse.json({
        success: true,
        requestId: existingPending[0].id,
        message:
          "A password reset request is already pending for this username.",
      });
    }

    const matchedUser = await prisma.users.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    const insertedRows = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO password_reset_requests (
        user_id,
        username,
        contact_email,
        note,
        status
      ) VALUES (
        ${matchedUser?.id ?? null},
        ${username},
        ${contactEmail},
        ${note},
        'pending'
      )
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      requestId: insertedRows[0]?.id ?? null,
      message:
        "Your password reset request was submitted. Please wait for an admin to process it.",
    });
  } catch (error) {
    console.error("Error creating password reset request:", error);
    return NextResponse.json(
      { error: "Failed to submit password reset request." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || Number((session.user as any)?.role) !== ADMIN_ROLE_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await ensurePasswordResetRequestsTable();

    const body = await request.json();
    const requestId = Number(body?.id);
    const action = String(body?.action || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const resolutionNote = String(body?.resolutionNote || "").trim() || null;
    const processedBy = Number((session.user as any)?.id) || null;

    if (!Number.isFinite(requestId)) {
      return NextResponse.json(
        { error: "Request ID is required." },
        { status: 400 },
      );
    }

    if (action !== "reset" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be 'reset' or 'reject'." },
        { status: 400 },
      );
    }

    const requestRows = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM password_reset_requests
      WHERE id = ${requestId}
      LIMIT 1
    `;

    const resetRequest = requestRows[0];
    if (!resetRequest) {
      return NextResponse.json(
        { error: "Password reset request not found." },
        { status: 404 },
      );
    }

    if (String(resetRequest.status || "").toLowerCase() !== "pending") {
      return NextResponse.json(
        { error: "This password reset request has already been processed." },
        { status: 409 },
      );
    }

    if (action === "reject") {
      await prisma.$executeRaw`
        UPDATE password_reset_requests
        SET status = 'rejected',
            processed_at = NOW(),
            processed_by = ${processedBy},
            resolution = 'rejected',
            resolution_note = ${resolutionNote}
        WHERE id = ${requestId}
      `;

      return NextResponse.json({
        success: true,
        message: "Password reset request rejected.",
      });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const user = resetRequest.user_id
      ? await prisma.users.findUnique({
          where: { id: Number(resetRequest.user_id) },
          select: { id: true, username: true },
        })
      : await prisma.users.findFirst({
          where: {
            username: {
              equals: String(resetRequest.username || ""),
              mode: "insensitive",
            },
          },
          select: { id: true, username: true },
        });

    if (!user) {
      return NextResponse.json(
        { error: "No user account matched this reset request." },
        { status: 404 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      await tx.$executeRaw`
        UPDATE password_reset_requests
        SET user_id = ${user.id},
            status = 'completed',
            processed_at = NOW(),
            processed_by = ${processedBy},
            resolution = 'password_reset',
            resolution_note = ${resolutionNote}
        WHERE id = ${requestId}
      `;
    });

    return NextResponse.json({
      success: true,
      message: `Password for "${user.username}" reset successfully.`,
    });
  } catch (error) {
    console.error("Error processing password reset request:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request." },
      { status: 500 },
    );
  }
}
