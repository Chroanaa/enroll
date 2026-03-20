import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

function getSemesterAliases(semester: number): string[] {
  if (semester === 1) return ["first", "first semester", "1", "1st semester"];
  if (semester === 2) return ["second", "second semester", "2", "2nd semester"];
  if (semester === 3) return ["third", "third semester", "3", "3rd semester", "summer"];
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const includeDetails = searchParams.get("includeDetails") === "true";
    const noSectionOnly = searchParams.get("noSectionOnly") === "true";

    if (!academicYear || !semester) {
      return NextResponse.json(
        { error: "academicYear and semester are required." },
        { status: 400 },
      );
    }

    const semesterNum = Number.parseInt(semester, 10);
    const semesterAliases = getSemesterAliases(semesterNum);

    if (semesterNum !== 1 && semesterNum !== 2 && semesterNum !== 3) {
      return NextResponse.json(
        { error: "semester must be 1, 2, or 3." },
        { status: 400 },
      );
    }

    const rows = await prisma.$queryRaw<
      {
        student_number: string;
        enrolled_subject_count: bigint | number;
        no_section_subject_count: bigint | number;
      }[]
    >`
      SELECT
        es.student_number,
        COUNT(*) AS enrolled_subject_count,
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1
            FROM student_section ss
            INNER JOIN student_section_subjects sss ON sss.student_section_id = ss.id
            INNER JOIN class_schedule cs ON cs.id = sss.class_schedule_id
            WHERE ss.student_number = es.student_number
              AND ss.academic_year = es.academic_year
              AND LOWER(COALESCE(ss.semester, '')) IN (${semesterAliases[0]}, ${semesterAliases[1]}, ${semesterAliases[2]}, ${semesterAliases[3]}, ${semesterAliases[4] || semesterAliases[3]})
              AND cs.curriculum_course_id = es.curriculum_course_id
          )
        ) AS no_section_subject_count
      FROM enrolled_subjects es
      WHERE es.academic_year = ${academicYear}
        AND es.semester = ${semesterNum}
        AND es.status = 'enrolled'
      GROUP BY es.student_number
      HAVING COUNT(*) > 0
      ORDER BY no_section_subject_count DESC, es.student_number ASC
    `;

    const filteredRows = noSectionOnly
      ? rows.filter((row) => Number(row.no_section_subject_count || 0) > 0)
      : rows;

    const studentNumbers = filteredRows.map((row) => row.student_number).filter(Boolean);

    if (!includeDetails) {
      return NextResponse.json({
        success: true,
        data: studentNumbers,
      });
    }

    if (studentNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { student_number: { in: studentNumbers } },
      select: {
        student_number: true,
        first_name: true,
        middle_name: true,
        family_name: true,
        course_program: true,
        year_level: true,
      },
      orderBy: [{ family_name: "asc" }, { first_name: "asc" }],
    });

    const programKeys = [
      ...new Set(enrollments.map((e) => e.course_program).filter(Boolean)),
    ];

    let programs: Array<{ id: number; code: string }> = [];
    if (programKeys.length > 0) {
      const numericIds = programKeys
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => !Number.isNaN(value));
      const stringCodes = programKeys.filter((value) =>
        Number.isNaN(Number.parseInt(String(value), 10)),
      ) as string[];

      programs = await prisma.program.findMany({
        where: {
          OR: [
            numericIds.length > 0 ? { id: { in: numericIds } } : undefined,
            stringCodes.length > 0 ? { code: { in: stringCodes } } : undefined,
          ].filter(Boolean) as any[],
        },
        select: { id: true, code: true },
      });
    }

    const programByKey = new Map<string, string>();
    for (const program of programs) {
      programByKey.set(String(program.id), program.code);
      programByKey.set(program.code, program.code);
    }

    const payload = enrollments.map((enrollment) => {
      const studentName = [
        enrollment.family_name,
        enrollment.first_name,
        enrollment.middle_name,
      ]
        .filter(Boolean)
        .join(", ");
      const programCode =
        programByKey.get(String(enrollment.course_program || "")) ||
        String(enrollment.course_program || "N/A");

      return {
        studentNumber: enrollment.student_number,
        studentName: studentName || enrollment.student_number,
        programCode,
        yearLevel: enrollment.year_level ?? null,
        enrolledSubjectCount: Number(
          filteredRows.find((row) => row.student_number === enrollment.student_number)
            ?.enrolled_subject_count || 0,
        ),
        noSectionSubjectCount: Number(
          filteredRows.find((row) => row.student_number === enrollment.student_number)
            ?.no_section_subject_count || 0,
        ),
      };
    });

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error: any) {
    console.error("Error fetching enrolled-subject students:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch enrolled-subject students." },
      { status: 500 },
    );
  }
}
