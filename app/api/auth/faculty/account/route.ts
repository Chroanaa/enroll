import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import { authOptions } from "../../[...nextauth]/authOptions";
import { prisma } from "@/app/lib/prisma";

const ADMIN_ROLE_ID = 1;
const FACULTY_ROLE_ID = 3;
const DEAN_ROLE_ID = 5;
const ALLOWED_FACULTY_ACCOUNT_ROLES = new Set([FACULTY_ROLE_ID, DEAN_ROLE_ID]);

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || Number((session.user as any)?.role) !== ADMIN_ROLE_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { facultyId, username, password, role } = await request.json();

    if (!facultyId || !username || !password) {
      return NextResponse.json(
        { error: `Faculty ID, username, and password are required` },
        { status: 400 },
      );
    }

    const parsedFacultyId = Number(facultyId);
    if (!Number.isFinite(parsedFacultyId)) {
      return NextResponse.json(
        { error: "Invalid faculty ID" },
        { status: 400 },
      );
    }

    if (typeof username !== "string" || username.trim().length < 3) {
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

    const faculty = await prisma.faculty.findUnique({
      where: { id: parsedFacultyId },
      select: {
        id: true,
        user_id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
      },
    });

    if (!faculty) {
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
    }

    if (faculty.user_id) {
      return NextResponse.json(
        {
          error: `This faculty already has a linked account (User ID: ${faculty.user_id}).`,
        },
        { status: 409 },
      );
    }

    const duplicate = await prisma.users.findFirst({
      where: { username: username.trim() },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 },
      );
    }

    const parsedRoleId = Number(role);
    const selectedRoleId = Number.isFinite(parsedRoleId)
      ? parsedRoleId
      : FACULTY_ROLE_ID;

    if (!ALLOWED_FACULTY_ACCOUNT_ROLES.has(selectedRoleId)) {
      return NextResponse.json(
        { error: "Role must be either FACULTY or DEAN" },
        { status: 400 },
      );
    }

    const roleRecord = await prisma.roles.findUnique({
      where: { id: selectedRoleId },
      select: { id: true },
    });

    if (!roleRecord) {
      return NextResponse.json(
        { error: "Selected role is not configured" },
        { status: 500 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          username: username.trim(),
          password: hashedPassword,
          role: selectedRoleId,
          firstname: faculty.first_name,
          middlename: faculty.middle_name || null,
          lastname: faculty.last_name,
        },
        select: {
          id: true,
          username: true,
          role: true,
          firstname: true,
          middlename: true,
          lastname: true,
        },
      });

      await tx.faculty.update({
        where: { id: parsedFacultyId },
        data: { user_id: newUser.id },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: "Account created and linked successfully",
        facultyId: parsedFacultyId,
        user: created,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating faculty account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
