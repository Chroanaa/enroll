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

    const unpaidStudents = dashboardRows
      .filter((row) => row.remaining_balance > 0.01)
      .sort((a, b) => b.remaining_balance - a.remaining_balance);

    const fullyPaidStudents = dashboardRows
      .filter((row) => row.payment_status === "Fully Paid")
      .sort((a, b) => b.total_paid - a.total_paid);

    const partialStudentsCount = dashboardRows.filter(
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
