import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

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

    if (!studentNumber || !programId || !academicYear || !semester || !Array.isArray(subjects)) {
      return NextResponse.json(
        { error: "Missing required fields: studentNumber, programId, academicYear, semester, and subjects array" },
        { status: 400 }
      );
    }

    const semesterNum = parseInt(semester);
    if (semesterNum !== 1 && semesterNum !== 2) {
      return NextResponse.json(
        { error: "semester must be 1 or 2" },
        { status: 400 }
      );
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
        status: "enrolled",
      }));

      // Use raw SQL for bulk insert
      for (const subjectData of enrolledSubjectsData) {
        await prisma.$executeRaw`
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
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message: recordsExist 
        ? "Enrolled subjects updated successfully" 
        : "Enrolled subjects saved successfully",
      action: recordsExist ? "updated" : "inserted",
    });
  } catch (error: any) {
    console.error("Error saving enrolled subjects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save enrolled subjects" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/enrolled-subjects
 * Fetch enrolled subjects for a student
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentNumber = searchParams.get("studentNumber");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!studentNumber || !academicYear || !semester) {
      return NextResponse.json(
        { error: "studentNumber, academicYear, and semester are required" },
        { status: 400 }
      );
    }

    const semesterNum = parseInt(semester);
    if (semesterNum !== 1 && semesterNum !== 2) {
      return NextResponse.json(
        { error: "semester must be 1 or 2" },
        { status: 400 }
      );
    }

    // Fetch enrolled subjects with prerequisite resolution
    // The prerequisite field in curriculum_course stores JSON like {"subjectIds":[28]}
    const enrolledSubjects = await prisma.$queryRaw<any[]>`
      SELECT 
        es.*,
        cc.course_code,
        cc.descriptive_title,
        cc.units_lec,
        cc.units_lab,
        cc.lecture_hour,
        cc.lab_hour,
        cc.prerequisite,
        cc.year_level as curriculum_year_level
      FROM enrolled_subjects es
      LEFT JOIN curriculum_course cc ON es.curriculum_course_id = cc.id
      WHERE es.student_number = ${studentNumber}
        AND es.academic_year = ${academicYear}
        AND es.semester = ${semesterNum}
      ORDER BY cc.course_code
    `;

    // Process prerequisites: parse JSON and fetch subject codes
    const formattedSubjects = await Promise.all(
      enrolledSubjects.map(async (es: any) => {
        let prerequisiteText = null;

        if (es.prerequisite) {
          try {
            // Try to parse as JSON e.g. {"subjectIds":[28]}
            const prereqData = JSON.parse(es.prerequisite);

            if (
              prereqData &&
              Array.isArray(prereqData.subjectIds) &&
              prereqData.subjectIds.length > 0
            ) {
              const subjectIds = prereqData.subjectIds;

              const subjects = await prisma.$queryRaw<any[]>`
                SELECT code FROM subject WHERE id = ANY(${subjectIds}::int[])
              `;

              if (subjects.length > 0) {
                prerequisiteText = subjects.map((s) => s.code).join(", ");
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
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: formattedSubjects,
    });
  } catch (error: any) {
    console.error("Error fetching enrolled subjects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch enrolled subjects" },
      { status: 500 }
    );
  }
}

