import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Helper function to convert semester string to integer
function convertSemesterToInt(semester: string | number): number {
  if (typeof semester === "number") return semester;
  const semesterStr = semester.toLowerCase();
  if (semesterStr === "first" || semesterStr === "1st") return 1;
  if (semesterStr === "second" || semesterStr === "2nd") return 2;
  return parseInt(semester) || 1;
}

// Helper to build program display string
function buildProgramDisplay(
  courseProgram: string | null | undefined,
  majorId: number | null | undefined,
  programMap: Map<number, { id: number; code: string; name: string }>,
  majors: { id: number; name: string; program_id: number }[],
): string | null {
  if (!courseProgram) return null;
  const programId = parseInt(courseProgram);
  if (isNaN(programId)) return null;
  const program = programMap.get(programId);
  if (!program) return null;
  if (majorId) {
    const major = majors.find((m) => m.id === majorId);
    return major ? `${program.code} - ${major.name}` : program.code;
  }
  return program.code;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status"); // payment status: 'Unpaid', 'Partial', 'Fully Paid'
    const programIdFilter = searchParams.get("programId"); // filter by program
    const yearLevelFilter = searchParams.get("yearLevel"); // filter by year level
    const assessmentStatusFilter = searchParams.get("assessmentStatus"); // 'Assessed' | 'Not Assessed' | ''
    const includeNotAssessed = searchParams.get("includeNotAssessed") === "true";

    if (!academicYear || !semester) {
      return NextResponse.json(
        { error: "Academic year and semester are required" },
        { status: 400 },
      );
    }

    const semesterInt = convertSemesterToInt(semester);

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Build enrollment filter (program / year / search)
    // and fetch all matching enrolled students
    // ─────────────────────────────────────────────────────────────
    const enrollmentWhere: any = {};

    if (programIdFilter) {
      // programIdFilter can be "1" (just programId) or "1-5" (programId-majorId)
      const parts = programIdFilter.split("-");
      const pId = parts[0];
      const mId = parts[1] ? parseInt(parts[1]) : null;
      enrollmentWhere.course_program = pId; // matches the string stored in enrollment.course_program
      if (mId !== null && !isNaN(mId)) {
        enrollmentWhere.major_id = mId;
      }
    }
    if (yearLevelFilter) {
      const yl = parseInt(yearLevelFilter);
      if (!isNaN(yl)) enrollmentWhere.year_level = yl;
    }
    if (search) {
      enrollmentWhere.OR = [
        { student_number: { contains: search, mode: "insensitive" } },
        { first_name: { contains: search, mode: "insensitive" } },
        { family_name: { contains: search, mode: "insensitive" } },
      ];
    }

    const allEnrollments = await prisma.enrollment.findMany({
      where: Object.keys(enrollmentWhere).length > 0 ? enrollmentWhere : undefined,
      select: {
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
        major_id: true,
        year_level: true,
      },
      distinct: ["student_number"],
    });

    // Enrollment map for quick lookup
    const enrollmentMap = new Map(
      allEnrollments
        .filter((e) => e.student_number != null)
        .map((e) => [e.student_number!, e]),
    );

    const allStudentNumbers = allEnrollments
      .map((e) => e.student_number)
      .filter((n): n is string => n != null);

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Fetch programs and majors for all enrolled students
    // ─────────────────────────────────────────────────────────────
    const programIds = [
      ...new Set(
        allEnrollments
          .map((e) => e.course_program)
          .filter((p) => p != null && p !== "")
          .map((p) => parseInt(p!))
          .filter((p) => !isNaN(p)),
      ),
    ];

    const [programs, majors] = await Promise.all([
      prisma.program.findMany({
        where: { id: { in: programIds } },
        select: { id: true, code: true, name: true },
      }),
      prisma.major.findMany({
        where: { program_id: { in: programIds } },
        select: { id: true, name: true, program_id: true },
      }),
    ]);

    const programMap = new Map(programs.map((p) => [p.id, p]));

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Fetch assessments for the term
    // If filters are applied, restrict to matching enrolled students
    // ─────────────────────────────────────────────────────────────
    const assessmentWhere: any = {
      academic_year: academicYear,
      semester: semesterInt,
    };

    // When program/year/search filters exist, only fetch assessments for those students
    if (programIdFilter || yearLevelFilter || search) {
      assessmentWhere.student_number = { in: allStudentNumbers };
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
          select: { amount_paid: true },
        },
      },
      orderBy: { student_number: "asc" },
    });

    // Set of student numbers that have assessments this term
    const assessedNumbers = new Set(assessments.map((a) => a.student_number));

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Build assessed summaries
    // (only include students who still have enrollment records)
    // ─────────────────────────────────────────────────────────────
    const assessedSummaries = assessments
      .filter((a) => enrollmentMap.has(a.student_number))
      .map((assessment) => {
        const enrollment = enrollmentMap.get(assessment.student_number)!;

        const studentName = [
          enrollment.first_name,
          enrollment.middle_name,
          enrollment.family_name,
        ]
          .filter(Boolean)
          .join(" ") || assessment.student_number;

        const programDisplay = buildProgramDisplay(
          enrollment.course_program,
          enrollment.major_id,
          programMap,
          majors,
        );

        let totalDue = Number(assessment.total_due) || 0;
        if (assessment.payment_mode === "cash" && assessment.total_due_cash) {
          totalDue = Number(assessment.total_due_cash);
        } else if (
          assessment.payment_mode === "installment" &&
          assessment.total_due_installment
        ) {
          totalDue = Number(assessment.total_due_installment);
        }

        const totalPaid = assessment.payments.reduce(
          (sum, p) => sum + Number(p.amount_paid),
          0,
        );
        const remainingBalance = Math.max(0, totalDue - totalPaid);

        let paymentStatus: "Unpaid" | "Partial" | "Fully Paid" = "Unpaid";
        if (totalPaid >= totalDue && totalDue > 0) {
          paymentStatus = "Fully Paid";
        } else if (totalPaid > 0) {
          paymentStatus = "Partial";
        }

        return {
          assessment_id: assessment.id,
          student_number: assessment.student_number,
          student_name: studentName,
          first_name: enrollment.first_name,
          middle_name: enrollment.middle_name,
          family_name: enrollment.family_name,
          course_program: programDisplay,
          year_level: enrollment.year_level ?? null,
          academic_year: assessment.academic_year,
          semester: assessment.semester,
          payment_mode: assessment.payment_mode,
          total_due: totalDue,
          total_paid: totalPaid,
          remaining_balance: remainingBalance,
          payment_status: paymentStatus,
          has_assessment: true,
        };
      });

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Build not-assessed summaries
    // Only when includeNotAssessed=true is requested
    // ─────────────────────────────────────────────────────────────
    const notAssessedSummaries: any[] = [];

    if (includeNotAssessed) {
      // If no program/year/search filter, we need to know which students
      // exist in enrollment but NOT in student_assessment for this term
      let enrollmentsToCheck = allEnrollments;

      // When there are NO filters (no program, year, search), we need to fetch
      // ALL enrollment records to find not-assessed students
      if (!programIdFilter && !yearLevelFilter && !search) {
        // allEnrollments already has no filters, so use it as-is
        enrollmentsToCheck = allEnrollments;
        // But allEnrollments was fetched with no where clause, so it has ALL students
      }

      for (const enrollment of enrollmentsToCheck) {
        if (!enrollment.student_number) continue;
        if (assessedNumbers.has(enrollment.student_number)) continue;

        const studentName = [
          enrollment.first_name,
          enrollment.middle_name,
          enrollment.family_name,
        ]
          .filter(Boolean)
          .join(" ") || enrollment.student_number;

        const programDisplay = buildProgramDisplay(
          enrollment.course_program,
          enrollment.major_id,
          programMap,
          majors,
        );

        notAssessedSummaries.push({
          assessment_id: null,
          student_number: enrollment.student_number,
          student_name: studentName,
          first_name: enrollment.first_name,
          middle_name: enrollment.middle_name,
          family_name: enrollment.family_name,
          course_program: programDisplay,
          year_level: enrollment.year_level ?? null,
          academic_year: academicYear,
          semester: semesterInt,
          payment_mode: null,
          total_due: 0,
          total_paid: 0,
          remaining_balance: 0,
          payment_status: "Unpaid",
          has_assessment: false,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Combine results and apply filters
    // ─────────────────────────────────────────────────────────────
    let summaries: any[];

    if (assessmentStatusFilter === "assessed") {
      summaries = assessedSummaries;
    } else if (assessmentStatusFilter === "not_assessed") {
      summaries = notAssessedSummaries;
    } else {
      // All — combine assessed + not-assessed (not-assessed only when requested)
      summaries = [...assessedSummaries, ...notAssessedSummaries];
    }

    // Filter by payment status if specified
    if (statusFilter) {
      summaries = summaries.filter((s) => s.payment_status === statusFilter);
    }

    // Sort by student number
    summaries.sort((a, b) =>
      (a.student_number ?? "").localeCompare(b.student_number ?? ""),
    );

    return NextResponse.json({
      success: true,
      data: summaries,
      total: summaries.length,
    });
  } catch (error) {
    console.error("Error fetching assessment summaries:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
