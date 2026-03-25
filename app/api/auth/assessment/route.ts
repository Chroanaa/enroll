import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope, isRoleAllowed, type SessionScope } from "@/app/lib/accessScope";
import { ROLES } from "@/app/lib/rbac";

const ASSESSMENT_ALLOWED_ROLES = [ROLES.ADMIN, ROLES.CASHIER, ROLES.DEAN];

/**
 * Convert semester value to integer (1 or 2)
 * Accepts: "First", "Second", "first", "second", 1, 2, or string "1", "2"
 */
function convertSemesterToInt(semester: string | number): number {
  if (typeof semester === "number") {
    if (semester === 1 || semester === 2) {
      return semester;
    }
    throw new Error("Semester must be 1 or 2");
  }

  const semesterStr = String(semester).trim();
  
  if (semesterStr === "First" || semesterStr.toLowerCase() === "first") {
    return 1;
  }
  if (semesterStr === "Second" || semesterStr.toLowerCase() === "second") {
    return 2;
  }
  
  // Try parsing as integer
  const parsed = parseInt(semesterStr);
  if (!isNaN(parsed) && (parsed === 1 || parsed === 2)) {
    return parsed;
  }
  
  throw new Error("Invalid semester. Must be 'First', 'Second', 1, or 2");
}

function getSemesterTermVariants(semesterNum: number): string[] {
  if (semesterNum === 1) {
    return ["First Semester", "1st Semester", "first", "1"];
  }
  if (semesterNum === 2) {
    return ["Second Semester", "2nd Semester", "second", "2"];
  }
  return [];
}

