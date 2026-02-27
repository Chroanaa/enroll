import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  generateARNumber,
  generateORNumber,
  getServerDate,
} from "@/app/utils/arNumberUtils";

/**
 * GET /api/auth/enrollment/pending-payment
 *
 * Fetch all enrollees with status = 4 (Pending) or status = 5 (Partially Paid)
 * for payment processing.
 *
 * Query Parameters (optional):
 * - search: Search by student number, name, or program
 * - academic_year: Filter by academic year
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const academicYear = searchParams.get("academic_year");

    const where: any = {
      status: { in: [4, 5] }, // Pending (4) or Partially Paid (5)
    };

    if (academicYear) {
      where.academic_year = academicYear;
    }

    if (search) {
      where.OR = [
        { student_number: { contains: search, mode: "insensitive" } },
        { first_name: { contains: search, mode: "insensitive" } },
        { family_name: { contains: search, mode: "insensitive" } },
        { middle_name: { contains: search, mode: "insensitive" } },
        { course_program: { contains: search, mode: "insensitive" } },
      ];
    }

    const enrollees = await prisma.enrollment.findMany({
      where,
      orderBy: { id: "desc" },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
        academic_year: true,
        term: true,
        year_level: true,
        status: true,
      },
    });

    // Fetch the dynamic minimum payment from settings (default 3000)
    let minPaymentDefault = 3000;
    try {
      const minPaySetting = await prisma.settings.findUnique({
        where: { key: "enrollment_min_payment" },
      });
      if (minPaySetting) {
        minPaymentDefault = Number(minPaySetting.value) || 3000;
      }
    } catch {
      // Use default if settings table/key doesn't exist
    }

    // For each enrollee, check if they have a finalized assessment and get financial info
    const enriched = await Promise.all(
      enrollees.map(async (enrollee) => {
        let totalDue = 0;
        let totalPaid = 0;
        let assessmentId: number | null = null;
        let paymentMode: string | null = null;

        if (enrollee.student_number) {
          const assessment = await prisma.student_assessment.findFirst({
            where: {
              student_number: enrollee.student_number,
              status: "finalized",
              ...(enrollee.academic_year
                ? { academic_year: enrollee.academic_year }
                : {}),
            },
            include: {
              payments: true,
            },
            orderBy: { created_at: "desc" },
          });

          if (assessment) {
            assessmentId = assessment.id;
            paymentMode = assessment.payment_mode;
            const due =
              assessment.payment_mode.toLowerCase() === "installment"
                ? assessment.total_due_installment
                  ? Number(assessment.total_due_installment)
                  : Number(assessment.total_due)
                : assessment.total_due_cash
                  ? Number(assessment.total_due_cash)
                  : Number(assessment.total_due);

            totalPaid = assessment.payments.reduce(
              (sum, p) => sum + Number(p.amount_paid),
              0,
            );

            totalDue = due;
          }
        }

        // Default to dynamic min payment for status 4 or 5 enrollees with no assessment / zero total
        if ((enrollee.status === 4 || enrollee.status === 5) && totalDue <= 0) {
          totalDue = minPaymentDefault;

          // For students without assessments, get total paid from billing records
          if (!assessmentId) {
            try {
              const billingRecords = await prisma.billing.findMany({
                where: { enrollee_id: enrollee.id },
              });
              totalPaid = billingRecords.reduce(
                (sum, b) => sum + Number(b.amount || 0),
                0,
              );
            } catch {
              // fallback — keep totalPaid as 0
            }
          }
        }

        const remainingBalance = Math.max(0, totalDue - totalPaid);

        const studentName =
          `${enrollee.family_name || ""}, ${enrollee.first_name || ""} ${enrollee.middle_name || ""}`.trim();

        return {
          id: enrollee.id,
          student_number: enrollee.student_number,
          student_name: studentName,
          first_name: enrollee.first_name,
          middle_name: enrollee.middle_name,
          family_name: enrollee.family_name,
          course_program: enrollee.course_program,
          academic_year: enrollee.academic_year,
          term: enrollee.term,
          year_level: enrollee.year_level,
          status: enrollee.status,
          total_due: Math.round(totalDue * 100) / 100,
          total_paid: Math.round(totalPaid * 100) / 100,
          remaining_balance: Math.round(remainingBalance * 100) / 100,
          assessment_id: assessmentId,
          payment_mode: paymentMode,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: enriched,
      total: enriched.length,
    });
  } catch (error: any) {
    console.error("Error fetching pending enrollees:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Failed to fetch pending enrollees",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/auth/enrollment/pending-payment
 *
 * Process payment for a single enrollee.
 * - If the payment covers the full remaining balance → status updated to 2 (Reserved)
 * - If partial payment → status updated to 5 (Partially Paid)
 *
 * Body:
 * - enrollee_id: number - ID of the enrollee
 * - assessment_id: number - ID of the assessment
 * - payments: Array<{ payment_type: string, amount: number, reference_no?: string }>
 * - payment_mode?: string - "cash" (full pay) or "installment"
 * - user_id?: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enrollee_id, assessment_id, payments, payment_mode, user_id } =
      body;

    if (!enrollee_id) {
      return NextResponse.json(
        { error: "Enrollee ID is required" },
        { status: 400 },
      );
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "At least one payment entry is required" },
        { status: 400 },
      );
    }

    // Validate payment entries
    for (const p of payments) {
      if (!p.payment_type || !p.amount || Number(p.amount) <= 0) {
        return NextResponse.json(
          {
            error:
              "Each payment must have a valid payment_type and positive amount",
          },
          { status: 400 },
        );
      }
      if (
        (p.payment_type === "gcash" || p.payment_type === "bank_transfer") &&
        !p.reference_no
      ) {
        return NextResponse.json(
          {
            error: `Reference number is required for ${p.payment_type} payments`,
          },
          { status: 400 },
        );
      }
    }

    const paymentTotal = payments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    );

    const result = await prisma.$transaction(async (tx) => {
      // Verify enrollee exists and is in pending (4) or partially paid (5) status
      const enrollee = await tx.enrollment.findUnique({
        where: { id: enrollee_id },
      });
      if (!enrollee || (enrollee.status !== 4 && enrollee.status !== 5)) {
        throw new Error(
          "Enrollee not found or not in pending/partially paid status",
        );
      }

      // If assessment_id provided, record payments to the assessment
      let remainingBalance = 0;
      let totalDue = 0;
      if (assessment_id) {
        const assessment = await tx.student_assessment.findUnique({
          where: { id: assessment_id },
          include: { payments: true },
        });

        if (assessment && assessment.status === "finalized") {
          // Create payment records
          for (const p of payments) {
            await tx.student_payment.create({
              data: {
                assessment_id: assessment_id,
                amount_paid: Number(p.amount),
                payment_type: p.payment_type,
                payment_date: new Date(),
                reference_no: p.reference_no || null,
              },
            });
          }

          // Recalculate balance
          const allPayments = await tx.student_payment.findMany({
            where: { assessment_id: assessment_id },
          });

          const totalPaidNow = allPayments.reduce(
            (sum, pay) => sum + Number(pay.amount_paid),
            0,
          );

          totalDue =
            assessment.payment_mode.toLowerCase() === "installment"
              ? Number(assessment.total_due_installment || assessment.total_due)
              : Number(assessment.total_due_cash || assessment.total_due);

          remainingBalance = Math.max(0, totalDue - totalPaidNow);

          // For installment mode, check if any schedule items should be marked as paid
          if (assessment.payment_mode.toLowerCase() === "installment") {
            const schedules = await tx.payment_schedule.findMany({
              where: { assessment_id: assessment_id, is_paid: false },
              orderBy: { due_date: "asc" },
            });

            let runningPayment = totalPaidNow;
            for (const sched of schedules) {
              if (runningPayment >= Number(sched.amount)) {
                await tx.payment_schedule.update({
                  where: { id: sched.id },
                  data: { is_paid: true },
                });
                runningPayment -= Number(sched.amount);
              } else {
                break;
              }
            }
          }
        }
      }

      // If no assessment, use default minimum payment and apply the selected payment_mode
      if (!assessment_id || totalDue <= 0) {
        // Fetch dynamic min payment from settings
        let minPaymentDefault = 3000;
        try {
          const minPaySetting = await tx.settings.findUnique({
            where: { key: "enrollment_min_payment" },
          });
          if (minPaySetting) {
            minPaymentDefault = Number(minPaySetting.value) || 3000;
          }
        } catch {
          // Use default
        }
        totalDue = minPaymentDefault;
        remainingBalance = Math.max(0, totalDue - paymentTotal);
      }

      // Determine new enrollment status based on payment mode
      const chosenMode = payment_mode || "cash";
      const isFullyPaid = remainingBalance <= 0.01;
      const newStatus = isFullyPaid ? 2 : 5; // 2 = Reserved, 5 = Partially Paid

      // For installment mode, create payment_schedule records (3 terms)
      if (chosenMode === "installment" && assessment_id) {
        // Check if schedules already exist for this assessment
        const existingSchedules = await tx.payment_schedule.findMany({
          where: { assessment_id: assessment_id },
        });

        if (existingSchedules.length === 0) {
          // Create 3-term schedule: Prelim, Midterm, Final
          const perTerm = Math.ceil((totalDue / 3) * 100) / 100;
          const lastTerm = Math.round((totalDue - perTerm * 2) * 100) / 100;

          const now = new Date();
          // Prelim: now, Midterm: +2 months, Final: +4 months
          const midtermDate = new Date(now);
          midtermDate.setMonth(midtermDate.getMonth() + 2);
          const finalDate = new Date(now);
          finalDate.setMonth(finalDate.getMonth() + 4);

          await tx.payment_schedule.createMany({
            data: [
              {
                assessment_id: assessment_id,
                label: "Prelim",
                due_date: now,
                amount: perTerm,
                is_paid: paymentTotal >= perTerm - 0.01, // Mark paid if this payment covers it
              },
              {
                assessment_id: assessment_id,
                label: "Midterm",
                due_date: midtermDate,
                amount: perTerm,
                is_paid: false,
              },
              {
                assessment_id: assessment_id,
                label: "Final",
                due_date: finalDate,
                amount: lastTerm,
                is_paid: false,
              },
            ],
          });
        } else {
          // Schedules already exist — mark paid ones based on cumulative payments
          const allPayments = await tx.student_payment.findMany({
            where: { assessment_id: assessment_id },
          });
          const totalPaidNow = allPayments.reduce(
            (sum, pay) => sum + Number(pay.amount_paid),
            0,
          );

          const unpaidSchedules = await tx.payment_schedule.findMany({
            where: { assessment_id: assessment_id, is_paid: false },
            orderBy: { due_date: "asc" },
          });

          let runningPayment = totalPaidNow;
          for (const sched of unpaidSchedules) {
            if (runningPayment >= Number(sched.amount) - 0.01) {
              await tx.payment_schedule.update({
                where: { id: sched.id },
                data: { is_paid: true },
              });
              runningPayment -= Number(sched.amount);
            } else {
              break;
            }
          }
        }
      }

      // Update enrollment status
      await tx.enrollment.update({
        where: { id: enrollee_id },
        data: { status: newStatus },
      });

      // Create billing record
      const primaryPayment = payments[0];
      const billingRecord = await tx.billing.create({
        data: {
          enrollee_id: enrollee_id,
          is_paid: isFullyPaid ? 1 : 0,
          date_paid: new Date(),
          user_id: user_id || null,
          amount: paymentTotal,
          payment_type: primaryPayment.payment_type,
          reference_no: payments
            .map(
              (p: any) =>
                `${p.payment_type}: ₱${Number(p.amount).toFixed(2)}${p.reference_no ? ` (${p.reference_no})` : ""}`,
            )
            .join(" | "),
        },
      });

      // === Create order_header, order_details, and payment_details ===
      const studentNum = enrollee.student_number || undefined;
      const arNumber = await generateARNumber(studentNum);
      const orNumber = await generateORNumber();
      const serverDate = await getServerDate();

      const orderHeader = await tx.order_header.create({
        data: {
          order_date: serverDate,
          order_amount: paymentTotal,
          billing_id: billingRecord.id,
          ar_number: arNumber,
          or_number: orNumber,
          isvoided: 0,
          student_number: studentNum || null,
          user_id: user_id ? Number(user_id) : null,
          created_at: serverDate,
          updated_at: serverDate,
        },
      });

      // Create order_details — one line item per payment line
      for (const p of payments) {
        await tx.order_details.create({
          data: {
            order_header_id: orderHeader.id,
            product_id: 0, // 0 = enrollment payment (not a product)
            quantity: 1,
            selling_price: Number(p.amount),
            total: Number(p.amount),
            created_at: serverDate,
            updated_at: serverDate,
          },
        });
      }

      // Create payment_details — one per payment line
      for (const p of payments) {
        const paymentId =
          p.payment_type === "cash" ? 1 : p.payment_type === "gcash" ? 2 : 3;
        await tx.payment_details.create({
          data: {
            order_header_id: orderHeader.id,
            payment_id: paymentId,
            amount: Number(p.amount),
            tendered_amount: Number(p.amount),
            change_amount: 0,
            transaction_ref: p.reference_no || null,
            created_at: serverDate,
            updated_at: serverDate,
          },
        });
      }

      return {
        enrollee_id,
        new_status: newStatus,
        status_label: isFullyPaid ? "Reserved" : "Partially Paid",
        total_due: Math.round(totalDue * 100) / 100,
        payment_amount: Math.round(paymentTotal * 100) / 100,
        remaining_balance: Math.round(remainingBalance * 100) / 100,
        is_fully_paid: isFullyPaid,
        order_id: orderHeader.id,
        ar_number: arNumber,
        or_number: orNumber,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: result.is_fully_paid
          ? `Payment processed! Enrollee status updated to Reserved (2).`
          : `Partial payment recorded. Enrollee status updated to Partially Paid (5). Remaining: ₱${result.remaining_balance.toFixed(2)}`,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error processing enrollment payment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to process enrollment payment",
        details: error?.code || error,
      },
      { status: 500 },
    );
  }
}
