import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";

const ADMIN_ROLE_ID = 1;

/**
 * GET /api/auth/accounts
 * List all user accounts (admin only).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || Number((session.user as any)?.role) !== ADMIN_ROLE_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rawUsers = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        firstname: true,
        middlename: true,
        lastname: true,
        roles: { select: { role: true } },
      },
      orderBy: { id: "asc" },
    });

    const users = rawUsers.map(
      ({ firstname, middlename, lastname, ...rest }) => ({
        ...rest,
        first_name: firstname,
        middle_name: middlename,
        last_name: lastname,
      }),
    );

    const roles = await prisma.roles.findMany({
      where: { status: 1 },
      select: { id: true, role: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ users, roles });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/auth/accounts
 * Create a new user account (admin only).
 * Body: { username, password, role }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || Number((session.user as any)?.role) !== ADMIN_ROLE_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const {
      username,
      password,
      role,
      first_name,
      middle_name,
      last_name,
      position,
    } = await request.json();

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: "Username, password, and role are required" },
        { status: 400 },
      );
    }

    if (typeof username !== "string" || username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 },
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    // Check if username already exists
    const existing = await prisma.users.findFirst({
      where: { username },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 },
      );
    }

    // Verify the role exists
    const roleRecord = await prisma.roles.findUnique({
      where: { id: Number(role) },
    });
    if (!roleRecord) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Hash password using bcrypt (same as login verification uses)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        role: Number(role),
        firstname: first_name || null,
        middlename: middle_name || null,
        lastname: last_name || null,
      },
      select: { id: true, username: true, role: true },
    });

    return NextResponse.json(
      { message: "Account created successfully", user: newUser },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/auth/accounts
 * Update a user account (admin only).
 * Body: { id, username?, password?, role? }
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || Number((session.user as any)?.role) !== ADMIN_ROLE_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const {
      id,
      username,
      password,
      role,
      first_name,
      middle_name,
      last_name,
      position,
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.users.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (username !== undefined) {
      if (typeof username !== "string" || username.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 },
        );
      }
      // Check for duplicate username (excluding self)
      const duplicate = await prisma.users.findFirst({
        where: { username, id: { not: Number(id) } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 409 },
        );
      }
      updateData.username = username;
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 },
        );
      }
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    if (role !== undefined) {
      const roleRecord = await prisma.roles.findUnique({
        where: { id: Number(role) },
      });
      if (!roleRecord) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updateData.role = Number(role);
    }

    if (first_name !== undefined) updateData.firstname = first_name || null;
    if (middle_name !== undefined) updateData.middlename = middle_name || null;
    if (last_name !== undefined) updateData.lastname = last_name || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.users.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, username: true, role: true },
    });

    return NextResponse.json({
      message: "Account updated successfully",
      user: updated,
    });
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/auth/accounts
 * Delete a user account (admin only).
 * Body: { id }
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || Number((session.user as any)?.role) !== ADMIN_ROLE_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 },
      );
    }

    // Prevent deleting own account
    const currentUserId = (session.user as any)?.id;
    if (String(id) === String(currentUserId)) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    const existing = await prisma.users.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.users.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