async function ensureAssessmentStudentAccess(
  studentNumber: string,
  scope: SessionScope,
) {
  if (!scope.isDean) {
    return null;
  }

  if (!scope.deanDepartmentId) {
    return NextResponse.json(
      { error: "Dean account is not linked to a department." },
      { status: 403 },
    );
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { student_number: studentNumber },
    select: { department: true },
    orderBy: { admission_date: "desc" },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (enrollment.department !== scope.deanDepartmentId) {
    return NextResponse.json(
      { error: "Forbidden. Student is outside your department scope." },
      { status: 403 },
    );
  }

  return null;
}

// GET - Fetch assessment for a student and term
export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, ASSESSMENT_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentNumber = searchParams.get("studentNumber");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!studentNumber || !academicYear || !semester) {
      return NextResponse.json(
        { error: "Missing required parameters: studentNumber, academicYear, semester" },
        { status: 400 }
      );
    }

    const unauthorized = await ensureAssessmentStudentAccess(studentNumber, scope);
    if (unauthorized) return unauthorized;

    // Convert semester string ("First" or "Second") to integer (1 or 2)
    let semesterNum: number;
    try {
      semesterNum = convertSemesterToInt(semester);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Invalid semester value" },
        { status: 400 }
      );
    }

    const assessment = await prisma.student_assessment.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: semesterNum,
        },
      },
      include: {
        discount: true,
        fees: true,
        payment_schedules: {
          orderBy: {
            due_date: "asc",
          },
        },
        // Payments are handled by Payment Module - not included in assessment response
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Assessment API only returns assessment data
    // Payment balances should be calculated by payment module
    return NextResponse.json(assessment);
  } catch (error: any) {
    console.error("Error fetching assessment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch assessment",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}

// POST - Create or update assessment
export async function POST(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, ASSESSMENT_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      studentNumber,
      academicYear,
      semester,
      // Financial fields
      grossTuition,
      discountId,
      discountPercent,
      discountAmount,
      netTuition,
      totalFees,
      fixedAmountTotal,
      baseTotal,
      // Payment mode fields
      paymentMode,
      downPayment,
      insuranceAmount,
      totalDueCash,
      totalDueInstallment,
      totalDue,
      // Related data
      fees, // Array of { feeId, feeName, feeCategory, amount }
      paymentSchedule, // Array of { label, dueDate, amount } for installment mode
      // Status
      mode, // 'draft' | 'finalize'
      userId, // For audit trail
      academicStatus, // 'regular' | 'irregular'
    } = body;

    // Validation
    if (!studentNumber || !academicYear || semester === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: studentNumber, academicYear, semester" },
        { status: 400 }
      );
    }

    const unauthorized = await ensureAssessmentStudentAccess(studentNumber, scope);
    if (unauthorized) return unauthorized;

    // Convert semester to integer (1 or 2)
    let semesterNum: number;
    try {
      semesterNum = convertSemesterToInt(semester);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Invalid semester value" },
        { status: 400 }
      );
    }

    if (!paymentMode || !['cash', 'installment'].includes(paymentMode)) {
      return NextResponse.json(
        { error: "Invalid or missing payment_mode. Must be 'cash' or 'installment'" },
        { status: 400 }
      );
    }

    if (
      grossTuition === undefined ||
      netTuition === undefined ||
      totalFees === undefined ||
      baseTotal === undefined ||
      totalDue === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required financial fields" },
        { status: 400 }
      );
    }

    let normalizedAcademicStatus: "regular" | "irregular" | null = null;
    if (academicStatus !== undefined && academicStatus !== null && String(academicStatus).trim() !== "") {
      const status = String(academicStatus).trim().toLowerCase();
      if (status !== "regular" && status !== "irregular") {
        return NextResponse.json(
          { error: "Invalid academicStatus. Must be 'regular' or 'irregular'" },
          { status: 400 }
        );
      }
      normalizedAcademicStatus = status as "regular" | "irregular";
    }

    // Validate payment mode specific fields
    if (paymentMode === 'installment') {
      // Note: Down payment validation is handled by Payment Module
      if (!paymentSchedule || paymentSchedule.length !== 3) {
        return NextResponse.json(
          { error: "Payment schedule must have exactly 3 installments" },
          { status: 400 }
        );
      }
      // Validate installment amounts sum to the scheduled installment portion only.
      // Down payment is collected separately and should not be included in the 3-term schedule.
      const scheduleSum = paymentSchedule.reduce(
        (sum: number, s: any) => sum + parseFloat(s.amount || 0),
        0
      );
      const expectedTotal = totalDueInstallment !== undefined && totalDueInstallment !== null
        ? parseFloat(totalDueInstallment) - parseFloat(downPayment || 0)
        : parseFloat(totalDue) - parseFloat(downPayment || 0);
      if (Math.abs(scheduleSum - expectedTotal) > 0.01) {
        return NextResponse.json(
          { error: `Installment amounts must sum to ${expectedTotal}. Current sum: ${scheduleSum}` },
          { status: 400 }
        );
      }
    }

    if (mode === "finalize") {
      const pendingOverloadCount = await prisma.enrolled_subjects.count({
        where: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: semesterNum,
          status: "pending_approval",
        },
      });

      if (pendingOverloadCount > 0) {
        return NextResponse.json(
          {
            error:
              "This assessment cannot be finalized because the enrolled subjects are still pending overload approval.",
          },
          { status: 409 },
        );
      }
    }

    // Use transaction to ensure data integrity
    // Add timeout to prevent P2028 errors (default is 5 seconds, increase to 10 seconds)
    let isUpdate = false;
    const result = await prisma.$transaction(async (tx) => {
      // Check if assessment already exists (using unique constraint)
      // This will find ANY assessment with this combination, including cancelled ones
      const existing = await tx.student_assessment.findUnique({
        where: {
          student_number_academic_year_semester: {
            student_number: studentNumber,
            academic_year: academicYear,
            semester: semesterNum,
          },
        },
      });

      let assessment;
      const saveMode = mode || 'draft';
      const assessmentStatus = saveMode === 'finalize' ? 'finalized' : 'draft';

      if (existing) {
        isUpdate = true;
        
        // Calculate next version if reassessing (finalized -> draft)
        const existingStatus = (existing as any).status || 'draft';
        const existingVersion = (existing as any).version || 1;
        const nextVersion = existingStatus === 'finalized' && saveMode === 'draft'
          ? existingVersion + 1
          : existingVersion;

        // Update existing assessment (respects unique constraint)
        // This handles all cases: draft updates, finalized updates, cancelled reactivation
        assessment = await tx.student_assessment.update({
          where: { id: existing.id },
          data: {
            gross_tuition: parseFloat(grossTuition),
            discount_id: discountId || null,
            discount_percent: discountPercent ? parseFloat(discountPercent) : null,
            discount_amount: discountAmount ? parseFloat(discountAmount) : null,
            net_tuition: parseFloat(netTuition),
            total_fees: parseFloat(totalFees),
            fixed_amount_total: fixedAmountTotal ? parseFloat(fixedAmountTotal) : 0,
            base_total: parseFloat(baseTotal),
            payment_mode: paymentMode,
            down_payment:
              paymentMode === 'installment' && downPayment !== undefined && downPayment !== null
                ? parseFloat(downPayment)
                : null,
            insurance_amount: paymentMode === 'installment' && insuranceAmount !== undefined ? parseFloat(insuranceAmount) : null,
            total_due_cash: paymentMode === 'cash' ? parseFloat(totalDueCash || totalDue) : null,
            total_due_installment: paymentMode === 'installment' ? parseFloat(totalDueInstallment || totalDue) : null,
            total_due: parseFloat(totalDue),
            status: assessmentStatus,
            version: nextVersion,
            finalized_at: saveMode === 'finalize' ? new Date() : (existingStatus === 'finalized' && saveMode === 'draft' ? null : (existing as any).finalized_at),
          },
        });
      } else {
        // No assessment exists, create new one
        assessment = await tx.student_assessment.create({
          data: {
            student_number: studentNumber,
            academic_year: academicYear,
            semester: semesterNum,
            gross_tuition: parseFloat(grossTuition),
            discount_id: discountId || null,
            discount_percent: discountPercent ? parseFloat(discountPercent) : null,
            discount_amount: discountAmount ? parseFloat(discountAmount) : null,
            net_tuition: parseFloat(netTuition),
            total_fees: parseFloat(totalFees),
            fixed_amount_total: fixedAmountTotal ? parseFloat(fixedAmountTotal) : 0,
            base_total: parseFloat(baseTotal),
            payment_mode: paymentMode,
            down_payment:
              paymentMode === 'installment' && downPayment !== undefined && downPayment !== null
                ? parseFloat(downPayment)
                : null,
            insurance_amount: paymentMode === 'installment' && insuranceAmount !== undefined ? parseFloat(insuranceAmount) : null,
            total_due_cash: paymentMode === 'cash' ? parseFloat(totalDueCash || totalDue) : null,
            total_due_installment: paymentMode === 'installment' ? parseFloat(totalDueInstallment || totalDue) : null,
            total_due: parseFloat(totalDue),
            status: assessmentStatus,
            version: 1,
            finalized_at: saveMode === 'finalize' ? new Date() : null,
          },
        });
      }

      // Delete existing fee snapshots
      await tx.assessment_fee.deleteMany({
        where: { assessment_id: assessment.id },
      });

      // Create fee snapshots
      if (fees && Array.isArray(fees) && fees.length > 0) {
        await tx.assessment_fee.createMany({
          data: fees.map((fee: any) => ({
            assessment_id: assessment.id,
            fee_id: fee.feeId || null,
            fee_name: fee.feeName,
            fee_category: fee.feeCategory,
            amount: parseFloat(fee.amount),
          })),
        });
      }

      // Handle Payment Schedule (only for installment mode)
      if (paymentMode === 'installment') {
        // Delete existing payment schedule
        await tx.payment_schedule.deleteMany({
          where: { assessment_id: assessment.id },
        });

        // Create payment schedule
        if (paymentSchedule && paymentSchedule.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Set to start of day

          await tx.payment_schedule.createMany({
            data: paymentSchedule.map((schedule: any) => {
              let dueDate: Date;
              
              // Validate and parse the date
              if (schedule.dueDate && schedule.dueDate !== '' && schedule.dueDate !== 'Invalid Date') {
                const parsedDate = new Date(schedule.dueDate);
                if (!isNaN(parsedDate.getTime())) {
                  dueDate = parsedDate;
                } else {
                  // Invalid date string, use today
                  dueDate = new Date(today);
                }
              } else {
                // No date provided, use today
                dueDate = new Date(today);
              }

              return {
                assessment_id: assessment.id,
                label: schedule.label,
                due_date: dueDate,
                amount: parseFloat(schedule.amount),
                is_paid: false,
              };
            }),
          });
        }
      } else {
        // Delete payment schedule if switching from installment to cash
        await tx.payment_schedule.deleteMany({
          where: { assessment_id: assessment.id },
        });
      }

      // Keep enrollment academic status in sync with assessment selection
      if (normalizedAcademicStatus) {
        const termVariants = getSemesterTermVariants(semesterNum);
        const enrollmentUpdate = await tx.enrollment.updateMany({
          where: {
            student_number: studentNumber,
            academic_year: academicYear,
            term: {
              in: termVariants,
            },
          },
          data: {
            academic_status: normalizedAcademicStatus,
          },
        });

        // Fallback: if term-specific row is missing, update latest enrollment row for this student
        if (enrollmentUpdate.count === 0) {
          const latestEnrollment = await tx.enrollment.findFirst({
            where: { student_number: studentNumber },
            orderBy: { admission_date: "desc" },
            select: { id: true },
          });

          if (latestEnrollment) {
            await tx.enrollment.update({
              where: { id: latestEnrollment.id },
              data: { academic_status: normalizedAcademicStatus },
            });
          }
        }
      }

      // Create audit trail entry
      if (userId) {
        try {
          await tx.assessment_audit.create({
            data: {
              assessment_id: assessment.id,
              action: isUpdate ? 'updated' : 'created',
              changed_fields: JSON.stringify(Object.keys(body)),
              previous_values: existing ? JSON.stringify(existing) : null,
              new_values: JSON.stringify(body),
              user_id: userId,
            },
          });
        } catch (auditError) {
          // Log but don't fail the transaction if audit fails
          console.error("Error creating audit trail:", auditError);
        }
      }

      // Fetch complete assessment with relations
      // Note: Payments are handled by Payment Module, not included here
      return await tx.student_assessment.findUnique({
        where: { id: assessment.id },
        include: {
          discount: true,
          fees: true,
          payment_schedules: {
            orderBy: {
              due_date: "asc",
            },
          },
          // Payments excluded - use Payment Module API to get payment data
        },
      });
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
      timeout: 15000, // Maximum time the transaction can run (15 seconds)
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: isUpdate ? 'Assessment updated successfully' : 'Assessment created successfully',
    }, { status: isUpdate ? 200 : 201 });
  } catch (error: any) {
    console.error("Error saving assessment:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to save assessment",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}
