import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "../../../../../lib/prisma";
import { authOptions } from "../../../[...nextauth]/authOptions";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { sendEnrollmentVerifiedEmail } from "@/app/lib/email";

const ALLOWED_ROLES = new Set([1, 4]); // Admin, Registrar
const ALLOWED_VERIFICATION_STATUSES = new Set([
  "pending",
  "approved",
  "rejected",
  "needs_revision",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const roleId = Number((session?.user as any)?.role) || 0;
    const verifierId = Number((session?.user as any)?.id) || null;

    if (!ALLOWED_ROLES.has(roleId)) {
      return NextResponse.json(
        { error: "Unauthorized. Only admin/registrar can verify enrollments." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const enrollmentId = parseInt(id, 10);

    if (!Number.isFinite(enrollmentId)) {
      return NextResponse.json(
        { error: "Invalid enrollment ID." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const verificationStatus = String(body?.verification_status || "").trim();
    const verificationNotes =
      typeof body?.verification_notes === "string"
        ? body.verification_notes.trim()
        : null;

    if (!ALLOWED_VERIFICATION_STATUSES.has(verificationStatus)) {
      return NextResponse.json(
        {
          error:
            "Invalid verification_status. Use pending, approved, rejected, or needs_revision.",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        family_name: true,
        email_address: true,
        verification_status: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Enrollment not found." },
        { status: 404 },
      );
    }

    const shouldStampVerifier = verificationStatus !== "pending";
    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        verification_status: verificationStatus,
        verification_notes: verificationNotes,
        verified_by: shouldStampVerifier ? verifierId : null,
        verified_at: shouldStampVerifier ? new Date() : null,
      },
    });

    const shouldSendApprovalEmail =
      verificationStatus === "approved" &&
      existing.verification_status !== "approved" &&
      Boolean(existing.email_address);

    if (shouldSendApprovalEmail) {
      const paymentUrl = process.env.ENROLLMENT_PAYMENT_URL?.trim() || null;

      try {
        await sendEnrollmentVerifiedEmail({
          to: existing.email_address!,
          studentName:
            `${existing.first_name || ""} ${existing.family_name || ""}`.trim() ||
            "Student",
          studentNumber: existing.student_number,
          paymentUrl,
        });
      } catch (emailError) {
        console.error("Failed to send enrollment verification email:", emailError);
      }
    }

    if (verifierId) {
      const studentName =
        `${existing.first_name || ""} ${existing.family_name || ""}`.trim() ||
        existing.student_number ||
        `enrollment#${existing.id}`;
      await insertIntoReports({
        action: `Updated enrollment verification for ${studentName} from ${existing.verification_status || "pending"} to ${verificationStatus} by ${session?.user?.name || "Unknown User"}`,
        user_id: verifierId,
        created_at: new Date(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Enrollment verification updated successfully.",
        data: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update enrollment verification error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
