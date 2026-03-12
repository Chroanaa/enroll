/**
 * Assessment Calculation Utilities
 * Implements the financial logic for student assessments
 */

export interface CalculationInputs {
  enrolledSubjects: Array<{
    units_total: number;
    units_lec?: number;
    units_lab?: number;
    fixedAmount?: number | null;
  }>;
  tuitionPerUnit: number;
  discountPercentage?: number;
  dynamicFees: Record<number, number>; // feeId -> amount
  paymentMode: 'cash' | 'installment';
  downPayment?: number;               // from settings: min_downpayment
  installmentChargePercentage?: number; // from settings: installment_charge_percentage (default 5)
}

export interface CalculationResults {
  // Phase 1: Base Calculations
  regularUnits: number;
  fixedAmountTotal: number;
  grossTuition: number;
  
  // Phase 2: Discount
  discountAmount: number;
  netTuition: number;
  
  // Phase 3: Fees
  dynamicFeesTotal: number;
  labFeeTotal: number;
  baseTotal: number;
  
  // Phase 4: Payment Mode
  totalDueCash: number;
  downPayment?: number;          // from settings
  netBalance?: number;           // baseTotal - downPayment
  insuranceAmount?: number;      // chargePercentage% of netBalance for installment
  totalInstallment?: number;     // netBalance + insuranceAmount (per-installment portion)
  totalDueInstallment?: number;  // downPayment + totalInstallment (grand total)
}

/**
 * Calculate regular units for tuition — lecture units only (excludes lab units and fixed amount subjects)
 */
export function calculateRegularUnits(
  enrolledSubjects: Array<{ units_total: number; units_lec?: number; fixedAmount?: number | null }>
): number {
  return enrolledSubjects
    .filter(subject => !subject.fixedAmount || subject.fixedAmount === 0)
    .reduce((sum, subject) => {
      // Use units_lec if available, otherwise fall back to units_total
      const lecUnits = subject.units_lec !== undefined && subject.units_lec !== null
        ? subject.units_lec
        : subject.units_total;
      return sum + lecUnits;
    }, 0);
}

/**
 * Calculate fixed amount total
 */
export function calculateFixedAmountTotal(
  enrolledSubjects: Array<{ fixedAmount?: number | null }>
): number {
  return enrolledSubjects
    .filter(subject => subject.fixedAmount && subject.fixedAmount > 0)
    .reduce((sum, subject) => sum + (subject.fixedAmount || 0), 0);
}

/**
 * Calculate gross tuition
 */
export function calculateGrossTuition(regularUnits: number, tuitionPerUnit: number): number {
  return roundToTwoDecimals(regularUnits * tuitionPerUnit);
}

/**
 * Apply discount to gross tuition
 */
export function applyDiscount(
  grossTuition: number,
  discountPercentage: number
): { discountAmount: number; netTuition: number } {
  const discountAmount = roundToTwoDecimals(grossTuition * (discountPercentage / 100));
  // Cap discount at gross tuition to prevent negative net tuition
  const actualDiscount = Math.min(discountAmount, grossTuition);
  const netTuition = Math.max(0, roundToTwoDecimals(grossTuition - actualDiscount));
  
  return {
    discountAmount: actualDiscount,
    netTuition,
  };
}

/**
 * Calculate dynamic fees total
 */
export function calculateDynamicFeesTotal(dynamicFees: Record<number, number>): number {
  return roundToTwoDecimals(
    Object.values(dynamicFees).reduce((sum, amount) => sum + amount, 0)
  );
}

/**
 * Calculate lab fee total (units_lab * 1000 per subject, separate from tuition)
 */
export function calculateLabFeeTotal(
  enrolledSubjects: Array<{ units_lab?: number; fixedAmount?: number | null }>
): number {
  return roundToTwoDecimals(
    enrolledSubjects
      .filter(subject => !subject.fixedAmount || subject.fixedAmount === 0)
      .reduce((sum, subject) => sum + ((subject.units_lab || 0) * 1000), 0)
  );
}

/**
 * Calculate base total (before payment mode)
 */
export function calculateBaseTotal(
  netTuition: number,
  dynamicFeesTotal: number,
  fixedAmountTotal: number,
  labFeeTotal: number = 0
): number {
  return roundToTwoDecimals(netTuition + dynamicFeesTotal + fixedAmountTotal + labFeeTotal);
}

/**
 * Calculate cash basis total
 */
export function calculateCashBasis(baseTotal: number): number {
  return roundToTwoDecimals(baseTotal);
}

/**
 * Calculate installment basis using downPayment and charge percentage from settings
 */
