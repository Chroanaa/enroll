import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type DashboardStudentRow = {
  assessment_id: number;
  student_number: string;
  student_name: string;
  course_program: string | null;
  academic_year: string;
  semester: number;
  payment_mode: string;
  total_due: number;
  total_paid: number;
  remaining_balance: number;
  payment_status: "Unpaid" | "Partial" | "Fully Paid";
};

type ProductAggregate = {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_sales: number;
  current_stock: number;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildStudentName = (
  enrollment: {
    first_name: string | null;
    middle_name: string | null;
    family_name: string | null;
  } | null,
) => {
  if (!enrollment) return "Unknown Student";

  const names = [
    enrollment.family_name,
    enrollment.first_name,
    enrollment.middle_name,
  ].filter(Boolean);

  if (names.length === 0) return "Unknown Student";
  return names.join(", ").replace(", ,", ",");
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const selectedYearParam = searchParams.get("year");
    const selectedAcademicYear = searchParams.get("academicYear");
    const selectedSemester = searchParams.get("semester");

    const currentYear = new Date().getFullYear();
    const selectedYear = selectedYearParam
      ? parseInt(selectedYearParam, 10)
      : currentYear;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const todayDateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const tomorrowDateOnly = new Date(todayDateOnly);
    tomorrowDateOnly.setDate(tomorrowDateOnly.getDate() + 1);

    const assessmentWhere: {
      academic_year?: string;
      semester?: number;
    } = {};

    if (selectedAcademicYear) {
      assessmentWhere.academic_year = selectedAcademicYear;
    }

    if (selectedSemester) {
      const semesterInt = parseInt(selectedSemester, 10);
      if ([1, 2, 3].includes(semesterInt)) {
        assessmentWhere.semester = semesterInt;
      }
    }

    const assessments = await prisma.student_assessment.findMany({
      where: assessmentWhere,
      select: {
        id: true,
        student_number: true,
        academic_year: true,
        semester: true,
        payment_mode: true,
        total_due: true,
        total_due_cash: true,
        total_due_installment: true,
        payments: {
          select: {
            amount_paid: true,
            payment_date: true,
          },
        },
      },
      orderBy: [{ academic_year: "desc" }, { semester: "desc" }],
    });

    const products = await prisma.products.findMany({
      select: {
        id: true,
        name: true,
        quantity: true,
        price: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    const orderHeaders = await prisma.order_header.findMany({
      where: {
        isvoided: 0,
      },
      select: {
        id: true,
        order_date: true,
        order_amount: true,
        billing_id: true,
      },
    });

    const orderHeaderIds = orderHeaders.map((header) => header.id);

    const orderDetails =
      orderHeaderIds.length > 0
        ? await prisma.order_details.findMany({
            where: {
              order_header_id: {
                in: orderHeaderIds,
              },
            },
            select: {
              order_header_id: true,
              product_id: true,
              quantity: true,
              total: true,
            },
          })
        : [];

    const assessmentPaymentsToday = await prisma.student_payment.aggregate({
      _sum: {
        amount_paid: true,
      },
      where: {
        payment_date: {
          gte: todayDateOnly,
          lt: tomorrowDateOnly,
        },
      },
    });

    const studentNumbers = Array.from(
      new Set(
        assessments
          .map((assessment) => assessment.student_number)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const enrollments = await prisma.enrollment.findMany({
      where: {
        student_number: {
          in: studentNumbers,
        },
      },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    const enrollmentByStudentNumber = new Map<
      string,
      {
        first_name: string | null;
        middle_name: string | null;
        family_name: string | null;
        course_program: string | null;
      }
    >();

    for (const enrollment of enrollments) {
      if (!enrollment.student_number) continue;
      if (enrollmentByStudentNumber.has(enrollment.student_number)) continue;

      enrollmentByStudentNumber.set(enrollment.student_number, {
        first_name: enrollment.first_name,
        middle_name: enrollment.middle_name,
        family_name: enrollment.family_name,
        course_program: enrollment.course_program,
      });
    }

    const yearlyEarningsMap = new Map<number, number>();
    const monthlyEarningsMap = new Map<number, number>();

    let totalCollected = 0;
    let totalDue = 0;
    let totalOutstanding = 0;
    let totalPaymentsCount = 0;

    const dailyAssessmentIncome = toNumber(
      assessmentPaymentsToday._sum.amount_paid,
    );

    const dashboardRows: DashboardStudentRow[] = [];

    for (const assessment of assessments) {
      const isInstallment =
        assessment.payment_mode?.toLowerCase() === "installment";
      const totalDueForAssessment = isInstallment
        ? toNumber(assessment.total_due_installment ?? assessment.total_due)
        : toNumber(assessment.total_due_cash ?? assessment.total_due);

      const totalPaidForAssessment = assessment.payments.reduce(
        (sum, payment) => sum + toNumber(payment.amount_paid),
        0,
      );

      const remainingBalance = Math.max(
        0,
        totalDueForAssessment - totalPaidForAssessment,
      );

      let paymentStatus: "Unpaid" | "Partial" | "Fully Paid" = "Unpaid";
      if (totalDueForAssessment > 0 && remainingBalance <= 0.01) {
        paymentStatus = "Fully Paid";
      } else if (totalPaidForAssessment > 0) {
        paymentStatus = "Partial";
      }

      const enrollment = enrollmentByStudentNumber.get(
        assessment.student_number,
      );

      dashboardRows.push({
        assessment_id: assessment.id,
        student_number: assessment.student_number,
        student_name: buildStudentName(enrollment ?? null),
        course_program: enrollment?.course_program ?? null,
        academic_year: assessment.academic_year,
        semester: assessment.semester,
        payment_mode: assessment.payment_mode,
        total_due: Math.round(totalDueForAssessment * 100) / 100,
        total_paid: Math.round(totalPaidForAssessment * 100) / 100,
        remaining_balance: Math.round(remainingBalance * 100) / 100,
        payment_status: paymentStatus,
      });

      totalCollected += totalPaidForAssessment;
      totalDue += totalDueForAssessment;
      totalOutstanding += remainingBalance;

      for (const payment of assessment.payments) {
        const paidAmount = toNumber(payment.amount_paid);
        totalPaymentsCount += 1;

        const paymentDate = new Date(payment.payment_date);
        const paymentYear = paymentDate.getFullYear();
        const paymentMonth = paymentDate.getMonth() + 1;

        yearlyEarningsMap.set(
          paymentYear,
          (yearlyEarningsMap.get(paymentYear) ?? 0) + paidAmount,
        );

        if (paymentYear === selectedYear) {
          monthlyEarningsMap.set(
            paymentMonth,
            (monthlyEarningsMap.get(paymentMonth) ?? 0) + paidAmount,
          );
        }
      }
    }

    const orderHeaderById = new Map(
      orderHeaders.map((header) => [header.id, header]),
    );
    const productById = new Map(
      products.map((product) => [
        product.id,
        {
          name: product.name || `Product #${product.id}`,
          quantity: product.quantity ?? 0,
        },
      ]),
    );

    const yearlyProductMap = new Map<number, ProductAggregate>();
    const monthlyProductMap = new Map<number, ProductAggregate>();
    const dailyProductMap = new Map<number, ProductAggregate>();

    let dailyPosIncome = 0;

    for (const header of orderHeaders) {
      const orderDate = new Date(header.order_date);
      const isToday =
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate();

      if (isToday) {
        dailyPosIncome += toNumber(header.order_amount);
      }
    }

    const upsertAggregate = (
      map: Map<number, ProductAggregate>,
      productId: number,
      productName: string,
      currentStock: number,
      quantity: number,
      sales: number,
    ) => {
      const existing = map.get(productId);
      if (existing) {
        existing.total_quantity += quantity;
        existing.total_sales += sales;
        return;
      }

      map.set(productId, {
        product_id: productId,
        product_name: productName,
        total_quantity: quantity,
        total_sales: sales,
        current_stock: currentStock,
      });
    };

    for (const detail of orderDetails) {
      const headerId = detail.order_header_id;
      if (!headerId) continue;

      const header = orderHeaderById.get(headerId);
      if (!header) continue;

      // Enrollment orders are linked to billing_id and use placeholder line items.
      // Product analytics should only count real product sales.
      if (header.billing_id) continue;

      const orderDate = new Date(header.order_date);
      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth() + 1;
      const isToday =
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate();

      const productInfo = productById.get(detail.product_id);
      if (!productInfo) continue;

      const productName = productInfo?.name || `Product #${detail.product_id}`;
      const currentStock = productInfo?.quantity ?? 0;
      const quantity = toNumber(detail.quantity);
      const sales = toNumber(detail.total);

      if (orderYear === selectedYear) {
        upsertAggregate(
          yearlyProductMap,
          detail.product_id,
          productName,
          currentStock,
          quantity,
          sales,
        );
      }

      if (orderYear === selectedYear && orderMonth === currentMonth) {
        upsertAggregate(
          monthlyProductMap,
          detail.product_id,
          productName,
          currentStock,
          quantity,
          sales,
        );
      }

      if (isToday) {
        upsertAggregate(
          dailyProductMap,
          detail.product_id,
          productName,
          currentStock,
          quantity,
          sales,
        );
      }
    }

    const pickMostBought = (map: Map<number, ProductAggregate>) => {
      const values = Array.from(map.values());
      if (values.length === 0) return null;

      values.sort((a, b) => {
        if (b.total_quantity !== a.total_quantity) {
          return b.total_quantity - a.total_quantity;
        }
        return b.total_sales - a.total_sales;
      });

      const best = values[0];
      return {
        ...best,
        total_sales: Math.round(best.total_sales * 100) / 100,
      };
    };

    const stockItems = products
      .map((product) => {
        const stock = product.quantity ?? 0;
        let stock_status: "out_of_stock" | "low_stock" | "in_stock" =
          "in_stock";

        if (stock <= 0) {
          stock_status = "out_of_stock";
        } else if (stock <= 10) {
          stock_status = "low_stock";
        }

        return {
          product_id: product.id,
          product_name: product.name || `Product #${product.id}`,
          stock,
          price: toNumber(product.price),
          stock_status,
        };
      })
      .sort((a, b) => {
        if (a.stock_status !== b.stock_status) {
          const rank = {
            out_of_stock: 0,
            low_stock: 1,
            in_stock: 2,
          };
          return rank[a.stock_status] - rank[b.stock_status];
        }
        return a.stock - b.stock;
      });

    const outOfStockCount = stockItems.filter(
      (item) => item.stock_status === "out_of_stock",
    ).length;
    const lowStockCount = stockItems.filter(
      (item) => item.stock_status === "low_stock",
    ).length;
    const inStockCount = stockItems.filter(
      (item) => item.stock_status === "in_stock",
    ).length;

    const dailyIncome = dailyAssessmentIncome + dailyPosIncome;

    // Aggregate per student so each student is counted only once
    const studentAggMap = new Map<
      string,
      {
        student_number: string;
        student_name: string;
        course_program: string | null;
        academic_year: string;
        semester: number;
        payment_mode: string;
        total_due: number;
        total_paid: number;
        remaining_balance: number;
      }
    >();

    for (const row of dashboardRows) {
      const existing = studentAggMap.get(row.student_number);
      if (existing) {
        existing.total_due += row.total_due;
        existing.total_paid += row.total_paid;
        existing.remaining_balance += row.remaining_balance;
      } else {
        studentAggMap.set(row.student_number, {
          student_number: row.student_number,
          student_name: row.student_name,
          course_program: row.course_program,
          academic_year: row.academic_year,
          semester: row.semester,
          payment_mode: row.payment_mode,
          total_due: row.total_due,
          total_paid: row.total_paid,
          remaining_balance: row.remaining_balance,
        });
      }
    }

    const uniqueStudents = Array.from(studentAggMap.values()).map((s) => {
      let payment_status: "Unpaid" | "Partial" | "Fully Paid" = "Unpaid";
      if (s.total_due > 0 && s.remaining_balance <= 0.01) {
        payment_status = "Fully Paid";
      } else if (s.total_paid > 0) {
        payment_status = "Partial";
      }
      return {
        ...s,
        total_due: Math.round(s.total_due * 100) / 100,
        total_paid: Math.round(s.total_paid * 100) / 100,
        remaining_balance: Math.round(s.remaining_balance * 100) / 100,
        payment_status,
      };
    });

    const unpaidStudents = uniqueStudents
      .filter((row) => row.payment_status === "Unpaid")
      .sort((a, b) => b.remaining_balance - a.remaining_balance);

    const fullyPaidStudents = uniqueStudents
      .filter((row) => row.payment_status === "Fully Paid")
      .sort((a, b) => b.total_paid - a.total_paid);

    const partialStudentsCount = uniqueStudents.filter(
      (row) => row.payment_status === "Partial",
    ).length;

    const unpaidInstallmentCount = unpaidStudents.filter(
      (row) => row.payment_mode?.toLowerCase() === "installment",
    ).length;

    const unpaidFullPayCount = unpaidStudents.filter(
      (row) => row.payment_mode?.toLowerCase() !== "installment",
    ).length;

    const yearlyEarnings = Array.from(yearlyEarningsMap.entries())
      .map(([year, total]) => ({
        year,
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.year - a.year);

    const monthlyEarnings = Array.from({ length: 12 }, (_, idx) => {
      const month = idx + 1;
      return {
        month,
        total: Math.round((monthlyEarningsMap.get(month) ?? 0) * 100) / 100,
      };
    });

    const academicYearOptions = Array.from(
      new Set(assessments.map((assessment) => assessment.academic_year)),
    )
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return NextResponse.json(
      {
        success: true,
        filters: {
          selectedYear,
          selectedAcademicYear: selectedAcademicYear || null,
          selectedSemester: selectedSemester ? Number(selectedSemester) : null,
          availableAcademicYears: academicYearOptions,
        },
        summaries: {
          total_assessments: dashboardRows.length,
          total_payments: totalPaymentsCount,
          total_collected: Math.round(totalCollected * 100) / 100,
          daily_income: Math.round(dailyIncome * 100) / 100,
          daily_income_assessment:
            Math.round(dailyAssessmentIncome * 100) / 100,
          daily_income_pos: Math.round(dailyPosIncome * 100) / 100,
          total_due: Math.round(totalDue * 100) / 100,
          total_outstanding: Math.round(totalOutstanding * 100) / 100,
          fully_paid_students: fullyPaidStudents.length,
          unpaid_students: unpaidStudents.length,
          partial_students: partialStudentsCount,
          unpaid_installment_students: unpaidInstallmentCount,
          unpaid_fullpay_students: unpaidFullPayCount,
        },
        earnings: {
          yearly: yearlyEarnings,
          monthly: monthlyEarnings,
        },
        students: {
          unpaid: unpaidStudents,
          fully_paid: fullyPaidStudents,
        },
        product_analytics: {
          most_bought: {
            daily: pickMostBought(dailyProductMap),
            monthly: pickMostBought(monthlyProductMap),
            yearly: pickMostBought(yearlyProductMap),
          },
          stocks: {
            total_products: stockItems.length,
            out_of_stock: outOfStockCount,
            low_stock: lowStockCount,
            in_stock: inStockCount,
            items: stockItems,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error building payment dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to build payment dashboard",
      },
      { status: 500 },
    );
  }
}
