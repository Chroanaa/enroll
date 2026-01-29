import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { generateARNumber, getServerDate } from "@/app/utils/arNumberUtils";

// Create a new order with order details and payment
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

    // Generate AR number using server date (prevents tampering)
    const arNumber = await generateARNumber(student_number);

    // Get server date for order_date to prevent tampering
    const serverDate = await getServerDate();

    // Create order header
    const orderHeader = await prisma.order_header.create({
      data: {
        order_date: serverDate,
        order_amount: Number(order_amount),
        billing_id: billing_id ? Number(billing_id) : null,
        ar_number: arNumber,
        isvoided: 0,
        student_number: student_number || null,
        created_at: serverDate,
        updated_at: serverDate,
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

// Get all orders with details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeVoided = searchParams.get("includeVoided") === "true";
    const orderId = searchParams.get("id");

    // If specific order ID requested, return full details
    if (orderId) {
      const order = await prisma.order_header.findUnique({
        where: { id: Number(orderId) },
      });

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Get order details with product info
      const orderDetails = await prisma.order_details.findMany({
        where: { order_header_id: Number(orderId) },
      });

      // Get product names for each detail
      const detailsWithProducts = await Promise.all(
        orderDetails.map(async (detail) => {
          const product = await prisma.products.findUnique({
            where: { id: detail.product_id },
          });
          return {
            ...detail,
            product_name: product?.name || "Enrollment Payment",
          };
        }),
      );

      // Get payment details
      const paymentDetails = await prisma.payment_details.findFirst({
        where: { order_header_id: Number(orderId) },
      });

      // Get payment type name
      let paymentTypeName = "Unknown";
      if (paymentDetails?.payment_id === 1) paymentTypeName = "Cash";
      else if (paymentDetails?.payment_id === 2) paymentTypeName = "GCash";
      else if (paymentDetails?.payment_id === 3)
        paymentTypeName = "Bank Transfer";

      // Get student info if student_number exists
      let studentInfo = null;
      if (order.student_number) {
        const student = await prisma.enrollment.findFirst({
          where: { student_number: order.student_number },
          select: {
            first_name: true,
            middle_name: true,
            family_name: true,
            course_program: true,
          },
        });
        if (student) {
          studentInfo = {
            student_name:
              `${student.family_name || ""}, ${student.first_name || ""} ${student.middle_name || ""}`.trim(),
            student_program: student.course_program,
          };
        }
      }

      return NextResponse.json({
        ...order,
        ...studentInfo,
        order_details: detailsWithProducts,
        payment_details: {
          ...paymentDetails,
          payment_type_name: paymentTypeName,
        },
      });
    }

    // Get all orders
    const orders = await prisma.order_header.findMany({
      where: includeVoided ? {} : { isvoided: 0 },
      orderBy: {
        created_at: "desc",
      },
    });

    // Get payment details and student info for each order
    const ordersWithPayment = await Promise.all(
      orders.map(async (order) => {
        const paymentDetails = await prisma.payment_details.findFirst({
          where: { order_header_id: order.id },
        });

        let paymentTypeName = "Unknown";
        if (paymentDetails?.payment_id === 1) paymentTypeName = "Cash";
        else if (paymentDetails?.payment_id === 2) paymentTypeName = "GCash";
        else if (paymentDetails?.payment_id === 3)
          paymentTypeName = "Bank Transfer";

        // Get student info if student_number exists
        let studentName = null;
        let studentProgram = null;
        if (order.student_number) {
          const student = await prisma.enrollment.findFirst({
            where: { student_number: order.student_number },
            select: {
              first_name: true,
              middle_name: true,
              family_name: true,
              course_program: true,
            },
          });
          if (student) {
            studentName =
              `${student.family_name || ""}, ${student.first_name || ""} ${student.middle_name || ""}`.trim();
            studentProgram = student.course_program;
          }
        }

        return {
          ...order,
          payment_type: paymentTypeName,
          transaction_ref: paymentDetails?.transaction_ref || null,
          student_name: studentName,
          student_program: studentProgram,
        };
      }),
    );

    return NextResponse.json(ordersWithPayment);
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

    // Get the order header to check if it has a billing_id (enrollment payment)
    const orderHeader = await prisma.order_header.findUnique({
      where: { id: Number(id) },
    });

    if (!orderHeader) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get order details to restore product quantities (for product sales)
    const orderDetails = await prisma.order_details.findMany({
      where: { order_header_id: Number(id) },
    });

    // Only restore product quantities for non-enrollment orders (product_id != 1)
    for (const detail of orderDetails) {
      if (detail.product_id !== 1) {
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
    }

    // If this is an enrollment order, get the billing record details before deleting
    let originalBilling = null;
    if (orderHeader.billing_id) {
      originalBilling = await prisma.billing.findUnique({
        where: { id: orderHeader.billing_id },
      });
      // Delete the original billing record
      await prisma.billing.delete({
        where: { id: orderHeader.billing_id },
      });
    }

    // Void the original order
    const voidedOrder = await prisma.order_header.update({
      where: { id: Number(id) },
      data: {
        isvoided: 1,
        updated_at: new Date(),
      },
    });

    // If this was an enrollment order, create a void billing record
    let voidBillingId = null;
    if (originalBilling) {
      const voidBilling = await prisma.billing.create({
        data: {
          enrollee_id: originalBilling.enrollee_id,
          term: originalBilling.term,
          is_paid: 1, // Mark as paid (refund processed)
          date_paid: new Date(),
          user_id: originalBilling.user_id,
          amount: originalBilling.amount
            ? -Number(originalBilling.amount)
            : null, // Negative amount for refund
          payment_type: "cash", // Default to cash for refunds
          reference_no: `VOID-${orderHeader.id}`,
        },
      });
      voidBillingId = voidBilling.id;
    }

    // Create a void transaction record in order_header
    const voidTransactionHeader = await prisma.order_header.create({
      data: {
        order_date: new Date(),
        order_amount: -(orderHeader.order_amount || 0), // Negative amount for void/refund
        billing_id: voidBillingId, // Link to void billing record if enrollment payment
        ar_number: `VOID-${orderHeader.id}`,
        isvoided: 1, // Mark as voided status
        voided_header_id: orderHeader.id, // Reference to original order
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create void order details for each original order detail
    for (const detail of orderDetails) {
      await prisma.order_details.create({
        data: {
          order_header_id: voidTransactionHeader.id,
          product_id: detail.product_id,
          quantity: -(detail.quantity || 0), // Negative quantity for void
          selling_price: detail.selling_price,
          total: -(detail.total || 0), // Negative total for void
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    // Create void payment details (default to cash - payment_id: 1)
    await prisma.payment_details.create({
      data: {
        order_header_id: voidTransactionHeader.id,
        payment_id: 1, // Cash payment
        amount: -(orderHeader.order_amount || 0), // Negative amount for refund
        tendered_amount: null,
        change_amount: null,
        transaction_ref: `VOID-${orderHeader.id}`,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      voidedOrder,
      voidTransaction: voidTransactionHeader,
    });
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
