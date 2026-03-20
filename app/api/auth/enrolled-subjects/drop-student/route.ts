import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { recalculateAssessmentForTerm } from "@/app/lib/recalculateAssessment";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { insertIntoReports } from "@/app/utils/reportsUtils";

const ROLES = {
  ADMIN: 1,
  REGISTRAR: 4,
  DEAN: 5,
} as const;

function parseAcademicYearStart(academicYear: string): number | null {
  const startYear = Number.parseInt(String(academicYear).split("-")[0], 10);
  return Number.isNaN(startYear) ? null : startYear;
}

function getSemesterStartDate(
  academicYear: string,
  semester: number,
  settingsMap: Record<string, string>,
) {
  const academicYearStart = parseAcademicYearStart(academicYear);

  if (academicYearStart === null) {
    return null;
  }

  if (semester === 1) {
    const startMonth = Number.parseInt(settingsMap.semester_start_month || "8", 10);
    const startDay = Number.parseInt(settingsMap.semester_start_day || "1", 10);
    return new Date(academicYearStart, startMonth - 1, startDay);
  }

  if (semester === 2) {
    const startMonth = Number.parseInt(
      settingsMap.second_semester_start_month || "1",
      10,
    );
    const startDay = Number.parseInt(
      settingsMap.second_semester_start_day || "12",
      10,
    );
    return new Date(academicYearStart + 1, startMonth - 1, startDay);
  }

  return null;
}

