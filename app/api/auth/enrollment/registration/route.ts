import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentNumber = searchParams.get("studentNumber");
    const academicYear = searchParams.get("academicYear");
    const semesterParam = searchParams.get("semester");

    if (!studentNumber || !academicYear || !semesterParam) {
      return NextResponse.json(
        { error: "Missing required parameters: studentNumber, academicYear, semester" },
        { status: 400 }
      );
    }

    // Convert semester to number
    const semester = semesterParam === 'first' ? 1 : semesterParam === 'second' ? 2 : parseInt(semesterParam);

    // Get student enrollment info
    const enrollment = await prisma.enrollment.findFirst({
      where: { student_number: studentNumber },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Get program info
    let programCode = '';
    let programName = '';
    if (enrollment.course_program) {
      const programId = parseInt(enrollment.course_program);
      if (!isNaN(programId)) {
        const program = await prisma.program.findUnique({
          where: { id: programId },
          select: { code: true, name: true },
        });
        if (program) {
          programCode = program.code || '';
          programName = program.name || '';
        }
      }
    }

    // Get student assessment
    const assessment = await prisma.student_assessment.findFirst({
      where: {
        student_number: studentNumber,
        academic_year: academicYear,
        semester: semester,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found for this student" },
        { status: 404 }
      );
    }

    // Get enrolled subjects
    const enrolledSubjects = await prisma.$queryRaw<any[]>`
      SELECT 
        es.*,
        cc.course_code,
        cc.descriptive_title,
        cc.units_lec,
        cc.units_lab,
        cc.units_total,
        cc."fixedAmount" AS fixed_amount
      FROM enrolled_subjects es
      LEFT JOIN curriculum_course cc ON es.curriculum_course_id = cc.id
      WHERE es.student_number = ${studentNumber}
        AND es.academic_year = ${academicYear}
        AND es.semester = ${semester}
      ORDER BY cc.course_code
    `;

    // Get assessment fees breakdown
    const assessmentFees = await prisma.assessment_fee.findMany({
      where: { assessment_id: assessment.id },
    });

    // Calculate fee breakdown
    const labFee = assessmentFees.find(f => f.fee_category.toUpperCase() === 'LAB')?.amount || 0;

    // Calculate lab fee from enrolled subjects: sum of units_lab × 1000
    // Exclude subjects that have a fixed amount (e.g. NSTP, PE) — those are billed separately
    const totalLabUnits = enrolledSubjects
      .filter((s: any) => !s.fixed_amount || Number(s.fixed_amount) === 0)
      .reduce((sum: number, s: any) => sum + (Number(s.units_lab) || 0), 0);
    const computedLabFee = totalLabUnits * 1000;
    const finalLabFee = computedLabFee > 0 ? computedLabFee : Number(labFee);

    // Collect all miscellaneous fees (category = 'miscellaneous') and sum them
    const miscFeeItems = assessmentFees
      .filter(f => f.fee_category.toLowerCase() === 'miscellaneous')
      .map(f => ({ name: f.fee_name, amount: Number(f.amount) }));
    const miscFee = miscFeeItems.reduce((sum, f) => sum + f.amount, 0);

    // Build fixed-amount fee items from enrolled subjects (e.g. NSTP, PE)
    const fixedFeeItems = enrolledSubjects
      .filter((s: any) => s.fixed_amount !== null && s.fixed_amount !== undefined && Number(s.fixed_amount) > 0)
      .map((s: any) => ({ name: s.course_code || '', amount: Number(s.fixed_amount) }));
    const fixedAmountTotal = Number(assessment.fixed_amount_total) || fixedFeeItems.reduce((sum, f) => sum + f.amount, 0);

    // Get payment schedule
    const paymentSchedules = await prisma.payment_schedule.findMany({
      where: { assessment_id: assessment.id },
      orderBy: { due_date: 'asc' },
    });

    // Format payment schedule
    const paymentSchedule = paymentSchedules.map(p => ({
      term: p.label || '',
      date: p.due_date ? new Date(p.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      amount: Number(p.amount) || 0,
    }));

    // Calculate tuition fee per unit
    const totalUnits = enrolledSubjects.reduce((sum: number, s: any) => sum + (Number(s.units_total) || 0), 0);
    const tuitionFeePerUnit = totalUnits > 0 ? Number(assessment.gross_tuition) / totalUnits : 0;

    // Build response data
    const registrationData = {
      studentName: `${enrollment.family_name || ''}, ${enrollment.first_name || ''} ${enrollment.middle_name || ''}`.trim(),
      studentNumber: enrollment.student_number || '',
      programCode: programCode,
      programName: programName,
      academicYear: academicYear,
      semester: semesterParam === 'first' ? '1st' : semesterParam === 'second' ? '2nd' : semesterParam,
      enrolledSubjects: enrolledSubjects.map(s => ({
        course_code: s.course_code || '',
        descriptive_title: s.descriptive_title || '',
        units_lec: Number(s.units_lec) || 0,
        units_lab: Number(s.units_lab) || 0,
        units_total: Number(s.units_total) || 0,
      })),
      tuitionFeePerUnit: Math.round(tuitionFeePerUnit * 100) / 100,
      cashBasis: {
        tuition: Number(assessment.gross_tuition) || 0,
        discount: Number(assessment.discount_amount) || 0,
        netTuition: Number(assessment.net_tuition) || 0,
        lab: finalLabFee,
        misc: Number(miscFee),
        miscFeeItems: miscFeeItems,
        fixedAmountTotal: fixedAmountTotal,
        fixedFeeItems: fixedFeeItems,
        totalFees: Number(assessment.total_due_cash) || Number(assessment.total_due) || 0,
      },
      installmentBasis: {
        totalFees: Number(assessment.total_due) || 0,
        downPayment: Number(assessment.down_payment) || 0,
        net: Number(assessment.total_due) - Number(assessment.down_payment) || 0,
        fivePercent: (Number(assessment.total_due) - Number(assessment.down_payment)) * 0.05 || 0,
        totalInstallment: Number(assessment.total_due_installment) || 0,
      },
      paymentSchedule,
    };

    return NextResponse.json(
      { success: true, data: registrationData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch registration data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
