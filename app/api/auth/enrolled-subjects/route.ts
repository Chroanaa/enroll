import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";
import { getAcademicTerm } from "../../../utils/academicTermUtils";
import {
  ensureDeanStudentAccess,
  getSessionScope,
} from "@/app/lib/accessScope";

/**
 * POST /api/auth/enrolled-subjects
 * Save or update enrolled subjects for a student
 * - If records exist for the same semester and academic year: UPDATE
 * - If records don't exist or different semester/year: INSERT
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { studentNumber, programId, academicYear, semester, subjects } = data;

    if (
      !studentNumber ||
      !programId ||
      !academicYear ||
      !semester ||
      !Array.isArray(subjects)
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: studentNumber, programId, academicYear, semester, and subjects array",
        },
        { status: 400 },
      );
    }

    const semesterNum = parseInt(semester);
    if (semesterNum !== 1 && semesterNum !== 2) {
      return NextResponse.json(
        { error: "semester must be 1 or 2" },
        { status: 400 },
      );
    }

    const scope = await getSessionScope();
    const access = await ensureDeanStudentAccess(scope, {
      studentNumber,
      academicYear,
      semester: semesterNum,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access });
    }

    // Check if enrolled subjects already exist for this student, academic year, and semester
    const existingRecords = await prisma.$queryRaw<any[]>`
      SELECT id FROM enrolled_subjects 
      WHERE student_number = ${studentNumber} 
      AND academic_year = ${academicYear} 
      AND semester = ${semesterNum}
      LIMIT 1
    `;

    const recordsExist = existingRecords.length > 0;

    if (recordsExist) {
      // UPDATE: Delete old records ONLY for the same term and insert new ones
      // This preserves historical data from other semesters/years
      await prisma.$executeRaw`
        DELETE FROM enrolled_subjects 
        WHERE student_number = ${studentNumber} 
        AND academic_year = ${academicYear} 
        AND semester = ${semesterNum}
      `;
    }
    // If recordsExist is false, we skip deletion and just insert new records
    // This means different semester/year data is preserved

    // Get user session to check if admin
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || 0;
    const isAdmin = userRole === 1; // Role 1 = ADMIN

    // Calculate total units
    const totalUnits = subjects.reduce((sum: number, subject: any) => {
      return sum + (subject.units_total || 0);
    }, 0);

    // Determine status based on total units and user role
    // If total units > 27 and user is not admin, set status to "pending"
    // Otherwise, set status to "enrolled"
    const enrollmentStatus =
      totalUnits > 27 && !isAdmin ? "pending" : "enrolled";

    // Insert enrolled subjects (either new term or updated term)
    if (subjects.length > 0) {
      const enrolledSubjectsData = subjects.map((subject: any) => ({
        student_number: studentNumber,
        program_id: programId,
        curriculum_course_id: subject.curriculum_course_id || subject.id,
        subject_id: subject.subject_id || null,
        academic_year: academicYear,
        semester: semesterNum,
        term: semesterNum === 1 ? "First Semester" : "Second Semester",
        year_level: subject.year_level || null,
        units_total: subject.units_total || 0,
        status: enrollmentStatus,
      }));

      // Use transaction for better performance with multiple inserts
      // This is faster than individual inserts but still safe
      if (enrolledSubjectsData.length > 0) {
        await prisma.$transaction(
          enrolledSubjectsData.map(
            (subjectData) =>
              prisma.$executeRaw`
              INSERT INTO enrolled_subjects (
                student_number, program_id, curriculum_course_id, subject_id,
                academic_year, semester, term, year_level, units_total, status
              ) VALUES (
                ${subjectData.student_number},
                ${subjectData.program_id},
                ${subjectData.curriculum_course_id},
                ${subjectData.subject_id},
                ${subjectData.academic_year},
                ${subjectData.semester},
                ${subjectData.term},
                ${subjectData.year_level},
                ${subjectData.units_total},
                ${subjectData.status}
              )
            `,
          ),
        );
      }
    }

    const statusMessage =
      enrollmentStatus === "pending"
        ? " Subjects are pending approval due to exceeding 27 units. Admin approval is required."
        : "";

    return NextResponse.json({
      success: true,
      message:
        (recordsExist
          ? "Enrolled subjects updated successfully"
          : "Enrolled subjects saved successfully") + statusMessage,
      action: recordsExist ? "updated" : "inserted",
      status: enrollmentStatus,
    });
  } catch (error: any) {
    console.error("Error saving enrolled subjects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save enrolled subjects" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auth/enrolled-subjects
 * Fetch enrolled subjects for a student
 */
