import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionScope } from "@/app/lib/accessScope";

const ALLOWED_ROLES = new Set([1, 4, 5]); // Admin, Registrar, Dean

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(Number(scope.roleId || 0))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const curriculumCourseId = Number(searchParams.get("curriculumCourseId") || "");
    const academicYear = String(searchParams.get("academicYear") || "").trim();
    const semester = Number(searchParams.get("semester") || "");

    if (
      !Number.isFinite(curriculumCourseId) ||
      curriculumCourseId <= 0 ||
      !academicYear ||
      !Number.isFinite(semester) ||
      semester <= 0
    ) {
      return NextResponse.json(
        { error: "curriculumCourseId, academicYear, and semester are required." },
        { status: 400 },
      );
    }

    const subjectRows = await prisma.$queryRaw<
      {
        student_number: string;
        first_name: string | null;
        middle_name: string | null;
        family_name: string | null;
        email_address: string | null;
        course_program: string | null;
        year_level: number | null;
        academic_status: string | null;
        has_assignment: boolean;
      }[]
    >`
      WITH approved AS (
        SELECT DISTINCT psr.student_number
        FROM student_petition_subject_requests psr
        WHERE psr.curriculum_course_id = ${curriculumCourseId}
          AND psr.academic_year = ${academicYear}
          AND psr.semester = ${semester}
          AND LOWER(COALESCE(psr.status, '')) = 'approved'
      ),
      latest_enrollment AS (
        SELECT DISTINCT ON (e.student_number)
          e.student_number,
          e.first_name,
          e.middle_name,
          e.family_name,
          e.email_address,
          e.course_program,
          e.year_level,
          e.academic_status
        FROM enrollment e
        INNER JOIN approved ap ON ap.student_number = e.student_number
        ORDER BY e.student_number, e.id DESC
      ),
      assigned AS (
        SELECT DISTINCT ss.student_number
        FROM student_section ss
        INNER JOIN student_section_subjects sss ON sss.student_section_id = ss.id
        INNER JOIN class_schedule cs ON cs.id = sss.class_schedule_id
        WHERE ss.academic_year = ${academicYear}
          AND cs.curriculum_course_id = ${curriculumCourseId}
          AND (
            (${semester} = 1 AND LOWER(COALESCE(ss.semester, '')) IN ('first', 'first semester', '1', '1st semester'))
            OR
            (${semester} = 2 AND LOWER(COALESCE(ss.semester, '')) IN ('second', 'second semester', '2', '2nd semester'))
            OR
            (${semester} = 3 AND LOWER(COALESCE(ss.semester, '')) IN ('third', 'third semester', '3', '3rd semester', 'summer'))
          )
      )
      SELECT
        ap.student_number,
        le.first_name,
        le.middle_name,
        le.family_name,
        le.email_address,
        le.course_program,
        le.year_level,
        le.academic_status,
        CASE WHEN a.student_number IS NULL THEN FALSE ELSE TRUE END AS has_assignment
      FROM approved ap
      LEFT JOIN latest_enrollment le ON le.student_number = ap.student_number
      LEFT JOIN assigned a ON a.student_number = ap.student_number
      ORDER BY ap.student_number ASC
    `;

    return NextResponse.json({
      success: true,
      data: subjectRows.map((row) => {
        const firstName = String(row.first_name || "").trim();
        const middleName = String(row.middle_name || "").trim();
        const lastName = String(row.family_name || "").trim();
        const name = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
        return {
          studentNumber: String(row.student_number || ""),
          firstName,
          middleName,
          lastName,
          name: name || String(row.student_number || ""),
          email: String(row.email_address || "").trim(),
          programLabel: String(row.course_program || "").trim(),
          yearLevel: row.year_level === null ? null : Number(row.year_level),
          academicStatus: String(row.academic_status || "irregular"),
          hasAssignment: Boolean(row.has_assignment),
        };
      }),
    });
  } catch (error: any) {
    console.error("Error fetching petition enrollment list:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch petition enrollment list." },
      { status: 500 },
    );
  }
}
