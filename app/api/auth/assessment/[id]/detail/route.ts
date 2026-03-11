import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/auth/assessment/[id]/detail
 *
 * Fetch full detail for a single assessment including:
 * - Assessment summary (tuition, discount, fees breakdown)
 * - Assessment fees (individual fee items)
 * - Enrolled subjects for the student in the same term
 * - Payment history
 * - Payment schedule (installments)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const assessmentId = parseInt(id);
    if (isNaN(assessmentId)) {
      return NextResponse.json(
        { error: "Invalid assessment ID" },
        { status: 400 },
      );
    }

    // Fetch assessment with fees, payments, and schedules
    const assessment = await prisma.student_assessment.findUnique({
      where: { id: assessmentId },
      include: {
        fees: {
          orderBy: { fee_category: "asc" },
        },
        payments: {
          orderBy: { payment_date: "desc" },
        },
        payment_schedules: {
          orderBy: { due_date: "asc" },
        },
        discount: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Fetch student info
    const enrollment = await prisma.enrollment.findFirst({
      where: { student_number: assessment.student_number },
      select: {
        id: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
        year_level: true,
      },
    });

    // Resolve program ID to program code/name
    let resolvedProgram: string | null = enrollment?.course_program || null;
    if (resolvedProgram) {
      const programId = parseInt(resolvedProgram);
      if (!isNaN(programId)) {
        const program = await prisma.program.findUnique({
          where: { id: programId },
          select: { code: true, name: true },
        });
        if (program) {
          resolvedProgram = program.code || program.name;
        }
      }
    }

    // Fetch enrolled subjects for this student in the same term
    const enrolledSubjects = await prisma.enrolled_subjects.findMany({
      where: {
        student_number: assessment.student_number,
        academic_year: assessment.academic_year,
        semester: assessment.semester,
      },
      orderBy: { enrolled_at: "asc" },
    });

    // Get curriculum_course details for each enrolled subject.
    // Also fetch subjects as a fallback for records whose curriculum_course was
    // deleted by a destructive curriculum update.
    const curriculumCourseIds = enrolledSubjects.map(
      (es) => es.curriculum_course_id,
    );
    const subjectIds = enrolledSubjects
      .map((es) => es.subject_id)
      .filter((id): id is number => id != null);

    const [curriculumCourses, fallbackSubjects] = await Promise.all([
      prisma.curriculum_course.findMany({
        where: { id: { in: curriculumCourseIds } },
      }),
      subjectIds.length > 0
        ? prisma.subject.findMany({ where: { id: { in: subjectIds } } })
        : Promise.resolve([]),
    ]);

    const courseMap = new Map(curriculumCourses.map((c) => [c.id, c]));
    const subjectMap = new Map(
      (fallbackSubjects as any[]).map((s) => [s.id, s]),
    );

    // Build subjects array — fall back to subject table when curriculum_course is gone
    const subjects = enrolledSubjects.map((es) => {
      const course = courseMap.get(es.curriculum_course_id);
      const fallback = es.subject_id
        ? subjectMap.get(es.subject_id)
        : undefined;
      return {
        id: es.id,
        curriculum_course_id: es.curriculum_course_id,
        course_code: course?.course_code ?? fallback?.code ?? "N/A",
        descriptive_title: course?.descriptive_title ?? fallback?.name ?? "N/A",
        units_lec: course?.units_lec ?? fallback?.units_lec ?? 0,
        units_lab: course?.units_lab ?? fallback?.units_lab ?? 0,
        units_total: es.units_total || course?.units_total || 0,
        fixed_amount: course?.fixedAmount
          ? Number(course.fixedAmount)
          : fallback?.fixedAmount
            ? Number(fallback.fixedAmount)
            : null,
        year_level: course?.year_level || es.year_level,
        status: es.status,
      };
    });

    // Calculate totals
    const totalDue =
      assessment.payment_mode.toLowerCase() === "installment"
        ? assessment.total_due_installment
          ? Number(assessment.total_due_installment)
          : Number(assessment.total_due)
        : assessment.total_due_cash
          ? Number(assessment.total_due_cash)
          : Number(assessment.total_due);

    const totalPaid = assessment.payments.reduce(
      (sum, p) => sum + Number(p.amount_paid),
      0,
    );

    const remainingBalance = Math.max(0, totalDue - totalPaid);

    let paymentStatus: "Unpaid" | "Partial" | "Fully Paid";
    if (totalPaid === 0) {
      paymentStatus = "Unpaid";
    } else if (totalPaid < totalDue - 0.01) {
      paymentStatus = "Partial";
    } else {
      paymentStatus = "Fully Paid";
    }

    const r = (v: number) => Math.round(v * 100) / 100;

    const studentName = enrollment
      ? `${enrollment.family_name || ""}, ${enrollment.first_name || ""} ${enrollment.middle_name || ""}`.trim()
      : assessment.student_number;

    // Group fees by category
    const feesByCategory: Record<
      string,
      { fee_name: string; amount: number }[]
    > = {};
    for (const fee of assessment.fees) {
      const cat = fee.fee_category || "Other";
      if (!feesByCategory[cat]) feesByCategory[cat] = [];
      feesByCategory[cat].push({
        fee_name: fee.fee_name,
        amount: Number(fee.amount),
      });
    }

    const response = {
      success: true,
      data: {
        assessment_id: assessment.id,
        student_number: assessment.student_number,
        student_name: studentName,
        course_program: resolvedProgram,
        year_level: enrollment?.year_level || null,
        academic_year: assessment.academic_year,
        semester: assessment.semester,
        payment_mode: assessment.payment_mode,
        status: assessment.status,
        created_at: assessment.created_at.toISOString(),
        finalized_at: assessment.finalized_at?.toISOString() || null,

        // Tuition breakdown
        tuition: {
          gross_tuition: r(Number(assessment.gross_tuition)),
          discount_name: assessment.discount?.name || null,
          discount_percent: assessment.discount_percent
            ? r(Number(assessment.discount_percent))
            : null,
          discount_amount: assessment.discount_amount
            ? r(Number(assessment.discount_amount))
            : 0,
          net_tuition: r(Number(assessment.net_tuition)),
        },

        // Fee breakdown by category
        fees: feesByCategory,
        total_fees: r(Number(assessment.total_fees)),
        fixed_amount_total: r(Number(assessment.fixed_amount_total || 0)),
        base_total: r(Number(assessment.base_total)),
        insurance_amount: assessment.insurance_amount
          ? r(Number(assessment.insurance_amount))
          : null,
        down_payment: assessment.down_payment
          ? r(Number(assessment.down_payment))
          : null,
        total_due_cash: assessment.total_due_cash
          ? r(Number(assessment.total_due_cash))
          : null,
        total_due_installment: assessment.total_due_installment
          ? r(Number(assessment.total_due_installment))
          : null,
        total_due: r(totalDue),

        // Enrolled subjects
        subjects,
        total_units: subjects.reduce((sum, s) => sum + s.units_total, 0),

        // Payment schedule (installments)
        payment_schedule: assessment.payment_schedules.map((ps) => ({
          id: ps.id,
          label: ps.label,
          due_date: ps.due_date.toISOString(),
          amount: r(Number(ps.amount)),
          is_paid: ps.is_paid,
        })),

        // Payment history
        payments: assessment.payments.map((p) => ({
          id: p.id,
          amount_paid: r(Number(p.amount_paid)),
          payment_type: p.payment_type,
          payment_date: p.payment_date.toISOString(),
          reference_no: p.reference_no,
        })),

        // Summary
        total_paid: r(totalPaid),
        remaining_balance: r(remainingBalance),
        payment_status: paymentStatus,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching assessment detail:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Failed to fetch assessment detail",
      },
      { status: 500 },
    );
  }
}
