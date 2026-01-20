import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/**
 * POST /api/auth/enrolled-subjects
 * Save or update enrolled subjects for a student
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

    // Delete existing enrolled subjects for this student and term
    await prisma.$executeRaw`
      DELETE FROM enrolled_subjects 
      WHERE student_number = ${studentNumber} 
      AND academic_year = ${academicYear} 
      AND semester = ${semesterNum}
    `;

    // Insert new enrolled subjects
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

      // Use raw SQL for bulk insert (Prisma doesn't support bulk insert easily)
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
      message: "Enrolled subjects saved successfully",
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

    // Fetch enrolled subjects
    const enrolledSubjects = await prisma.$queryRaw<any[]>`
      SELECT 
        es.*,
        cc.course_code,
        cc.descriptive_title,
        cc.units_lec,
        cc.units_lab,
        cc.lecture_hour,
        cc.lab_hour,
        cc.year_level as curriculum_year_level
      FROM enrolled_subjects es
      LEFT JOIN curriculum_course cc ON es.curriculum_course_id = cc.id
      WHERE es.student_number = ${studentNumber}
        AND es.academic_year = ${academicYear}
        AND es.semester = ${semesterNum}
      ORDER BY cc.course_code
    `;

    // Transform the data to match the expected format
    const formattedSubjects = enrolledSubjects.map((es: any) => ({
      id: es.curriculum_course_id || es.id,
      curriculum_course_id: es.curriculum_course_id,
      subject_id: es.subject_id,
      course_code: es.course_code,
      descriptive_title: es.descriptive_title,
      units_lec: es.units_lec || 0,
      units_lab: es.units_lab || 0,
      units_total: es.units_total || es.units_lec + es.units_lab || 0,
      lecture_hour: es.lecture_hour || 0,
      lab_hour: es.lab_hour || 0,
      year_level: es.curriculum_year_level || es.year_level,
      semester: es.semester,
    }));

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

