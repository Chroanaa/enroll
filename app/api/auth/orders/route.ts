import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

// Create a new order with order details and payment
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      order_date,
      order_amount,
      billing_id,
      ar_number,
      items,
      payment_type,
      tendered_amount,
      change_amount,
      transaction_ref,
    } = data;

    // Create order header
    const orderHeader = await prisma.order_header.create({
      data: {
        order_date: order_date ? new Date(order_date) : new Date(),
        order_amount: Number(order_amount),
        billing_id: billing_id ? Number(billing_id) : null,
        ar_number: ar_number || null,
        isvoided: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create order details for each item
    if (items && items.length > 0) {
      for (const item of items) {
        await prisma.order_details.create({
          data: {
            order_header_id: orderHeader.id,
            product_id: item.product_id,
            quantity: item.quantity,
            selling_price: Number(item.selling_price),
            total: Number(item.total),
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        // Update product quantity (reduce stock)
        await prisma.products.update({
          where: { id: item.product_id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
            updated_at: new Date(),
          },
        });
      }
    }

    // Create payment details
    const paymentId =
      payment_type === "cash" ? 1 : payment_type === "gcash" ? 2 : 3;
    await prisma.payment_details.create({
      data: {
        order_header_id: orderHeader.id,
        payment_id: paymentId,
        amount: Number(order_amount),
        tendered_amount: tendered_amount ? Number(tendered_amount) : null,
        change_amount: change_amount ? Number(change_amount) : null,
        transaction_ref: transaction_ref || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(orderHeader, { status: 201 });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create order",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Get all orders
export async function GET() {
  try {
    const orders = await prisma.order_header.findMany({
      where: {
        isvoided: 0,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch orders",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}

// Void an order
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id } = data;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    // Get order details to restore product quantities
    const orderDetails = await prisma.order_details.findMany({
      where: { order_header_id: Number(id) },
    });

    // Restore product quantities
    for (const detail of orderDetails) {
      await prisma.products.update({
        where: { id: detail.product_id },
        data: {
          quantity: {
            increment: detail.quantity || 0,
          },
          updated_at: new Date(),
        },
      });
    }

    // Void the order
    const voidedOrder = await prisma.order_header.update({
      where: { id: Number(id) },
      data: {
        isvoided: 1,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(voidedOrder);
  } catch (error: any) {
    console.error("Error voiding order:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to void order",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
