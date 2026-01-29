import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { generateARNumber, getServerDate } from "@/app/utils/arNumberUtils";

// Create a new enrollment order with order details and payment
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      order_amount,
      billing_id,
      items,
      payment_type,
      tendered_amount,
      change_amount,
      transaction_ref,
      student_number,
    } = data;

    // Get the first student number from items if not provided directly
    const studentNum =
      student_number ||
      (items && items.length > 0 ? items[0].student_number : null);

    // Generate AR number using server date (prevents tampering)
    const arNumber = await generateARNumber(studentNum);

    // Get server date for order_date to prevent tampering
    const serverDate = await getServerDate();

    // Create order header for enrollment payment
    const orderHeader = await prisma.order_header.create({
      data: {
        order_date: serverDate,
        order_amount: Number(order_amount),
        billing_id: billing_id ? Number(billing_id) : null,
        ar_number: arNumber,
        isvoided: 0,
        student_number: studentNum || null,
        created_at: serverDate,
        updated_at: serverDate,
      },
    });

    // Create order details for each enrollment item
    if (items && items.length > 0) {
      for (const item of items) {
        await prisma.order_details.create({
          data: {
            order_header_id: orderHeader.id,
            product_id: 1, // Default product for enrollment payments
            quantity: 1,
            selling_price: Number(item.amount),
            total: Number(item.amount),
            created_at: new Date(),
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
    console.error("Error creating enrollment order:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to create enrollment order",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
