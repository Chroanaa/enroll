import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { insertIntoReports } from "../../../utils/reportsUtils";

export async function GET(request: NextRequest) {
  try {
    const query = (request.nextUrl.searchParams.get("query") || "").trim();

    const likeQuery = `%${query}%`;

    const data = await prisma.$queryRaw<any[]>`
      SELECT
        sdh.id,
        sdh.student_number,
        COALESCE(
          NULLIF(
            TRIM(
              CASE
                WHEN e.family_name IS NOT NULL AND TRIM(e.family_name) <> ''
                  THEN CONCAT(
                    e.family_name,
                    ', ',
                    TRIM(CONCAT_WS(' ', e.first_name, e.middle_name))
                  )
                ELSE TRIM(CONCAT_WS(' ', e.first_name, e.middle_name))
              END
            ),
            ''
          ),
          sdh.student_number
        ) AS full_name,
        sdh.academic_year,
        sdh.semester,
        sdh.curriculum_course_id,
        sdh.course_code,
        sdh.descriptive_title,
        sdh.units_total,
        sdh.dropped_at,
        sdh.drop_reason,
        sdh.refundable,
        COALESCE(cc.units_lec, sub.units_lec, 0) AS units_lec,
        COALESCE(cc.units_lab, sub.units_lab, 0) AS units_lab,
        COALESCE(cc."fixedAmount", sub."fixedAmount", 0) AS fixed_amount,
        COALESCE(CAST(cur.tuition_fee_per_unit AS NUMERIC), 0) AS tuition_per_unit,
        ROUND((
          COALESCE(cc.units_lec, sub.units_lec, 0) * COALESCE(CAST(cur.tuition_fee_per_unit AS NUMERIC), 0)
        )::numeric, 2) AS lecture_base_amount,
        ROUND((
          COALESCE(cc.units_lab, sub.units_lab, 0) * 1000
        )::numeric, 2) AS lab_amount,
        ROUND((
          LEAST(
            100,
            GREATEST(
              0,
              CASE
                WHEN COALESCE(
                  CAST(sa.discount_percent AS NUMERIC),
                  CASE
                    WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                      THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                    ELSE 0
                  END,
                  0
                ) > 1
                  THEN COALESCE(
                    CAST(sa.discount_percent AS NUMERIC),
                    CASE
                      WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                        THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                      ELSE 0
                    END,
                    0
                  )
                  ELSE COALESCE(
                    CAST(sa.discount_percent AS NUMERIC),
                    CASE
                      WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                        THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                      ELSE 0
                    END,
                    0
                  ) * 100
              END
            )
          )
        )::numeric, 2) AS effective_discount_percent,
        ROUND((
          (
            COALESCE(cc.units_lec, sub.units_lec, 0) * COALESCE(CAST(cur.tuition_fee_per_unit AS NUMERIC), 0)
          ) * (
            1 - (
              LEAST(
                100,
                GREATEST(
                  0,
                  CASE
                    WHEN COALESCE(
                      CAST(sa.discount_percent AS NUMERIC),
                      CASE
                        WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                          THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                        ELSE 0
                      END,
                      0
                    ) > 1
                      THEN COALESCE(
                        CAST(sa.discount_percent AS NUMERIC),
                        CASE
                          WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                            THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                          ELSE 0
                        END,
                        0
                      )
                      ELSE COALESCE(
                        CAST(sa.discount_percent AS NUMERIC),
                        CASE
                          WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                            THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                          ELSE 0
                        END,
                        0
                      ) * 100
                  END
                )
              )
            ) / 100
          )
        )::numeric, 2) AS lecture_after_discount,
        CASE
          WHEN COALESCE(cc."fixedAmount", sub."fixedAmount", 0) > 0
            THEN COALESCE(cc."fixedAmount", sub."fixedAmount", 0)
          ELSE (
            ROUND((
              (
                COALESCE(cc.units_lec, sub.units_lec, 0) * COALESCE(CAST(cur.tuition_fee_per_unit AS NUMERIC), 0)
              ) * (
                1 - (
                  LEAST(
                    100,
                    GREATEST(
                      0,
                      CASE
                        WHEN COALESCE(
                          CAST(sa.discount_percent AS NUMERIC),
                          CASE
                            WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                              THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                            ELSE 0
                          END,
                          0
                        ) > 1
                          THEN COALESCE(
                            CAST(sa.discount_percent AS NUMERIC),
                            CASE
                              WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                                THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                              ELSE 0
                            END,
                            0
                          )
                          ELSE COALESCE(
                            CAST(sa.discount_percent AS NUMERIC),
                            CASE
                              WHEN COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) > 0
                                THEN (COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) / CAST(sa.gross_tuition AS NUMERIC)) * 100
                              ELSE 0
                            END,
                            0
                          ) * 100
                      END
                    )
                  ) / 100
                )
              )
              + (COALESCE(cc.units_lab, sub.units_lab, 0) * 1000)
            )::numeric, 2)
          )
        END AS refund_amount
      FROM subject_drop_history sdh
      LEFT JOIN LATERAL (
        SELECT
          en.first_name,
          en.middle_name,
          en.family_name
        FROM enrollment en
        WHERE en.student_number = sdh.student_number
        ORDER BY en.id DESC
        LIMIT 1
      ) e ON true
      LEFT JOIN curriculum_course cc ON cc.id = sdh.curriculum_course_id
      LEFT JOIN subject sub ON sub.id = sdh.subject_id
      LEFT JOIN curriculum cur ON cur.id = cc.curriculum_id
      LEFT JOIN student_assessment sa
        ON sa.student_number = sdh.student_number
       AND sa.academic_year = sdh.academic_year
       AND sa.semester = sdh.semester
      WHERE sdh.refundable = true
        AND (
          ${query} = ''
          OR sdh.student_number ILIKE ${likeQuery}
          OR COALESCE(e.first_name, '') ILIKE ${likeQuery}
          OR COALESCE(e.middle_name, '') ILIKE ${likeQuery}
          OR COALESCE(e.family_name, '') ILIKE ${likeQuery}
          OR COALESCE(sdh.course_code, '') ILIKE ${likeQuery}
          OR COALESCE(sdh.descriptive_title, '') ILIKE ${likeQuery}
        )
      ORDER BY sdh.dropped_at DESC, sdh.id DESC
      LIMIT 300
    `;

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch refundable subject drops error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch refundable subject drops." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role || 0);
    const userId = Number((session?.user as any)?.id || 0);

    // Admin, Cashier, Registrar
    if (![1, 2, 4].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const id = Number(body?.id);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const existing = await prisma.subject_drop_history.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Refund record not found." }, { status: 404 });
    }

    if (!existing.refundable) {
      return NextResponse.json(
        { error: "Refund already processed or not refundable." },
        { status: 409 },
      );
    }

    await prisma.subject_drop_history.update({
      where: { id },
      data: { refundable: false },
    });

    if (Number.isFinite(userId) && userId > 0) {
      await insertIntoReports({
        action: `Processed subject refund for ${existing.student_number} (${existing.course_code || "N/A"}) by ${session?.user?.name || "System"}`,
        user_id: userId,
        created_at: new Date(),
      });
    }

    return NextResponse.json(
      { success: true, message: "Refund processed successfully." },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Process refund error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process refund." },
      { status: 500 },
    );
  }
}

