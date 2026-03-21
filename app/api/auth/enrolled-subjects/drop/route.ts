import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import { recalculateAssessmentForTerm } from "../../../../lib/recalculateAssessment";
import { authOptions } from "../../[...nextauth]/authOptions";
import {
  ensureDeanStudentAccess,
  getSessionScope,
} from "@/app/lib/accessScope";
import { insertIntoReports } from "@/app/utils/reportsUtils";

const ROLES = {
  ADMIN: 1,
  CASHIER: 2,
  FACULTY: 3,
  REGISTRAR: 4,
} as const;

async function ensureSubjectDropHistoryAssessmentAdjustedColumn() {
  await prisma.$executeRawUnsafe(
    "ALTER TABLE subject_drop_history ADD COLUMN IF NOT EXISTS assessment_adjusted BOOLEAN NOT NULL DEFAULT false",
  );
}

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
    const startMonth = Number.parseInt(
      settingsMap.semester_start_month || "8",
      10,
    );
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
    await ensureSubjectDropHistoryAssessmentAdjustedColumn();

    const session = await getServerSession(authOptions);
    const requesterRoleId = session?.user?.role
      ? Number(session.user.role)
      : null;
    const body = await request.json();
    const { enrolledSubjectId, reason } = body as {
      enrolledSubjectId?: number;
      reason?: string;
    };

    if (!enrolledSubjectId || !Number.isFinite(enrolledSubjectId)) {
      return NextResponse.json(
        { error: "enrolledSubjectId is required" },
        { status: 400 },
      );
    }

    const enrolledSubjectRows = await prisma.$queryRaw<any[]>`
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
        COALESCE(cc.course_code, s.code) AS course_code,
        COALESCE(cc.descriptive_title, s.name) AS descriptive_title
      FROM enrolled_subjects es
      LEFT JOIN curriculum_course cc ON es.curriculum_course_id = cc.id
      LEFT JOIN subject s ON es.subject_id = s.id
      WHERE es.id = ${enrolledSubjectId}
      LIMIT 1
    `;

    const enrolledSubject = enrolledSubjectRows[0];

    if (!enrolledSubject) {
      return NextResponse.json(
        { error: "Enrolled subject not found" },
        { status: 404 },
      );
    }

    const scope = await getSessionScope();
    const access = await ensureDeanStudentAccess(scope, {
      studentNumber: enrolledSubject.student_number,
      academicYear: enrolledSubject.academic_year,
      semester: enrolledSubject.semester,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access });
    }

    if (
      String(enrolledSubject.drop_status || "").toLowerCase() ===
      "pending_approval"
    ) {
      return NextResponse.json(
        { error: "This subject drop is already pending approval." },
        { status: 409 },
      );
    }

    const hasDirectDropApproval = requesterRoleId === ROLES.ADMIN;

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
      enrolledSubject.academic_year,
      enrolledSubject.semester,
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
    const droppedBy = session?.user?.id ? Number(session.user.id) : null;
    const dropStatus = hasDirectDropApproval ? "dropped" : "pending_approval";

    await prisma.$transaction(async (tx) => {
      const insertedDropRows = await tx.$queryRaw<{ id: number }[]>`
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
          ${enrolledSubject.id},
          ${enrolledSubject.student_number},
          ${enrolledSubject.program_id},
          ${enrolledSubject.curriculum_course_id},
          ${enrolledSubject.subject_id},
          ${enrolledSubject.academic_year},
          ${enrolledSubject.semester},
          ${enrolledSubject.term},
          ${enrolledSubject.year_level},
          ${enrolledSubject.units_total},
          ${dropStatus},
          ${enrolledSubject.course_code},
          ${enrolledSubject.descriptive_title},
          ${droppedAt},
          ${droppedBy},
          ${reason || null},
          ${refundable},
          ${Number.isNaN(refundableDays) ? 15 : refundableDays},
          ${semesterStartDate},
          ${refundDeadline}
        )
        RETURNING id
      `;
      const insertedDropId = Number(insertedDropRows[0]?.id || 0);

      if (hasDirectDropApproval) {
        const semesterAliases = getSemesterAliases(enrolledSubject.semester);

        await tx.$executeRaw`
          DELETE FROM enrolled_subjects
          WHERE id = ${enrolledSubjectId}
        `;

        await tx.$executeRaw`
          DELETE FROM student_section_subjects sss
          USING student_section ss, class_schedule cs
          WHERE sss.student_section_id = ss.id
            AND sss.class_schedule_id = cs.id
            AND ss.student_number = ${enrolledSubject.student_number}
            AND ss.academic_year = ${enrolledSubject.academic_year}
            AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(semesterAliases)})
            AND cs.curriculum_course_id = ${enrolledSubject.curriculum_course_id}
        `;

        if (refundable) {
          await recalculateAssessmentForTerm(
            tx,
            enrolledSubject.student_number,
            enrolledSubject.academic_year,
            enrolledSubject.semester,
          );

          if (insertedDropId > 0) {
            await tx.$executeRaw`
              UPDATE subject_drop_history
              SET assessment_adjusted = true
              WHERE id = ${insertedDropId}
            `;
          }
        }

        const remainingRows = await tx.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint AS count
          FROM enrolled_subjects
          WHERE student_number = ${enrolledSubject.student_number}
            AND academic_year = ${enrolledSubject.academic_year}
            AND semester = ${enrolledSubject.semester}
        `;

        const remainingCount = Number(remainingRows[0]?.count || 0);

        // If student has no remaining subjects for the term, mark enrollment as dropped.
        if (remainingCount === 0) {
          // Ensure no orphan student_section_subject links remain for this term.
          await tx.$executeRaw`
            DELETE FROM student_section_subjects sss
            USING student_section ss
            WHERE sss.student_section_id = ss.id
              AND ss.student_number = ${enrolledSubject.student_number}
              AND ss.academic_year = ${enrolledSubject.academic_year}
              AND LOWER(COALESCE(ss.semester, '')) IN (${Prisma.join(semesterAliases)})
          `;

          await tx.$executeRaw`
            UPDATE enrollment
            SET status = 3
            WHERE student_number = ${enrolledSubject.student_number}
              AND academic_year = ${enrolledSubject.academic_year}
              AND (
                LOWER(COALESCE(term, '')) = CASE
                  WHEN ${enrolledSubject.semester} = 1 THEN 'first'
                  ELSE 'second'
                END
                OR LOWER(COALESCE(term, '')) = CASE
                  WHEN ${enrolledSubject.semester} = 1 THEN 'first semester'
                  ELSE 'second semester'
                END
              )
          `;
        }
      } else {
        await tx.$executeRaw`
          UPDATE enrolled_subjects
          SET drop_status = 'pending_approval', updated_at = ${droppedAt}
          WHERE id = ${enrolledSubjectId}
        `;
      }
    });

    if (droppedBy) {
      await insertIntoReports({
        action: hasDirectDropApproval
          ? `Dropped subject ${enrolledSubject.course_code} for ${enrolledSubject.student_number}${refundable ? " (refundable)" : " (non-refundable)"} by ${session?.user?.name}`
          : `Requested drop approval for subject ${enrolledSubject.course_code} for ${enrolledSubject.student_number} by ${session?.user?.name}`,
        user_id: droppedBy,
        created_at: droppedAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: hasDirectDropApproval
        ? refundable
          ? `Subject dropped successfully. This drop is refundable within the ${refundableDays}-day window.`
          : `Subject dropped successfully. This drop is no longer refundable because it is beyond the ${refundableDays}-day window.`
        : "Subject drop request submitted for approval.",
      data: {
        status: dropStatus,
        requiresApproval: !hasDirectDropApproval,
        refundable,
        refundableDays: Number.isNaN(refundableDays) ? 15 : refundableDays,
        semesterStartDate: semesterStartDate?.toISOString() || null,
        refundDeadline: refundDeadline?.toISOString() || null,
        droppedAt: droppedAt.toISOString(),
        courseCode: enrolledSubject.course_code,
        descriptiveTitle: enrolledSubject.descriptive_title,
      },
    });
  } catch (error: any) {
    console.error("Error dropping enrolled subject:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to drop subject" },
      { status: 500 },
    );
  }
}
