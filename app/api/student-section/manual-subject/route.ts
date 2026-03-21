import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  ensureDeanStudentAccess,
  getSessionScope,
} from "@/app/lib/accessScope";

const normalizeSemester = (value: string) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
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
  return null;
};

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    const { searchParams } = new URL(request.url);
    const studentNumber = String(
      searchParams.get("studentNumber") || "",
    ).trim();
    const academicYear = String(searchParams.get("academicYear") || "").trim();
    const semesterRaw = String(searchParams.get("semester") || "").trim();
    const selectedClassScheduleIdRaw = searchParams.get(
      "selectedClassScheduleId",
    );
    const normalizedSemester = normalizeSemester(semesterRaw);

    if (!studentNumber || !academicYear || !normalizedSemester) {
      return NextResponse.json(
        { error: "studentNumber, academicYear, and semester are required." },
        { status: 400 },
      );
    }

    const access = await ensureDeanStudentAccess(scope, {
      studentNumber,
      academicYear,
      semester: normalizedSemester,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access });
    }

    const assignment = await prisma.student_section.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: normalizedSemester,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Student section assignment not found for this term." },
        { status: 404 },
      );
    }

    const studentSubjects = await prisma.$queryRaw<any[]>`
      SELECT
        sss.id AS student_section_subject_id,
        sss.class_schedule_id,
        cs.section_id,
        sec.section_name,
        COALESCE(cc.course_code, sub.code) AS course_code,
        COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.curriculum_course_id
      FROM student_section_subjects sss
      JOIN class_schedule cs ON cs.id = sss.class_schedule_id
      LEFT JOIN sections sec ON sec.id = cs.section_id
      LEFT JOIN curriculum_course cc ON cc.id = cs.curriculum_course_id
      LEFT JOIN subject sub ON sub.id = cc.subject_id
      WHERE sss.student_section_id = ${assignment.id}
      ORDER BY COALESCE(cc.course_code, sub.code), cs.day_of_week, cs.start_time
    `;

    if (!selectedClassScheduleIdRaw) {
      return NextResponse.json({
        success: true,
        data: {
          studentSectionId: assignment.id,
          sectionId: assignment.section_id,
          subjects: studentSubjects,
          alternatives: [],
        },
      });
    }

    const selectedClassScheduleId = Number.parseInt(
      String(selectedClassScheduleIdRaw),
      10,
    );
    if (!Number.isFinite(selectedClassScheduleId)) {
      return NextResponse.json(
        { error: "selectedClassScheduleId must be a valid number." },
        { status: 400 },
      );
    }

    const selectedRow = studentSubjects.find(
      (item) => Number(item.class_schedule_id) === selectedClassScheduleId,
    );
    if (!selectedRow) {
      return NextResponse.json(
        { error: "Selected subject schedule is not assigned to this student." },
        { status: 404 },
      );
    }

    const alternatives = await prisma.$queryRaw<any[]>`
      SELECT
        cs.id AS class_schedule_id,
        cs.section_id,
        sec.section_name,
        COALESCE(cc.course_code, sub.code) AS course_code,
        COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
        cs.day_of_week,
        cs.start_time,
        cs.end_time
      FROM class_schedule cs
      JOIN sections sec ON sec.id = cs.section_id
      JOIN program prog ON prog.id = sec.program_id
      LEFT JOIN curriculum_course cc ON cc.id = cs.curriculum_course_id
      LEFT JOIN subject sub ON sub.id = cc.subject_id
      WHERE cs.curriculum_course_id = ${selectedRow.curriculum_course_id}
        AND cs.status = 'active'
        AND sec.status = 'active'
        AND sec.academic_year = ${academicYear}
        AND sec.semester = ${normalizedSemester}
        AND cs.section_id <> ${selectedRow.section_id}
        AND (${scope?.isDean ? scope.deanDepartmentId : null}::int IS NULL OR prog.department_id = ${scope?.deanDepartmentId ?? null})
      ORDER BY sec.section_name ASC, cs.day_of_week ASC, cs.start_time ASC
    `;

    return NextResponse.json({
      success: true,
      data: {
        studentSectionId: assignment.id,
        sectionId: assignment.section_id,
        subjects: studentSubjects,
        alternatives,
      },
    });
  } catch (error: any) {
    console.error("Error loading manual subject transfer data:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to load manual subject transfer data.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    const body = await request.json();

    const studentNumber = String(body?.studentNumber || "").trim();
    const academicYear = String(body?.academicYear || "").trim();
    const normalizedSemester = normalizeSemester(String(body?.semester || ""));
    const studentSectionSubjectId = Number.parseInt(
      String(body?.studentSectionSubjectId || ""),
      10,
    );
    const toClassScheduleId = Number.parseInt(
      String(body?.toClassScheduleId || ""),
      10,
    );

    if (
      !studentNumber ||
      !academicYear ||
      !normalizedSemester ||
      !Number.isFinite(studentSectionSubjectId) ||
      !Number.isFinite(toClassScheduleId)
    ) {
      return NextResponse.json(
        {
          error:
            "studentNumber, academicYear, semester, studentSectionSubjectId, and toClassScheduleId are required.",
        },
        { status: 400 },
      );
    }

    const access = await ensureDeanStudentAccess(scope, {
      studentNumber,
      academicYear,
      semester: normalizedSemester,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access });
    }

    const assignment = await prisma.student_section.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: studentNumber,
          academic_year: academicYear,
          semester: normalizedSemester,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Student section assignment not found for this term." },
        { status: 404 },
      );
    }

    const currentRows = await prisma.$queryRaw<any[]>`
      SELECT
        sss.id,
        sss.student_section_id,
        sss.class_schedule_id,
        cs.curriculum_course_id
      FROM student_section_subjects sss
      JOIN class_schedule cs ON cs.id = sss.class_schedule_id
      WHERE sss.id = ${studentSectionSubjectId}
        AND sss.student_section_id = ${assignment.id}
      LIMIT 1
    `;
    const current = currentRows[0];

    if (!current) {
      return NextResponse.json(
        {
          error:
            "Selected student section subject is not valid for this student.",
        },
        { status: 404 },
      );
    }

    if (Number(current.class_schedule_id) === toClassScheduleId) {
      return NextResponse.json(
        { error: "Selected schedule is already assigned to this subject." },
        { status: 400 },
      );
    }

    const targetRows = await prisma.$queryRaw<any[]>`
      SELECT
        cs.id,
        cs.section_id,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.curriculum_course_id
      FROM class_schedule cs
      JOIN sections sec ON sec.id = cs.section_id
      JOIN program prog ON prog.id = sec.program_id
      WHERE cs.id = ${toClassScheduleId}
        AND cs.status = 'active'
        AND sec.status = 'active'
        AND sec.academic_year = ${academicYear}
        AND sec.semester = ${normalizedSemester}
        AND (${scope?.isDean ? scope.deanDepartmentId : null}::int IS NULL OR prog.department_id = ${scope?.deanDepartmentId ?? null})
      LIMIT 1
    `;
    const target = targetRows[0];

    if (!target) {
      return NextResponse.json(
        {
          error: "Selected destination schedule was not found or is inactive.",
        },
        { status: 404 },
      );
    }

    if (
      Number(target.curriculum_course_id) !==
      Number(current.curriculum_course_id)
    ) {
      return NextResponse.json(
        { error: "Destination schedule must be the same subject." },
        { status: 400 },
      );
    }

    const duplicateRows = await prisma.$queryRaw<any[]>`
      SELECT id
      FROM student_section_subjects
      WHERE student_section_id = ${assignment.id}
        AND class_schedule_id = ${toClassScheduleId}
        AND id <> ${studentSectionSubjectId}
      LIMIT 1
    `;
    if (duplicateRows.length > 0) {
      return NextResponse.json(
        { error: "Student already has this destination schedule assigned." },
        { status: 409 },
      );
    }

    const conflictRows = await prisma.$queryRaw<any[]>`
      SELECT sss.id
      FROM student_section_subjects sss
      JOIN class_schedule cs ON cs.id = sss.class_schedule_id
      WHERE sss.student_section_id = ${assignment.id}
        AND sss.id <> ${studentSectionSubjectId}
        AND cs.day_of_week = ${target.day_of_week}
        AND cs.start_time < ${target.end_time}
        AND cs.end_time > ${target.start_time}
      LIMIT 1
    `;
    if (conflictRows.length > 0) {
      return NextResponse.json(
        {
          error:
            "Destination schedule conflicts with student's existing schedule.",
        },
        { status: 409 },
      );
    }

    await prisma.student_section_subjects.update({
      where: { id: studentSectionSubjectId },
      data: { class_schedule_id: toClassScheduleId },
    });

    return NextResponse.json({
      success: true,
      message: "Subject schedule transferred successfully.",
      data: {
        studentSectionId: assignment.id,
        studentSectionSubjectId,
        toClassScheduleId,
      },
    });
  } catch (error: any) {
    console.error("Error transferring subject schedule:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to transfer subject schedule." },
      { status: 500 },
    );
  }
}
