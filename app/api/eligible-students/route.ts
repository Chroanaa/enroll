import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

/**
 * GET /api/eligible-students
 * Get students eligible for section assignment
 *
 * Query params:
 * - sectionId: number (OR programId, yearLevel, academicYear, semester for backward compatibility)
 * - programId: number
 * - yearLevel: number
 * - academicYear: string
 * - semester: string
 * - academicStatus: 'regular' | 'irregular' | 'all' (default: 'regular')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");
    const programId = searchParams.get("programId");
    const yearLevel = searchParams.get("yearLevel");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const academicStatus = searchParams.get("academicStatus") || "regular"; // NEW: Filter by academic status

    let targetProgramId = programId ? parseInt(programId) : null;
    let targetYearLevel = yearLevel;
    let targetAcademicYear = academicYear || null;
    let targetSemester = semester || null;

    // If sectionId provided, fetch section details
    if (sectionId) {
      const section = await prisma.sections.findUnique({
        where: { id: parseInt(sectionId) },
      });

      if (!section) {
        return NextResponse.json(
          {
            error: "NOT_FOUND",
            message: `Section ${sectionId} not found`,
          },
          { status: 404 },
        );
      }

      targetProgramId = section.program_id;
      targetYearLevel = section.year_level?.toString() || null;
      targetAcademicYear = section.academic_year ?? null;
      targetSemester = section.semester ?? null;
    } else if (!programId || !yearLevel || !academicYear || !semester) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message:
            "Missing required query parameters: (sectionId) OR (programId, yearLevel, academicYear, semester)",
        },
        { status: 400 },
      );
    }

    // Fetch section to get program details if needed
    const program = await prisma.program.findUnique({
      where: { id: targetProgramId! },
    });

    if (!program) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: `Program ${targetProgramId} not found`,
        },
        { status: 404 },
      );
    }

    const normalizeSemesterValue = (value: string | null) => {
      if (!value) return null;
      const normalized = value.trim().toLowerCase();
      if (
        normalized === "1" ||
        normalized === "first" ||
        normalized === "first semester"
      )
        return "first";
      if (
        normalized === "2" ||
        normalized === "second" ||
        normalized === "second semester"
      )
        return "second";
      if (normalized === "3" || normalized === "summer") return "summer";
      return value;
    };

    const normalizedSemester = normalizeSemesterValue(targetSemester);

    if (!normalizedSemester) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid semester value",
        },
        { status: 400 },
      );
    }

    // Get all enrolled students matching criteria from enrollment table
    // Note: enrollment table uses 'term' field for semester
    console.log("Searching for eligible students with:", {
      programId: targetProgramId,
      yearLevel: targetYearLevel,
      academicYear: targetAcademicYear,
      semester: normalizedSemester,
    });

    // First, let's check what students exist with this program
    const allEnrollments = await prisma.enrollment.findMany({
      where: {
        OR: [
          { course_program: targetProgramId!.toString() },
          { course_program: program.code }, // Try program code
          { course_program: program.name }, // Try program name
        ],
        year_level: parseInt(targetYearLevel!),
      },
      select: {
        id: true,
        student_number: true,
        course_program: true,
        year_level: true,
        academic_year: true,
        term: true,
        status: true,
      },
      take: 5,
    });

    console.log("Sample enrollments found:", allEnrollments);

    const enrolledStudents = await prisma.enrollment.findMany({
      where: {
        OR: [
          { course_program: targetProgramId!.toString() },
          { course_program: program.code }, // Try program code like "BSIT"
          { course_program: program.name }, // Try program name
        ],
        year_level: parseInt(targetYearLevel!),
        // Filter by academic status (regular/irregular)
        ...(academicStatus !== "all" && { academic_status: academicStatus }),
      },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        email_address: true,
        course_program: true,
        academic_year: true,
        term: true,
        academic_status: true,
        year_level: true,
        major_id: true,
      },
    });

    console.log(`Found ${enrolledStudents.length} enrolled students`);

    // Filter students by academic year and term
    const matchingStudents = enrolledStudents.filter((enrollment) => {
      // Check if academic year matches (could be "2024", "2024-2025", or "2025-2026" format)
      const enrollmentYear = enrollment.academic_year;
      let yearMatches = false;

      if (enrollmentYear) {
        const targetYear = targetAcademicYear!;
        // Check if enrollment year contains target year
        // e.g., "2025-2026" contains "2025" or "2026"
        yearMatches = enrollmentYear.includes(targetYear);

        // Also check if target year is the start of the range
        // e.g., target "2025" matches "2025-2026"
        if (!yearMatches && enrollmentYear.includes("-")) {
          const [startYear] = enrollmentYear.split("-");
          yearMatches = startYear === targetYear;
        }
      }

      // Check if term matches - normalize both sides for comparison
      const enrollmentTerm = normalizeSemesterValue(enrollment.term);
      const termMatches = enrollmentTerm === normalizedSemester;

      console.log(
        `Student ${enrollment.student_number}: year=${enrollmentYear} (matches: ${yearMatches}), term=${enrollment.term} -> ${enrollmentTerm} (matches: ${termMatches})`,
      );

      return yearMatches && termMatches;
    });

    console.log(
      `After filtering by year/term: ${matchingStudents.length} students`,
    );

    // Get all student_section assignments for this term in bulk (one query instead of N)
    const studentNumbers = matchingStudents
      .map(e => e.student_number)
      .filter(Boolean) as string[];

    // Fetch payment info (mode + amounts) from student_assessment for each student
    const semesterNumForAssessment = normalizedSemester === 'first' ? 1
      : normalizedSemester === 'second' ? 2 : 3;
    const assessments = await prisma.student_assessment.findMany({
      where: {
        student_number: { in: studentNumbers },
        academic_year: targetAcademicYear!,
        semester: semesterNumForAssessment,
        status: 'finalized',
      },
      select: {
        student_number: true,
        payment_mode: true,
        total_due: true,
        total_due_cash: true,
        total_due_installment: true,
        payments: {
          select: { amount_paid: true },
        },
      },
    });
    const assessmentMap = new Map(assessments.map(a => [a.student_number, a]));
    const totalPaidMap = new Map(
      assessments.map(a => [
        a.student_number,
        a.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0),
      ])
    );

    // Fetch count of enrolled_subjects per student to detect students with no assessment subjects
    const enrolledSubjectCounts = await prisma.$queryRaw<{ student_number: string; cnt: bigint }[]>`
      SELECT student_number, COUNT(*) AS cnt
      FROM enrolled_subjects
      WHERE student_number = ANY(${studentNumbers}::text[])
        AND academic_year  = ${targetAcademicYear!}
        AND semester       = ${semesterNumForAssessment}
      GROUP BY student_number
    `;
    const enrolledSubjectCountMap = new Map(
      enrolledSubjectCounts.map(r => [r.student_number, Number(r.cnt)])
    );

    // Batch-fetch major names for all unique major_ids
    const uniqueMajorIds = [...new Set(
      matchingStudents.map(e => e.major_id).filter((id): id is number => id != null)
    )];
    const majors = uniqueMajorIds.length > 0
      ? await prisma.major.findMany({
          where: { id: { in: uniqueMajorIds } },
          select: { id: true, name: true },
        })
      : [];
    const majorMap = new Map(majors.map(m => [m.id, m.name]));

    const existingAssignments = await prisma.student_section.findMany({
      where: {
        student_number: { in: studentNumbers },
        academic_year: targetAcademicYear!,
        semester: normalizedSemester,
      },
      select: {
        student_number: true,
        section_id: true,
      },
    });

    // Build a map of student_number -> section_id for already-assigned students
    const assignedMap = new Map(
      existingAssignments.map(a => [a.student_number, a.section_id])
    );

    // Get section names for assigned students (to display "Already in Section X")
    const assignedSectionIds = [...new Set(existingAssignments.map(a => a.section_id))];
    const assignedSections = assignedSectionIds.length > 0
      ? await prisma.sections.findMany({
          where: { id: { in: assignedSectionIds } },
          select: { id: true, section_name: true },
        })
      : [];
    const sectionNameMap = new Map(assignedSections.map(s => [s.id, s.section_name]));

    // Return ALL matching students — mark already-assigned ones so the UI can show/disable them
    const eligibleStudents = matchingStudents
      .filter(e => e.student_number)
      .map(enrollment => {
        const assignedSectionId = assignedMap.get(enrollment.student_number!);
        const assignedSectionName = assignedSectionId
          ? sectionNameMap.get(assignedSectionId) ?? null
          : null;

        console.log(
          `Student ${enrollment.student_number}: assigned = ${!!assignedSectionId}${assignedSectionName ? ` (${assignedSectionName})` : ''}`,
        );

        return {
          studentId: enrollment.id,
          studentNumber: enrollment.student_number,
          firstName: enrollment.first_name,
          middleName: enrollment.middle_name,
          lastName: enrollment.family_name,
          name: `${enrollment.first_name || ""} ${enrollment.middle_name || ""} ${enrollment.family_name || ""}`.trim(),
          email: enrollment.email_address,
          programId: targetProgramId!,
          programCode: program.code,
          programName: program.name,
          majorId: enrollment.major_id ?? null,
          majorName: enrollment.major_id ? (majorMap.get(enrollment.major_id) ?? null) : null,
          academicStatus: enrollment.academic_status || "regular",
          isAssigned: !!assignedSectionId,
          assignedSectionName: assignedSectionName,
          // Payment info from student_assessment
          paymentMode: assessmentMap.get(enrollment.student_number!)?.payment_mode || null,
          totalDue: assessmentMap.has(enrollment.student_number!)
            ? Number(assessmentMap.get(enrollment.student_number!)!.total_due)
            : null,
          totalDueCash: assessmentMap.has(enrollment.student_number!)
            ? Number(assessmentMap.get(enrollment.student_number!)!.total_due_cash)
            : null,
          totalDueInstallment: assessmentMap.has(enrollment.student_number!)
            ? Number(assessmentMap.get(enrollment.student_number!)!.total_due_installment)
            : null,
          hasAssessment: assessmentMap.has(enrollment.student_number!),
          totalPaid: totalPaidMap.get(enrollment.student_number!) ?? 0,
          hasPaid: (totalPaidMap.get(enrollment.student_number!) ?? 0) > 0,
          hasEnrolledSubjects: (enrolledSubjectCountMap.get(enrollment.student_number!) ?? 0) > 0,
          enrolledSubjectCount: enrolledSubjectCountMap.get(enrollment.student_number!) ?? 0,
        };
      });

    console.log(`Returning ${eligibleStudents.length} eligible students`);

    return NextResponse.json({
      success: true,
      data: eligibleStudents,
      debug: {
        totalEnrolled: enrolledStudents.length,
        matchingYearTerm: matchingStudents.length,
        totalEligible: eligibleStudents.length,
        filters: {
          programId: targetProgramId,
          programCode: program.code,
          programName: program.name,
          yearLevel: targetYearLevel,
          academicYear: targetAcademicYear,
          semester: normalizedSemester,
          academicStatus: academicStatus,
        },
        sampleData: enrolledStudents.slice(0, 2).map((e) => ({
          student_number: e.student_number,
          academic_year: e.academic_year,
          term: e.term,
          year_level: e.year_level,
          course_program: e.course_program,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching eligible students:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch eligible students",
      },
      { status: 500 },
    );
  }
}
