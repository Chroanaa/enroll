import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { insertIntoReports } from "../../../utils/reportsUtils";

function roundToTwo(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function normalizeDiscountPercent(rawPercent: number, rawDiscountAmount: number, rawGross: number) {
  if (Number.isFinite(rawPercent) && rawPercent > 0) {
    return rawPercent > 1 ? Math.min(100, rawPercent) : Math.min(100, rawPercent * 100);
  }

  if (Number.isFinite(rawDiscountAmount) && Number.isFinite(rawGross) && rawGross > 0) {
    return Math.min(100, Math.max(0, (rawDiscountAmount / rawGross) * 100));
  }

  return 0;
}

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
        sa.payment_mode,
        CASE
          WHEN LOWER(COALESCE(sa.payment_mode, 'cash')) = 'installment'
            THEN COALESCE(CAST(sa.total_due_installment AS NUMERIC), CAST(sa.total_due AS NUMERIC), 0)
          ELSE COALESCE(CAST(sa.total_due_cash AS NUMERIC), CAST(sa.total_due AS NUMERIC), 0)
        END AS current_total_due,
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
    const processedByName = String(session?.user?.name || "System");

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

    if (String(existing.status || "").toLowerCase() !== "dropped") {
      return NextResponse.json(
        { error: "Only approved dropped subjects can be refunded." },
        { status: 409 },
      );
    }

    const refundComputationRows = await prisma.$queryRaw<any[]>`
      SELECT
        sdh.student_number,
        sdh.academic_year,
        sdh.semester,
        COALESCE(cc.units_lec, sub.units_lec, 0) AS units_lec,
        COALESCE(cc.units_lab, sub.units_lab, 0) AS units_lab,
        COALESCE(CAST(cc."fixedAmount" AS NUMERIC), CAST(sub."fixedAmount" AS NUMERIC), 0) AS fixed_amount,
        COALESCE(CAST(cur.tuition_fee_per_unit AS NUMERIC), 0) AS tuition_per_unit,
        COALESCE(CAST(sa.discount_percent AS NUMERIC), 0) AS discount_percent,
        COALESCE(CAST(sa.discount_amount AS NUMERIC), 0) AS discount_amount,
        COALESCE(CAST(sa.gross_tuition AS NUMERIC), 0) AS gross_tuition
      FROM subject_drop_history sdh
      LEFT JOIN curriculum_course cc ON cc.id = sdh.curriculum_course_id
      LEFT JOIN subject sub ON sub.id = sdh.subject_id
      LEFT JOIN curriculum cur ON cur.id = cc.curriculum_id
      LEFT JOIN student_assessment sa
        ON sa.student_number = sdh.student_number
       AND sa.academic_year = sdh.academic_year
       AND sa.semester = sdh.semester
      WHERE sdh.id = ${id}
      LIMIT 1
    `;

    const refundRow = refundComputationRows[0];
    if (!refundRow) {
      return NextResponse.json({ error: "Refund record context not found." }, { status: 404 });
    }

    const fixedAmount = Number(refundRow.fixed_amount || 0);
    const unitsLec = Number(refundRow.units_lec || 0);
    const unitsLab = Number(refundRow.units_lab || 0);
    const tuitionPerUnit = Number(refundRow.tuition_per_unit || 0);
    const lectureBase = roundToTwo(unitsLec * tuitionPerUnit);
    const labAmount = roundToTwo(unitsLab * 1000);
    const discountPercent = normalizeDiscountPercent(
      Number(refundRow.discount_percent || 0),
      Number(refundRow.discount_amount || 0),
      Number(refundRow.gross_tuition || 0),
    );
    const lectureAfterDiscount = roundToTwo(lectureBase * (1 - discountPercent / 100));
    const refundAmount = fixedAmount > 0 ? roundToTwo(fixedAmount) : roundToTwo(lectureAfterDiscount + labAmount);

    await prisma.$transaction(async (tx) => {
      await tx.subject_drop_history.update({
        where: { id },
        data: { refundable: false },
      });

      const assessment = await tx.student_assessment.findUnique({
        where: {
          student_number_academic_year_semester: {
            student_number: String(refundRow.student_number),
            academic_year: String(refundRow.academic_year),
            semester: Number(refundRow.semester),
          },
        },
      });

      if (assessment && refundAmount > 0) {
        const paymentAggregate = await tx.student_payment.aggregate({
          where: { assessment_id: assessment.id },
          _sum: { amount_paid: true },
        });
        const totalPaidBefore = Number(paymentAggregate._sum.amount_paid || 0);

        const baseTotal = Number(assessment.base_total || 0);
        const totalDue = Number(assessment.total_due || 0);
        const totalDueCash = assessment.total_due_cash != null ? Number(assessment.total_due_cash) : null;
        const totalDueInstallment =
          assessment.total_due_installment != null ? Number(assessment.total_due_installment) : null;

        const nextBaseTotal = roundToTwo(Math.max(0, baseTotal - refundAmount));
        const nextTotalDue = roundToTwo(Math.max(0, totalDue - refundAmount));

        const paymentMode = String(assessment.payment_mode || "").toLowerCase();
        const nextTotalDueCash =
          paymentMode === "cash"
            ? roundToTwo(Math.max(0, (totalDueCash ?? totalDue) - refundAmount))
            : totalDueCash;
        const nextTotalDueInstallment =
          paymentMode === "installment"
            ? roundToTwo(Math.max(0, (totalDueInstallment ?? totalDue) - refundAmount))
            : totalDueInstallment;
        const nextDueForMode =
          paymentMode === "installment"
            ? Number(nextTotalDueInstallment ?? nextTotalDue)
            : Number(nextTotalDueCash ?? nextTotalDue);
        let totalPaidAfter = totalPaidBefore;
        let refundReferenceNo: string | null = null;

        await tx.student_assessment.update({
          where: { id: assessment.id },
          data: {
            base_total: nextBaseTotal,
            total_due: nextTotalDue,
            total_due_cash: nextTotalDueCash,
            total_due_installment: nextTotalDueInstallment,
          },
        });

        // Only record cash-out refund if student becomes overpaid after due reduction.
        // For unpaid/partial students, no payout is made; due is simply reduced.
        const refundPayoutAmount = roundToTwo(Math.max(0, totalPaidBefore - nextDueForMode));
        if (refundPayoutAmount > 0) {
          refundReferenceNo = `REFUND-SDH-${id}`;
          totalPaidAfter = roundToTwo(totalPaidBefore - refundPayoutAmount);
          await tx.student_payment.create({
            data: {
              assessment_id: assessment.id,
              amount_paid: -refundPayoutAmount,
              payment_type: "refund",
              payment_date: new Date(),
              reference_no: refundReferenceNo,
            },
          });
        }

        await tx.$executeRaw`
          INSERT INTO refund_transactions (
            subject_drop_history_id,
            assessment_id,
            student_number,
            academic_year,
            semester,
            course_code,
            descriptive_title,
            refund_amount,
            payout_amount,
            total_due_before,
            total_due_after,
            base_total_before,
            base_total_after,
            total_paid_before,
            total_paid_after,
            payment_mode,
            drop_reason,
            refund_reason,
            processed_by,
            processed_by_name,
            reference_no
          ) VALUES (
            ${id},
            ${assessment.id},
            ${String(refundRow.student_number)},
            ${String(refundRow.academic_year)},
            ${Number(refundRow.semester)},
            ${existing.course_code || null},
            ${existing.descriptive_title || null},
            ${refundAmount},
            ${refundPayoutAmount},
            ${totalDue},
            ${nextDueForMode},
            ${baseTotal},
            ${nextBaseTotal},
            ${totalPaidBefore},
            ${totalPaidAfter},
            ${assessment.payment_mode || null},
            ${existing.drop_reason || null},
            ${existing.drop_reason || null},
            ${Number.isFinite(userId) && userId > 0 ? userId : null},
            ${processedByName},
            ${refundReferenceNo}
          )
        `;
      } else {
        await tx.$executeRaw`
          INSERT INTO refund_transactions (
            subject_drop_history_id,
            assessment_id,
            student_number,
            academic_year,
            semester,
            course_code,
            descriptive_title,
            refund_amount,
            payout_amount,
            total_due_before,
            total_due_after,
            base_total_before,
            base_total_after,
            total_paid_before,
            total_paid_after,
            payment_mode,
            drop_reason,
            refund_reason,
            processed_by,
            processed_by_name,
            reference_no
          ) VALUES (
            ${id},
            ${null},
            ${String(refundRow.student_number)},
            ${String(refundRow.academic_year)},
            ${Number(refundRow.semester)},
            ${existing.course_code || null},
            ${existing.descriptive_title || null},
            ${refundAmount},
            ${0},
            ${null},
            ${null},
            ${null},
            ${null},
            ${null},
            ${null},
            ${null},
            ${existing.drop_reason || null},
            ${existing.drop_reason || null},
            ${Number.isFinite(userId) && userId > 0 ? userId : null},
            ${processedByName},
            ${null}
          )
        `;
      }
    });

    if (Number.isFinite(userId) && userId > 0) {
      await insertIntoReports({
        action: `Processed subject refund for ${existing.student_number} (${existing.course_code || "N/A"}) amount ${refundAmount.toFixed(2)} by ${session?.user?.name || "System"}`,
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

