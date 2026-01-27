import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

// Get all categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch categories",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Create a new category
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create category",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
