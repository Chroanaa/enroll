/**
 * Payment Calculation Utilities
 * Handles all payment-related calculations
 * Separated from assessment calculations
 */

import { prisma } from "../lib/prisma";

export interface PaymentSummary {
  totalPaid: number;
  totalDue: number;
  remainingBalance: number;
  isFullyPaid: boolean;
  paymentCount: number;
}

export interface InstallmentPaymentStatus {
  label: string;
  dueDate: Date;
  amount: number;
  isPaid: boolean;
  paidAmount: number;
  remainingAmount: number;
}

/**
 * Calculate payment summary for an assessment
 */
export async function calculatePaymentSummary(assessmentId: number): Promise<PaymentSummary> {
  const assessment = await prisma.student_assessment.findUnique({
    where: { id: assessmentId },
    include: {
      payments: true,
    },
  });

  if (!assessment) {
    throw new Error("Assessment not found");
  }

  const totalPaid = assessment.payments.reduce(
    (sum, p) => sum + Number(p.amount_paid),
    0
  );

  const totalDue = assessment.payment_mode === 'cash' 
    ? Number(assessment.total_due_cash || assessment.total_due)
    : Number(assessment.total_due_installment || assessment.total_due);

  const remainingBalance = Math.max(0, totalDue - totalPaid);
  const isFullyPaid = remainingBalance <= 0.01; // Allow 1 cent tolerance

  return {
    totalPaid,
    totalDue,
    remainingBalance,
    isFullyPaid,
    paymentCount: assessment.payments.length,
  };
}

/**
 * Get installment payment status
 */
export async function getInstallmentPaymentStatus(assessmentId: number): Promise<InstallmentPaymentStatus[]> {
  const assessment = await prisma.student_assessment.findUnique({
    where: { id: assessmentId },
    include: {
      payment_schedules: {
        orderBy: { due_date: "asc" },
      },
      payments: {
        orderBy: { payment_date: "asc" },
      },
    },
  });

  if (!assessment || assessment.payment_mode !== 'installment') {
    return [];
  }

  // Calculate running total of payments
  let runningPaidTotal = 0;
  const status: InstallmentPaymentStatus[] = [];

  for (const schedule of assessment.payment_schedules) {
    const scheduleAmount = Number(schedule.amount);
    const previousRunningTotal = runningPaidTotal;
    
    // Calculate how much of this installment has been paid
    // Payments are applied in order to installments
    let paidForThisInstallment = 0;
    for (const payment of assessment.payments) {
      const paymentAmount = Number(payment.amount_paid);
      if (runningPaidTotal < previousRunningTotal + scheduleAmount) {
        const remainingInSchedule = scheduleAmount - (runningPaidTotal - previousRunningTotal);
        const appliedAmount = Math.min(paymentAmount, remainingInSchedule);
        paidForThisInstallment += appliedAmount;
        runningPaidTotal += appliedAmount;
      }
    }

    status.push({
      label: schedule.label,
      dueDate: schedule.due_date,
      amount: scheduleAmount,
      isPaid: schedule.is_paid,
      paidAmount: paidForThisInstallment,
      remainingAmount: Math.max(0, scheduleAmount - paidForThisInstallment),
    });
  }

  return status;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

