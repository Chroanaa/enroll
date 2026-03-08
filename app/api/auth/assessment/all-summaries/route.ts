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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status"); // 'Unpaid', 'Partial', 'Fully Paid', or null for all

    if (!academicYear || !semester) {
      return NextResponse.json(
        { error: "Academic year and semester are required" },
        { status: 400 },
      );
    }

    const semesterInt = convertSemesterToInt(semester);

    // Build where clause for assessments
    const whereClause: any = {
      academic_year: academicYear,
      semester: semesterInt,
    };

    // Search by student number
    if (search) {
      whereClause.student_number = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Fetch assessments with payments for the term
    const assessments = await prisma.student_assessment.findMany({
      where: whereClause,
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
          },
        },
      },
      orderBy: {
        student_number: "asc",
      },
    });

    // Get unique student numbers to fetch enrollment info
    const studentNumbers = [
      ...new Set(assessments.map((a) => a.student_number)),
    ];

    // Fetch enrollment info for names and programs
    const enrollments = await prisma.enrollment.findMany({
      where: {
        student_number: { in: studentNumbers },
      },
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

    // Create enrollment lookup map
    const enrollmentMap = new Map(
      enrollments.map((e) => [e.student_number, e]),
    );

    // Fetch program and major info
    const programIds = [
      ...new Set(
        enrollments
          .map((e) => e.course_program)
          .filter((p) => p !== null && p !== undefined && p !== "")
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

    // Build student summaries
    let summaries = assessments.map((assessment) => {
      const enrollment = enrollmentMap.get(assessment.student_number);

      // Build student name
      const studentName = enrollment
        ? [
            enrollment.first_name,
            enrollment.middle_name,
            enrollment.family_name,
          ]
            .filter(Boolean)
            .join(" ")
        : assessment.student_number;

      // Build program display
      let programDisplay: string | null = null;
      if (enrollment?.course_program) {
        const programId = parseInt(enrollment.course_program);
        if (!isNaN(programId)) {
          const program = programMap.get(programId);
          if (program) {
            if (enrollment.major_id) {
              const major = majors.find((m) => m.id === enrollment.major_id);
              programDisplay = major
                ? `${program.code} - ${major.name}`
                : program.code;
            } else {
              programDisplay = program.code;
            }
          }
        }
      }

      // Calculate total due based on payment mode
      let totalDue = Number(assessment.total_due) || 0;
      if (assessment.payment_mode === "cash" && assessment.total_due_cash) {
        totalDue = Number(assessment.total_due_cash);
      } else if (
        assessment.payment_mode === "installment" &&
        assessment.total_due_installment
      ) {
        totalDue = Number(assessment.total_due_installment);
      }

      // Calculate total paid from payments
      const totalPaid = assessment.payments.reduce(
        (sum, p) => sum + Number(p.amount_paid),
        0,
      );

      const remainingBalance = Math.max(0, totalDue - totalPaid);

      // Determine payment status
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
        course_program: programDisplay,
        year_level: enrollment?.year_level ?? null,
        academic_year: assessment.academic_year,
        semester: assessment.semester,
        payment_mode: assessment.payment_mode,
        total_due: totalDue,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        payment_status: paymentStatus,
      };
    });

    // Also search by name if search term provided
    if (search) {
      // We already filtered by student_number above, but also need name search
      // Re-fetch without student_number filter and filter by name instead
      const nameWhereClause: any = {
        academic_year: academicYear,
        semester: semesterInt,
        status: "finalized",
      };

      const nameAssessments = await prisma.student_assessment.findMany({
        where: nameWhereClause,
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
            },
          },
        },
      });

      // Get enrollments that match the name search
      const nameEnrollments = await prisma.enrollment.findMany({
        where: {
          OR: [
            { first_name: { contains: search, mode: "insensitive" } },
            { family_name: { contains: search, mode: "insensitive" } },
          ],
        },
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

      const nameMatchStudentNumbers = new Set(
        nameEnrollments.map((e) => e.student_number),
      );
      const existingIds = new Set(summaries.map((s) => s.assessment_id));

      // Add name-matched assessments not already in results
      for (const assessment of nameAssessments) {
        if (
          nameMatchStudentNumbers.has(assessment.student_number) &&
          !existingIds.has(assessment.id)
        ) {
          const enrollment = nameEnrollments.find(
            (e) => e.student_number === assessment.student_number,
          );

          const studentName = enrollment
            ? [
                enrollment.first_name,
                enrollment.middle_name,
                enrollment.family_name,
              ]
                .filter(Boolean)
                .join(" ")
            : assessment.student_number;

          let programDisplay: string | null = null;
          if (enrollment?.course_program) {
            const programId = parseInt(enrollment.course_program);
            if (!isNaN(programId)) {
              const program = programMap.get(programId);
              if (program) {
                if (enrollment.major_id) {
                  const major = majors.find(
                    (m) => m.id === enrollment.major_id,
                  );
                  programDisplay = major
                    ? `${program.code} - ${major.name}`
                    : program.code;
                } else {
                  programDisplay = program.code;
                }
              }
            }
          }

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

          summaries.push({
            assessment_id: assessment.id,
            student_number: assessment.student_number,
            student_name: studentName,
            course_program: programDisplay,
            year_level: enrollment?.year_level ?? null,
            academic_year: assessment.academic_year,
            semester: assessment.semester,
            payment_mode: assessment.payment_mode,
            total_due: totalDue,
            total_paid: totalPaid,
            remaining_balance: remainingBalance,
            payment_status: paymentStatus,
          });
        }
      }
    }

    // Filter by payment status if specified
    if (statusFilter) {
      summaries = summaries.filter((s) => s.payment_status === statusFilter);
    }

    // Sort by student number
    summaries.sort((a, b) => a.student_number.localeCompare(b.student_number));

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
