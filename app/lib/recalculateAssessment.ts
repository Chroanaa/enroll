import { prisma } from "./prisma";
import {
  calculateAssessment,
  distributeInstallmentsEqually,
} from "../utils/assessmentCalculations";

type TxLike = typeof prisma | any;

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDueDateMap(paymentSchedules: any[]): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const schedule of paymentSchedules || []) {
    const label = String(schedule.label || "").trim().toLowerCase();
    if (!label) continue;
    const date = schedule.due_date ? new Date(schedule.due_date) : null;
    if (date && !Number.isNaN(date.getTime())) {
      map.set(label, date);
    }
  }
  return map;
}

function getPaidStatusMap(paymentSchedules: any[]): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const schedule of paymentSchedules || []) {
    const label = String(schedule.label || "").trim().toLowerCase();
    if (!label) continue;
    map.set(label, Boolean(schedule.is_paid));
  }
  return map;
}

export async function recalculateAssessmentForTerm(
  tx: TxLike,
  studentNumber: string,
  academicYear: string,
  semester: number,
) {
  const assessment = await tx.student_assessment.findUnique({
    where: {
      student_number_academic_year_semester: {
        student_number: studentNumber,
        academic_year: academicYear,
        semester,
      },
    },
    include: {
      fees: true,
      payment_schedules: true,
    },
  });

  if (!assessment) {
    return;
  }

  const enrolledSubjects = await tx.$queryRaw<any[]>`
    SELECT
      es.curriculum_course_id,
      es.subject_id,
      es.units_total,
      COALESCE(cc.units_lec, s.units_lec, 0) AS units_lec,
      COALESCE(cc.units_lab, s.units_lab, 0) AS units_lab,
      COALESCE(cc."fixedAmount", s."fixedAmount", 0) AS fixed_amount
    FROM enrolled_subjects es
    LEFT JOIN curriculum_course cc ON cc.id = es.curriculum_course_id
    LEFT JOIN subject s ON s.id = es.subject_id
    WHERE es.student_number = ${studentNumber}
      AND es.academic_year = ${academicYear}
      AND es.semester = ${semester}
  `;

  const curriculumRateRows = await tx.$queryRaw<any[]>`
    SELECT CAST(c.tuition_fee_per_unit AS FLOAT) AS rate
    FROM enrolled_subjects es
    INNER JOIN curriculum_course cc ON cc.id = es.curriculum_course_id
    INNER JOIN curriculum c ON c.id = cc.curriculum_id
    WHERE es.student_number = ${studentNumber}
      AND es.academic_year = ${academicYear}
      AND es.semester = ${semester}
      AND c.tuition_fee_per_unit IS NOT NULL
    ORDER BY es.id ASC
    LIMIT 1
  `;

  const fallbackTuitionPerUnit =
    toNumber(assessment.gross_tuition) > 0
      ? toNumber(assessment.gross_tuition) /
        Math.max(
          1,
          enrolledSubjects.reduce(
            (sum, subject) =>
              sum +
              (toNumber(subject.fixed_amount) > 0
                ? 0
                : toNumber(subject.units_lec, toNumber(subject.units_total))),
            0,
          ),
        )
      : 0;

  const tuitionPerUnit =
    curriculumRateRows.length > 0
      ? toNumber(curriculumRateRows[0].rate, fallbackTuitionPerUnit)
      : fallbackTuitionPerUnit;

  const dynamicFees = (assessment.fees || []).reduce(
    (acc: Record<number, number>, fee: any) => {
      acc[fee.id] = toNumber(fee.amount);
      return acc;
    },
    {},
  );

  const installmentSetting = await tx.settings.findUnique({
    where: { key: "installment_charge_percentage" },
    select: { value: true },
  });

  const inferredInstallmentPercentage = (() => {
    const settingPercent = toNumber(installmentSetting?.value, 5);
    if (String(assessment.payment_mode).toLowerCase() !== "installment") {
      return settingPercent;
    }
    const downPayment = toNumber(assessment.down_payment);
    const baseTotal = toNumber(assessment.base_total);
    const insuranceAmount = toNumber(assessment.insurance_amount);
    const netBalance = baseTotal - downPayment;
    if (netBalance <= 0) {
      return settingPercent;
    }
    const inferred = (insuranceAmount / netBalance) * 100;
    return Number.isFinite(inferred) && inferred >= 0 ? inferred : settingPercent;
  })();

  const calculated = calculateAssessment({
    enrolledSubjects: enrolledSubjects.map((subject) => ({
      units_total: toNumber(subject.units_total),
      units_lec: toNumber(subject.units_lec),
      units_lab: toNumber(subject.units_lab),
      fixedAmount: toNumber(subject.fixed_amount),
    })),
    tuitionPerUnit,
    discountPercentage: toNumber(assessment.discount_percent),
    dynamicFees,
    paymentMode:
      String(assessment.payment_mode).toLowerCase() === "installment"
        ? "installment"
        : "cash",
    downPayment: toNumber(assessment.down_payment),
    installmentChargePercentage: inferredInstallmentPercentage,
  });

  const paymentMode =
    String(assessment.payment_mode).toLowerCase() === "installment"
      ? "installment"
      : "cash";

  const totalDue =
    paymentMode === "installment"
      ? toNumber(calculated.totalDueInstallment)
      : toNumber(calculated.totalDueCash);

  await tx.student_assessment.update({
    where: { id: assessment.id },
    data: {
      gross_tuition: calculated.grossTuition,
      discount_amount: calculated.discountAmount,
      net_tuition: calculated.netTuition,
      total_fees: calculated.dynamicFeesTotal,
      fixed_amount_total: calculated.fixedAmountTotal,
      base_total: calculated.baseTotal,
      down_payment:
        paymentMode === "installment" ? toNumber(calculated.downPayment) : null,
      insurance_amount:
        paymentMode === "installment"
          ? toNumber(calculated.insuranceAmount)
          : null,
      total_due_cash:
        paymentMode === "cash" ? toNumber(calculated.totalDueCash) : null,
      total_due_installment:
        paymentMode === "installment"
          ? toNumber(calculated.totalDueInstallment)
          : null,
      total_due: totalDue,
      updated_at: new Date(),
    },
  });

  if (paymentMode !== "installment") {
    await tx.payment_schedule.deleteMany({
      where: { assessment_id: assessment.id },
    });
    return;
  }

  const dueDateMap = getDueDateMap(assessment.payment_schedules || []);
  const paidStatusMap = getPaidStatusMap(assessment.payment_schedules || []);
  const today = startOfToday();
  const distributed = distributeInstallmentsEqually(
    toNumber(calculated.totalInstallment),
  );

  await tx.payment_schedule.deleteMany({
    where: { assessment_id: assessment.id },
  });

  await tx.payment_schedule.createMany({
    data: [
      {
        assessment_id: assessment.id,
        label: "Prelim",
        due_date: dueDateMap.get("prelim") || today,
        amount: distributed.prelim,
        is_paid: paidStatusMap.get("prelim") || false,
      },
      {
        assessment_id: assessment.id,
        label: "Midterm",
        due_date: dueDateMap.get("midterm") || today,
        amount: distributed.midterm,
        is_paid: paidStatusMap.get("midterm") || false,
      },
      {
        assessment_id: assessment.id,
        label: "Finals",
        due_date: dueDateMap.get("finals") || today,
        amount: distributed.finals,
        is_paid: paidStatusMap.get("finals") || false,
      },
    ],
  });
}
