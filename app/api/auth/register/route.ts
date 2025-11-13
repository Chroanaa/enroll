import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        username: username,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = await prisma.users.create({
      data: {
        username: username,
        password: password,
        role: 1, // Default role
      },
    });

    const userData = {
      id: newUser.id,
      username: newUser.username,
    };

    return NextResponse.json(
      {
        success: true,
        user: userData,
        message: "User registered successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
