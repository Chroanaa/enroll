import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

// Get all products with category info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    const whereClause = categoryId
      ? { category_id: Number(categoryId) }
      : undefined;

    const products = await prisma.products.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch products",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Create a new product
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, category_id, quantity, price } = data;

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 },
      );
    }

    const newProduct = await prisma.products.create({
      data: {
        name,
        category_id: category_id ? Number(category_id) : null,
        quantity: quantity ? Number(quantity) : 0,
        price: price ? Number(price) : null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create product",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Update a product
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    const cleanData: any = {
      updated_at: new Date(),
    };

    if (updateData.name !== undefined) cleanData.name = updateData.name;
    if (updateData.category_id !== undefined)
      cleanData.category_id = Number(updateData.category_id);
    if (updateData.quantity !== undefined)
      cleanData.quantity = Number(updateData.quantity);
    if (updateData.price !== undefined)
      cleanData.price = Number(updateData.price);

    const updatedProduct = await prisma.products.update({
      where: { id: Number(id) },
      data: cleanData,
    });

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to update product",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Delete a product
export async function DELETE(request: NextRequest) {
  try {
    const id = await request.json();

    const deletedProduct = await prisma.products.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json(deletedProduct);
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to delete product",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