export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    const searchParams = request.nextUrl.searchParams;
    const studentNumber = searchParams.get("studentNumber");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!studentNumber || !academicYear || !semester) {
      return NextResponse.json(
        { error: "studentNumber, academicYear, and semester are required" },
        { status: 400 },
      );
    }

    const semesterNum = parseInt(semester);
    if (semesterNum !== 1 && semesterNum !== 2) {
      return NextResponse.json(
        { error: "semester must be 1 or 2" },
        { status: 400 },
      );
    }

    const access = await ensureDeanStudentAccess(scope, {
      studentNumber,
      academicYear,
      semester: semesterNum,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access });
    }

    // Enforce server-side current-term access only.
    // This blocks fetching previous or future term subjects even if query params are tampered with.
    const serverTimeResult = await prisma.$queryRaw<
      [{ now: Date }]
    >`SELECT NOW() as now`;
    const currentTerm = getAcademicTerm(serverTimeResult[0].now);
    const currentSemesterNum = currentTerm.semester === "First" ? 1 : 2;

    if (
      academicYear !== currentTerm.academicYear ||
      semesterNum !== currentSemesterNum
    ) {
      return NextResponse.json(
        {
          error:
            "Only enrolled subjects from the current academic term can be fetched.",
          currentTerm: {
            academicYear: currentTerm.academicYear,
            semester: currentSemesterNum,
            semesterLabel: currentTerm.semester,
          },
        },
        { status: 403 },
      );
    }

    // Fetch enrolled subjects with prerequisite resolution.
    // Falls back to the subject table when the curriculum_course row has been
    // removed (e.g. after a curriculum delete/recreate), so data is never lost.
    const enrolledSubjects = await prisma.$queryRaw<any[]>`
      SELECT 
        es.id,
        es.student_number,
        es.program_id,
        es.curriculum_course_id,
        es.subject_id,
        es.academic_year,
        es.semester,
        es.term,
        es.year_level,
        es.units_total,
        es.status,
        es.drop_status,
        es.enrolled_at,
        es.updated_at,
        COALESCE(cc.course_code, s.code)             AS course_code,
        COALESCE(cc.descriptive_title, s.name)       AS descriptive_title,
        COALESCE(cc.units_lec, s.units_lec)          AS units_lec,
        COALESCE(cc.units_lab, s.units_lab)          AS units_lab,
        COALESCE(cc.lecture_hour, s.lecture_hour)    AS lecture_hour,
        COALESCE(cc.lab_hour, s.lab_hour)            AS lab_hour,
        cc.prerequisite,
        cc.year_level                                AS curriculum_year_level,
        COALESCE(cc."fixedAmount", s."fixedAmount")  AS fixed_amount
      FROM enrolled_subjects es
      LEFT JOIN curriculum_course cc ON es.curriculum_course_id = cc.id
      LEFT JOIN subject s ON es.subject_id = s.id
      WHERE es.student_number = ${studentNumber}
        AND es.academic_year = ${academicYear}
        AND es.semester = ${semesterNum}
      ORDER BY COALESCE(cc.course_code, s.code)
    `;

    // Optimize prerequisite fetching: collect all unique subject IDs first, then batch fetch
    const allPrerequisiteSubjectIds = new Set<number>();
    const prerequisiteMap = new Map<number, string>(); // Map subject ID to code

    // First pass: collect all prerequisite subject IDs
    enrolledSubjects.forEach((es: any) => {
      if (es.prerequisite) {
        try {
          const prereqData = JSON.parse(es.prerequisite);
          if (
            prereqData &&
            Array.isArray(prereqData.subjectIds) &&
            prereqData.subjectIds.length > 0
          ) {
            prereqData.subjectIds.forEach((id: number) =>
              allPrerequisiteSubjectIds.add(id),
            );
          }
        } catch (e) {
          // Skip JSON parsing errors, will handle in second pass
        }
      }
    });

    // Batch fetch all prerequisite subject codes in a single query
    if (allPrerequisiteSubjectIds.size > 0) {
      const subjectIdsArray = Array.from(allPrerequisiteSubjectIds);
      const subjects = await prisma.$queryRaw<any[]>`
        SELECT id, code FROM subject WHERE id = ANY(${subjectIdsArray}::int[])
      `;
      subjects.forEach((s: any) => {
        prerequisiteMap.set(s.id, s.code);
      });
    }

    // Second pass: map prerequisites to subjects
    const formattedSubjects = enrolledSubjects.map((es: any) => {
      let prerequisiteText = null;

      if (es.prerequisite) {
        try {
          const prereqData = JSON.parse(es.prerequisite);
          if (
            prereqData &&
            Array.isArray(prereqData.subjectIds) &&
            prereqData.subjectIds.length > 0
          ) {
            const codes = prereqData.subjectIds
              .map((id: number) => prerequisiteMap.get(id))
              .filter(Boolean);
            if (codes.length > 0) {
              prerequisiteText = codes.join(", ");
            }
          }
        } catch (e) {
          // If parsing fails and the value looks like JSON, hide it instead of
          // returning raw JSON to the frontend. If it's a simple text value,
          // pass it through.
          if (
            typeof es.prerequisite === "string" &&
            es.prerequisite.trim().startsWith("{")
          ) {
            prerequisiteText = null;
          } else {
            prerequisiteText = es.prerequisite;
          }
        }
      }

      return {
        id: es.id, // This is the unique enrolled_subjects.id
        curriculum_course_id: es.curriculum_course_id,
        subject_id: es.subject_id,
        status: es.status,
        drop_status: es.drop_status,
        course_code: es.course_code,
        descriptive_title: es.descriptive_title,
        units_lec: es.units_lec || 0,
        units_lab: es.units_lab || 0,
        units_total: es.units_total || es.units_lec + es.units_lab || 0,
        lecture_hour: es.lecture_hour || 0,
        lab_hour: es.lab_hour || 0,
        prerequisite: prerequisiteText,
        year_level: es.curriculum_year_level || es.year_level,
        semester: es.semester,
        fixedAmount: es.fixed_amount ? Number(es.fixed_amount) : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedSubjects,
    });
  } catch (error: any) {
    console.error("Error fetching enrolled subjects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch enrolled subjects" },
      { status: 500 },
    );
  }
}