export function calculateInstallmentBasis(
  baseTotal: number,
  downPayment: number = 0,
  chargePercentage: number = 5
): {
  downPayment: number;
  netBalance: number;
  insuranceAmount: number;
  totalInstallment: number;  // netBalance + insurance (the installment portion paid in schedule)
  totalDueInstallment: number; // downPayment + totalInstallment (grand total)
} {
  const safeDown = Math.min(downPayment, baseTotal); // can't exceed base total
  const netBalance = roundToTwoDecimals(baseTotal - safeDown);
  const insuranceAmount = roundToTwoDecimals(netBalance * (chargePercentage / 100));
  const totalInstallment = roundToTwoDecimals(netBalance + insuranceAmount);
  const totalDueInstallment = roundToTwoDecimals(safeDown + totalInstallment);

  return {
    downPayment: safeDown,
    netBalance,
    insuranceAmount,
    totalInstallment,
    totalDueInstallment,
  };
}

/**
 * Main calculation function - performs all calculations in correct order
 */
export function calculateAssessment(inputs: CalculationInputs): CalculationResults {
  // Phase 1: Base Calculations
  const regularUnits = calculateRegularUnits(inputs.enrolledSubjects);
  const fixedAmountTotal = calculateFixedAmountTotal(inputs.enrolledSubjects);
  const grossTuition = calculateGrossTuition(regularUnits, inputs.tuitionPerUnit);
  
  // Phase 2: Discount Application (before payment mode)
  const discountPercentage = inputs.discountPercentage || 0;
  const { discountAmount, netTuition } = applyDiscount(grossTuition, discountPercentage);
  
  // Phase 3: Fees Addition
  const dynamicFeesTotal = calculateDynamicFeesTotal(inputs.dynamicFees);
  const labFeeTotal = calculateLabFeeTotal(inputs.enrolledSubjects);
  const baseTotal = calculateBaseTotal(netTuition, dynamicFeesTotal, fixedAmountTotal, labFeeTotal);
  
  // Phase 4: Payment Mode Calculation
  let totalDueCash = 0;
  let insuranceAmount: number | undefined;
  let totalInstallment: number | undefined;
  
  let downPaymentResult: number | undefined;
  let netBalance: number | undefined;
  let totalDueInstallment: number | undefined;

  if (inputs.paymentMode === 'cash') {
    totalDueCash = calculateCashBasis(baseTotal);
  } else if (inputs.paymentMode === 'installment') {
    const installmentCalc = calculateInstallmentBasis(
      baseTotal,
      inputs.downPayment ?? 0,
      inputs.installmentChargePercentage ?? 5
    );
    downPaymentResult = installmentCalc.downPayment;
    netBalance = installmentCalc.netBalance;
    insuranceAmount = installmentCalc.insuranceAmount;
    totalInstallment = installmentCalc.totalInstallment;
    totalDueInstallment = installmentCalc.totalDueInstallment;
    totalDueCash = 0;
  }
  
  return {
    regularUnits,
    fixedAmountTotal,
    grossTuition,
    discountAmount,
    netTuition,
    dynamicFeesTotal,
    labFeeTotal,
    baseTotal,
    totalDueCash,
    downPayment: downPaymentResult,
    netBalance,
    insuranceAmount,
    totalInstallment,
    totalDueInstallment,
  };
}

/**
 * Distribute installment amount equally across 3 installments
 */
export function distributeInstallmentsEqually(totalInstallment: number): {
  prelim: number;
  midterm: number;
  finals: number;
} {
  const perInstallment = totalInstallment / 3;
  const prelim = roundToTwoDecimals(perInstallment);
  const midterm = roundToTwoDecimals(perInstallment);
  // Finals gets the remainder to account for rounding
  const finals = roundToTwoDecimals(totalInstallment - prelim - midterm);
  
  return { prelim, midterm, finals };
}

/**
 * Round to 2 decimal places
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Validate installment schedule
 */
export function validateInstallmentSchedule(
  prelimAmount: number,
  midtermAmount: number,
  finalsAmount: number,
  expectedTotal: number,
  tolerance: number = 0.01
): { valid: boolean; error?: string } {
  const sum = roundToTwoDecimals(prelimAmount + midtermAmount + finalsAmount);
  const difference = Math.abs(sum - expectedTotal);
  
  if (difference > tolerance) {
    return {
      valid: false,
      error: `Installment amounts must sum to ${formatCurrency(expectedTotal)}. Current sum: ${formatCurrency(sum)}`,
    };
  }
  
  return { valid: true };
}

// Note: Down payment validation is handled by Payment Module, not Assessment Module

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