function getSemesterAliases(semester: number): string[] {
  if (semester === 1) {
    return ["first", "first semester", "1", "1st semester"];
  }
  if (semester === 2) {
    return ["second", "second semester", "2", "2nd semester"];
  }
  if (semester === 3) {
    return ["third", "third semester", "3", "3rd semester", "summer"];
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const requesterRoleId = session?.user?.role
      ? Number(session.user.role)
      : null;
    const requesterId = session?.user?.id ? Number(session.user.id) : null;

    if (
      requesterRoleId !== ROLES.ADMIN &&
      requesterRoleId !== ROLES.REGISTRAR &&
      requesterRoleId !== ROLES.DEAN
    ) {
      return NextResponse.json(
        { error: "Unauthorized to process student dropping." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { studentNumber, academicYear, semester, reason } = body as {
      studentNumber?: string;
      academicYear?: string;
      semester?: number;
      reason?: string;
    };

    if (!studentNumber || !academicYear || !Number.isFinite(Number(semester))) {
      return NextResponse.json(
        { error: "studentNumber, academicYear, and semester are required." },
        { status: 400 },
      );
    }

    const semesterNum = Number(semester);
    if (semesterNum !== 1 && semesterNum !== 2 && semesterNum !== 3) {
      return NextResponse.json(
        { error: "semester must be 1, 2, or 3." },
        { status: 400 },
      );
    }

    const hasDirectDropApproval =
      requesterRoleId === ROLES.ADMIN || requesterRoleId === ROLES.DEAN;

    const subjectRows = await prisma.$queryRaw<any[]>`
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
        COALESCE(cc.course_code, s.code) AS course_code,
        COALESCE(cc.descriptive_title, s.name) AS descriptive_title
      FROM enrolled_subjects es
      LEFT JOIN curriculum_course cc ON es.curriculum_course_id = cc.id
      LEFT JOIN subject s ON es.subject_id = s.id
      WHERE es.student_number = ${studentNumber}
        AND es.academic_year = ${academicYear}
        AND es.semester = ${semesterNum}
        AND es.status = 'enrolled'
    `;

    if (!Array.isArray(subjectRows) || subjectRows.length === 0) {
      return NextResponse.json(
        { error: "No enrolled subjects found for this student in the selected term." },
        { status: 404 },
      );
    }

    const actionableSubjects = subjectRows.filter(
      (row) => String(row.drop_status || "").toLowerCase() !== "pending_approval",
    );
    const pendingSubjects = subjectRows.length - actionableSubjects.length;

    if (actionableSubjects.length === 0) {
      return NextResponse.json(
        { error: "All enrolled subjects are already pending approval." },
        { status: 409 },
      );
    }

    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: [
            "semester_start_month",
            "semester_start_day",
            "second_semester_start_month",
            "second_semester_start_day",
            "subject_drop_refundable_days",
          ],
        },
      },
    });

    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    const refundableDays = Number.parseInt(
      settingsMap.subject_drop_refundable_days || "15",
      10,
    );

    const serverNowResult = await prisma.$queryRaw<{ now: Date }[]>`
      SELECT NOW() as now
    `;
    const droppedAt = serverNowResult[0]?.now || new Date();

    const semesterStartDate = getSemesterStartDate(
      academicYear,
      semesterNum,
      settingsMap,
    );
    const refundDeadline = semesterStartDate
      ? new Date(
          semesterStartDate.getFullYear(),
          semesterStartDate.getMonth(),
          semesterStartDate.getDate() + refundableDays,
        )
      : null;
    const refundable = refundDeadline ? droppedAt <= refundDeadline : false;
    const dropStatus = hasDirectDropApproval ? "dropped" : "pending_approval";
    const actionableIds = actionableSubjects
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id));

    await prisma.$transaction(async (tx) => {
      for (const row of actionableSubjects) {
        await tx.$executeRaw`
          INSERT INTO subject_drop_history (
            enrolled_subject_id,
            student_number,
            program_id,
            curriculum_course_id,
            subject_id,
            academic_year,
            semester,
            term,
            year_level,
            units_total,
            status,
            course_code,
            descriptive_title,
            dropped_at,
            dropped_by,
            drop_reason,
            refundable,
            refundable_days,
            semester_start_date,
            refund_deadline
          ) VALUES (
            ${row.id},
            ${row.student_number},
            ${row.program_id},
            ${row.curriculum_course_id},
            ${row.subject_id},
            ${row.academic_year},
            ${row.semester},
            ${row.term},
            ${row.year_level},
            ${row.units_total},
            ${dropStatus},
            ${row.course_code},
            ${row.descriptive_title},
            ${droppedAt},
            ${requesterId},
            ${reason || null},
            ${refundable},
            ${Number.isNaN(refundableDays) ? 15 : refundableDays},
            ${semesterStartDate},
            ${refundDeadline}
          )
        `;
      }

      if (hasDirectDropApproval) {
        const semesterAliases = getSemesterAliases(semesterNum);

        if (actionableIds.length > 0) {
          await tx.$executeRaw`
            DELETE FROM enrolled_subjects
            WHERE id IN (${Prisma.join(actionableIds)})
          `;
        }

        // Full student-drop: clear all section-subject links for this term.
        await tx.$executeRaw`
          DELETE FROM student_section_subjects sss
          USING student_section ss
          WHERE sss.student_section_id = ss.id
            AND ss.student_number = ${studentNumber}
            AND ss.academic_year = ${academicYear}
            AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(semesterAliases)})
        `;

        if (refundable) {
          await recalculateAssessmentForTerm(
            tx,
            studentNumber,
            academicYear,
            semesterNum,
          );
        }

        const remainingRows = await tx.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint AS count
          FROM enrolled_subjects
          WHERE student_number = ${studentNumber}
            AND academic_year = ${academicYear}
            AND semester = ${semesterNum}
        `;
        const remainingCount = Number(remainingRows[0]?.count || 0);

        // Keep enrollment status aligned with full student-drop outcome.
        if (remainingCount === 0) {
          await tx.$executeRaw`
            UPDATE enrollment
            SET status = 3
            WHERE student_number = ${studentNumber}
              AND academic_year = ${academicYear}
              AND (
                LOWER(COALESCE(term, '')) = CASE
                  WHEN ${semesterNum} = 1 THEN 'first'
                  WHEN ${semesterNum} = 2 THEN 'second'
                  ELSE 'third'
                END
                OR LOWER(COALESCE(term, '')) = CASE
                  WHEN ${semesterNum} = 1 THEN 'first semester'
                  WHEN ${semesterNum} = 2 THEN 'second semester'
                  ELSE 'third semester'
                END
                OR (${semesterNum} = 3 AND LOWER(COALESCE(term, '')) = 'summer')
              )
          `;
        }
      } else if (actionableIds.length > 0) {
        await tx.$executeRaw`
          UPDATE enrolled_subjects
          SET drop_status = 'pending_approval', updated_at = ${droppedAt}
          WHERE id IN (${Prisma.join(actionableIds)})
        `;
      }
    });

    if (requesterId) {
      await insertIntoReports({
        action: hasDirectDropApproval
          ? `Dropped ${actionableSubjects.length} subject(s) for ${studentNumber} (${academicYear} Sem ${semesterNum}) by ${session?.user?.name}`
          : `Requested student drop approval for ${studentNumber} (${academicYear} Sem ${semesterNum}) with ${actionableSubjects.length} subject(s) by ${session?.user?.name}`,
        user_id: requesterId,
        created_at: droppedAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: hasDirectDropApproval
        ? `Student drop completed for ${actionableSubjects.length} subject(s).`
        : `Student drop request submitted for approval for ${actionableSubjects.length} subject(s).`,
      data: {
        studentNumber,
        academicYear,
        semester: semesterNum,
        status: dropStatus,
        requiresApproval: !hasDirectDropApproval,
        droppedCount: actionableSubjects.length,
        alreadyPendingCount: pendingSubjects,
        refundable,
      },
    });
  } catch (error: any) {
    console.error("Error dropping student subjects:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process student dropping." },
      { status: 500 },
    );
  }
}
