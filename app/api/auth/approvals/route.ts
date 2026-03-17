import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";
import { insertIntoReports } from "../../../utils/reportsUtils";

const ROLES = {
  ADMIN: 1,
} as const;

interface ApprovalSubjectItem {
  course_code: string | null;
  descriptive_title: string | null;
  units_total: number | null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role) || 0;

    if (userRole !== ROLES.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized to view approvals." },
        { status: 403 },
      );
    }

    const [subjectOverloads, subjectDrops] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT
          es.student_number,
          es.academic_year,
          es.semester,
          COUNT(*)::int AS subject_count,
          COALESCE(SUM(es.units_total), 0)::int AS total_units,
          enr.first_name,
          enr.family_name AS last_name,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'course_code', COALESCE(cc.course_code, sub.code),
                'descriptive_title', COALESCE(cc.descriptive_title, sub.name),
                'units_total', es.units_total
              )
              ORDER BY COALESCE(cc.course_code, sub.code)
            ),
            '[]'::json
          ) AS subjects
        FROM enrolled_subjects es
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = es.student_number
            AND e.academic_year = es.academic_year
            AND (
              (es.semester = 1 AND e.term IN ('First Semester', '1st Semester', 'first', '1'))
              OR
              (es.semester = 2 AND e.term IN ('Second Semester', '2nd Semester', 'second', '2'))
            )
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        LEFT JOIN curriculum_course cc ON cc.id = es.curriculum_course_id
        LEFT JOIN subject sub ON sub.id = es.subject_id
        WHERE es.status = 'pending'
        GROUP BY es.student_number, es.academic_year, es.semester, enr.family_name, enr.first_name, enr.middle_name
        ORDER BY es.academic_year DESC, es.semester DESC, es.student_number ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          es.id,
          es.student_number,
          es.academic_year,
          es.semester,
          es.drop_status,
          enr.first_name,
          enr.family_name AS last_name,
          COALESCE(cc.course_code, sub.code) AS course_code,
          COALESCE(cc.descriptive_title, sub.name) AS descriptive_title,
          CONCAT_WS(', ', enr.family_name, enr.first_name, enr.middle_name) AS student_name,
          es.updated_at,
          sdh.drop_reason
        FROM enrolled_subjects es
        LEFT JOIN curriculum_course cc ON cc.id = es.curriculum_course_id
        LEFT JOIN subject sub ON sub.id = es.subject_id
        LEFT JOIN LATERAL (
          SELECT e.first_name, e.middle_name, e.family_name
          FROM enrollment e
          WHERE e.student_number = es.student_number
            AND e.academic_year = es.academic_year
            AND (
              (es.semester = 1 AND e.term IN ('First Semester', '1st Semester', 'first', '1'))
              OR
              (es.semester = 2 AND e.term IN ('Second Semester', '2nd Semester', 'second', '2'))
            )
          ORDER BY e.id DESC
          LIMIT 1
        ) enr ON TRUE
        LEFT JOIN LATERAL (
          SELECT drop_reason
          FROM subject_drop_history
          WHERE enrolled_subject_id = es.id
            AND status = 'pending_approval'
          ORDER BY dropped_at DESC, id DESC
          LIMIT 1
        ) sdh ON TRUE
        WHERE es.drop_status = 'pending_approval'
        ORDER BY es.updated_at DESC NULLS LAST, es.student_number ASC
      `,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subjectOverloads: subjectOverloads.map((item) => ({
          studentNumber: item.student_number,
          studentName: item.student_name || item.student_number,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          academicYear: item.academic_year,
          semester: item.semester,
          subjectCount: item.subject_count,
          totalUnits: item.total_units,
          status: "pending",
          subjects: Array.isArray(item.subjects) ? item.subjects : [],
        })),
        subjectDrops: subjectDrops.map((item) => ({
          id: item.id,
          studentNumber: item.student_number,
          studentName: item.student_name || item.student_number,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          academicYear: item.academic_year,
          semester: item.semester,
          courseCode: item.course_code,
          descriptiveTitle: item.descriptive_title,
          status: item.drop_status,
          requestedAt: item.updated_at,
          reason: item.drop_reason,
          subjects: [
            {
              courseCode: item.course_code,
              descriptiveTitle: item.descriptive_title,
              unitsTotal: null,
            },
          ],
        })),
        shiftingRequests: [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch approvals." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role) || 0;
    const userId = Number((session?.user as any)?.id) || null;

    if (userRole !== ROLES.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized to manage approvals." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const actionType = String(body?.type || "");

    if (actionType === "overload") {
      const studentNumber = String(body?.studentNumber || "");
      const academicYear = String(body?.academicYear || "");
      const semester = Number(body?.semester);

      if (!studentNumber || !academicYear || !Number.isFinite(semester)) {
        return NextResponse.json(
          { error: "studentNumber, academicYear, and semester are required." },
          { status: 400 },
        );
      }

      const updatedRows = await prisma.$executeRaw`
        UPDATE enrolled_subjects
        SET status = 'enrolled', updated_at = NOW()
        WHERE student_number = ${studentNumber}
          AND academic_year = ${academicYear}
          AND semester = ${semester}
          AND status = 'pending'
      `;

      if (!updatedRows) {
        return NextResponse.json(
          { error: "No pending overload approval was found." },
          { status: 404 },
        );
      }

      if (userId) {
        await insertIntoReports({
          action: `Approved overload enrollment request for ${studentNumber} (${academicYear} Sem ${semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Overload request approved successfully.",
      });
    }

    if (actionType === "drop") {
      const enrolledSubjectId = Number(body?.id);

      if (!Number.isFinite(enrolledSubjectId)) {
        return NextResponse.json(
          { error: "id is required for drop approval." },
          { status: 400 },
        );
      }

      const subjectRows = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          student_number,
          academic_year,
          semester,
          drop_status
        FROM enrolled_subjects
        WHERE id = ${enrolledSubjectId}
        LIMIT 1
      `;

      const subject = subjectRows[0];

      if (!subject) {
        return NextResponse.json(
          { error: "Pending subject drop not found." },
          { status: 404 },
        );
      }

      if (String(subject.drop_status || "").toLowerCase() !== "pending_approval") {
        return NextResponse.json(
          { error: "This subject drop is no longer pending approval." },
          { status: 409 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE subject_drop_history
          SET status = 'dropped'
          WHERE enrolled_subject_id = ${enrolledSubjectId}
            AND status = 'pending_approval'
        `;

        await tx.$executeRaw`
          DELETE FROM enrolled_subjects
          WHERE id = ${enrolledSubjectId}
        `;
      });

      if (userId) {
        await insertIntoReports({
          action: `Approved subject drop request for ${subject.student_number} (${subject.academic_year} Sem ${subject.semester}) by ${session?.user?.name}`,
          user_id: userId,
          created_at: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Subject drop approved successfully.",
      });
    }

    return NextResponse.json(
      { error: "Unsupported approval type." },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process approval." },
      { status: 500 },
    );
  }
}
