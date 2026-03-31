import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getAcademicTerm } from "@/app/utils/academicTermUtils";
import { getSessionScope } from "@/app/lib/accessScope";

const ALLOWED_ROLES = new Set([1, 4, 5]); // Admin, Registrar, Dean

function getSemesterAliases(semester: number): string[] {
  if (semester === 1) {
    return ["first", "first semester", "1", "1st semester"];
  }
  if (semester === 2) {
    return ["second", "second semester", "2", "2nd semester"];
  }
  return [];
}

async function getServerCurrentTerm() {
  const serverTimeResult = await prisma.$queryRaw<[{ now: Date }]>`
    SELECT NOW() AS now
  `;
  return getAcademicTerm(serverTimeResult[0].now);
}

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
    const academicYearParam = String(searchParams.get("academicYear") || "").trim();
    const semesterParam = String(searchParams.get("semester") || "").trim().toLowerCase();

    const currentTerm = await getServerCurrentTerm();
    const defaultSemesterNum = currentTerm.semester === "First" ? 1 : 2;

    let semesterNum = defaultSemesterNum;
    if (semesterParam === "first" || semesterParam === "1") semesterNum = 1;
    if (semesterParam === "second" || semesterParam === "2") semesterNum = 2;

    const academicYear = academicYearParam || currentTerm.academicYear;

    const firstSemesterAliases = getSemesterAliases(1);
    const secondSemesterAliases = getSemesterAliases(2);

    const rows = await prisma.$queryRaw<any[]>`
      WITH petition_requests AS (
        SELECT DISTINCT
          psr.student_number,
          psr.academic_year,
          psr.semester,
          psr.curriculum_course_id,
          psr.subject_id,
          psr.requested_subject_year_level,
          LOWER(COALESCE(psr.status, '')) AS request_status
        FROM student_petition_subject_requests psr
        WHERE LOWER(COALESCE(psr.status, '')) IN ('pending_approval', 'approved')
          AND psr.academic_year = ${academicYear}
          AND psr.semester = ${semesterNum}
          AND (
            LOWER(COALESCE(psr.status, '')) = 'pending_approval'
            OR EXISTS (
              SELECT 1
              FROM enrolled_subjects es
              WHERE es.student_number = psr.student_number
                AND es.curriculum_course_id = psr.curriculum_course_id
                AND es.academic_year = psr.academic_year
                AND es.semester = psr.semester
                AND LOWER(COALESCE(es.drop_status, 'none')) NOT IN ('pending_approval', 'dropped')
            )
          )
      ),
      petition_with_assignment AS (
        SELECT
          pr.*,
          EXISTS (
            SELECT 1
            FROM student_section ss
            INNER JOIN student_section_subjects sss ON sss.student_section_id = ss.id
            INNER JOIN class_schedule cs ON cs.id = sss.class_schedule_id
            WHERE ss.student_number = pr.student_number
              AND ss.academic_year = pr.academic_year
              AND (
                (pr.semester = 1 AND LOWER(COALESCE(ss.semester, '')) IN (${firstSemesterAliases[0]}, ${firstSemesterAliases[1]}, ${firstSemesterAliases[2]}, ${firstSemesterAliases[3]}))
                OR
                (pr.semester = 2 AND LOWER(COALESCE(ss.semester, '')) IN (${secondSemesterAliases[0]}, ${secondSemesterAliases[1]}, ${secondSemesterAliases[2]}, ${secondSemesterAliases[3]}))
              )
              AND cs.curriculum_course_id = pr.curriculum_course_id
          ) AS has_assignment
        FROM petition_requests pr
      )
      SELECT
        pwa.curriculum_course_id,
        COALESCE(cc.subject_id, pwa.subject_id) AS subject_id,
        COALESCE(cc.course_code, sub.code) AS course_code,
        COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
        MAX(prog.id) AS program_id,
        MAX(prog.code) AS program_code,
        MAX(prog.name) AS program_name,
        COALESCE(MAX(pwa.requested_subject_year_level), MAX(cc.year_level), 0) AS year_level,
        pwa.academic_year,
        pwa.semester,
        COUNT(DISTINCT pwa.student_number)::int AS requested_students,
        COUNT(DISTINCT CASE WHEN pwa.request_status = 'approved' THEN pwa.student_number END)::int AS approved_students,
        COUNT(DISTINCT CASE WHEN pwa.request_status = 'pending_approval' THEN pwa.student_number END)::int AS pending_students,
        COUNT(DISTINCT CASE WHEN sec_pet.id IS NOT NULL THEN sec_pet.id END)::int AS petition_section_count,
        COUNT(DISTINCT CASE WHEN cs_pet.id IS NOT NULL THEN cs_pet.id END)::int AS petition_schedule_count,
        COUNT(DISTINCT CASE WHEN NOT pwa.has_assignment THEN pwa.student_number END)::int AS unassigned_students
      FROM petition_with_assignment pwa
      LEFT JOIN curriculum_course cc ON cc.id = pwa.curriculum_course_id
      LEFT JOIN curriculum cur ON cur.id = cc.curriculum_id
      LEFT JOIN program prog ON LOWER(COALESCE(prog.code, '')) = LOWER(COALESCE(cur.program_code, ''))
      LEFT JOIN subject sub ON sub.id = COALESCE(cc.subject_id, pwa.subject_id)
      LEFT JOIN sections sec_pet ON sec_pet.academic_year = pwa.academic_year
        AND (
          (pwa.semester = 1 AND LOWER(COALESCE(sec_pet.semester, '')) IN (${firstSemesterAliases[0]}, ${firstSemesterAliases[1]}, ${firstSemesterAliases[2]}, ${firstSemesterAliases[3]}))
          OR
          (pwa.semester = 2 AND LOWER(COALESCE(sec_pet.semester, '')) IN (${secondSemesterAliases[0]}, ${secondSemesterAliases[1]}, ${secondSemesterAliases[2]}, ${secondSemesterAliases[3]}))
        )
        AND sec_pet.section_name ILIKE 'PET-%'
      LEFT JOIN class_schedule cs_pet ON cs_pet.section_id = sec_pet.id
        AND cs_pet.curriculum_course_id = pwa.curriculum_course_id
        AND cs_pet.academic_year = pwa.academic_year
        AND (
          (pwa.semester = 1 AND LOWER(COALESCE(cs_pet.semester, '')) IN (${firstSemesterAliases[0]}, ${firstSemesterAliases[1]}, ${firstSemesterAliases[2]}, ${firstSemesterAliases[3]}))
          OR
          (pwa.semester = 2 AND LOWER(COALESCE(cs_pet.semester, '')) IN (${secondSemesterAliases[0]}, ${secondSemesterAliases[1]}, ${secondSemesterAliases[2]}, ${secondSemesterAliases[3]}))
        )
        AND LOWER(COALESCE(cs_pet.status, '')) = 'active'
      GROUP BY
        pwa.curriculum_course_id,
        COALESCE(cc.subject_id, pwa.subject_id),
        COALESCE(cc.course_code, sub.code),
        COALESCE(cc.descriptive_title, sub.name),
        pwa.academic_year,
        pwa.semester
      HAVING COUNT(DISTINCT CASE WHEN NOT pwa.has_assignment THEN pwa.student_number END) > 0
      ORDER BY unassigned_students DESC, course_code ASC
    `;

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        curriculumCourseId: Number(row.curriculum_course_id),
        subjectId:
          row.subject_id === null || row.subject_id === undefined
            ? null
            : Number(row.subject_id),
        programId:
          row.program_id === null || row.program_id === undefined
            ? null
            : Number(row.program_id),
        programCode: row.program_code ? String(row.program_code) : null,
        programName: row.program_name ? String(row.program_name) : null,
        courseCode: String(row.course_code || "N/A"),
        descriptiveTitle: String(row.descriptive_title || "No title"),
        yearLevel: Number(row.year_level || 0),
        academicYear: String(row.academic_year || academicYear),
        semester: Number(row.semester || semesterNum),
        requestedStudents: Number(row.requested_students || 0),
        approvedStudents: Number(row.approved_students || 0),
        pendingStudents: Number(row.pending_students || 0),
        petitionSectionCount: Number(row.petition_section_count || 0),
        petitionScheduleCount: Number(row.petition_schedule_count || 0),
        hasPetitionSchedule: Number(row.petition_schedule_count || 0) > 0,
        unassignedStudents: Number(row.unassigned_students || 0),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching petition scheduling queue:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch petition scheduling queue." },
      { status: 500 },
    );
  }
}
