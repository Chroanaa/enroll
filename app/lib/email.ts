import nodemailer from "nodemailer";
import { colors } from "../colors";

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

type VerifiedEmailArgs = {
  to: string;
  studentName: string;
  studentNumber?: string | null;
  assessmentUrl?: string | null;
};

type PaymentLinkEmailArgs = {
  to: string;
  studentName: string;
  studentNumber?: string | null;
  paymentLink: string;
  totalAmount: number;
  academicYear?: string | null;
  semester?: string | number | null;
};

type PaymentDecisionEmailArgs = {
  to: string;
  studentName: string;
  status: "approved" | "rejected";
  amount: number;
  paymentMethod: string;
  referenceNo: string;
  remarks?: string | null;
};

type ExternalCrossEnrollmentApprovedEmailArgs = {
  to: string;
  studentName: string;
  studentNumber: string;
  subjectCode: string;
  subjectTitle: string;
  externalSchoolName: string;
  academicYear: string;
  semester: number;
  approvalLetterUrl: string;
};

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function getMailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || user;

  if (!host || !user || !pass || !fromEmail) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    String(process.env.SMTP_SECURE || "").toLowerCase() === "true" ||
    port === 465;

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    user,
    pass,
    fromEmail,
    fromName: process.env.SMTP_FROM_NAME?.trim() || "Enrollment Office",
  };
}

async function getTransporter() {
  const config = getMailConfig();

  if (!config) {
    throw new Error("SMTP email settings are not configured.");
  }

  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        // Avoid long API hangs when outbound SMTP is blocked by network/firewall.
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      }),
    );
  }

  return { transporter: await transporterPromise, config };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEnrollmentVerifiedEmail({
  to,
  studentName,
  studentNumber,
  assessmentUrl,
}: VerifiedEmailArgs) {
  const trimmedTo = String(to || "").trim();
  if (!trimmedTo) {
    throw new Error("Student email address is missing.");
  }

  const { transporter, config } = await getTransporter();
  const safeName = escapeHtml(studentName || "Student");
  const safeStudentNumber = escapeHtml(studentNumber || "N/A");
  const safeAssessmentUrl = assessmentUrl ? escapeHtml(assessmentUrl) : null;
  const primary = colors.primary;
  const secondary = colors.secondary;

  const subject = "Enrollment verified: you may proceed to assessment";
  const textLines = [
    `Hello ${studentName || "Student"},`,
    "",
    "Your enrollment information has been verified successfully.",
    "Your record has already been reviewed by the registrar.",
    "You may now proceed to the assessment step.",
    studentNumber ? `Student Number: ${studentNumber}` : null,
    assessmentUrl ? `Assessment Link: ${assessmentUrl}` : null,
    "",
    "If you have questions, please contact the registrar's office.",
  ].filter(Boolean);

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f7f3ef;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${secondary}33;box-shadow:0 10px 30px rgba(58,35,19,0.08);">
        <div style="background:${primary};padding:20px 28px;border-bottom:4px solid ${secondary};">
          <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.3px;">Enrollment Verification Update</p>
        </div>
        <div style="padding:28px;">
        <p style="margin:0 0 16px;font-size:16px;color:${primary};">Hello ${safeName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${primary};">
          Your enrollment information has been <strong>verified successfully</strong>.
        </p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${primary};">
          Your record has already been reviewed by the <strong>registrar</strong>.
        </p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${primary};">
          You may now proceed to the <strong>assessment</strong> step.
        </p>
        <div style="margin:24px 0;padding:16px;border-radius:12px;background:${secondary}12;border:1px solid ${secondary}66;">
          <p style="margin:0 0 8px;font-size:14px;color:${primary};"><strong>Student Number:</strong> ${safeStudentNumber}</p>
          ${
            safeAssessmentUrl
              ? `<p style="margin:0;font-size:14px;"><a href="${safeAssessmentUrl}" style="display:inline-block;background:${secondary};color:#ffffff;text-decoration:none;padding:8px 12px;border-radius:8px;font-weight:600;">Proceed to assessment</a></p>`
              : `<p style="margin:0;font-size:14px;color:${primary};">Please continue with assessment using the normal school process.</p>`
          }
        </div>
        <p style="margin:0;font-size:14px;line-height:1.7;color:${primary}CC;">
          If you have questions, please contact the registrar's office.
        </p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: trimmedTo,
    subject,
    text: textLines.join("\n"),
    html,
  });
}

export async function sendAssessmentPaymentLinkEmail({
  to,
  studentName,
  studentNumber,
  paymentLink,
  totalAmount,
  academicYear,
  semester,
}: PaymentLinkEmailArgs) {
  const trimmedTo = String(to || "").trim();
  if (!trimmedTo) throw new Error("Student email address is missing.");

  const { transporter, config } = await getTransporter();
  const safeName = escapeHtml(studentName || "Student");
  const safeStudentNumber = escapeHtml(studentNumber || "N/A");
  const safeLink = escapeHtml(paymentLink);
  const safeAcademicYear = escapeHtml(academicYear || "N/A");
  const safeSemester = escapeHtml(String(semester || "N/A"));
  const safeTotalAmount = Number(totalAmount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const subject = "Assessment completed: submit your payment proof";
  const text = [
    `Hello ${studentName || "Student"},`,
    "",
    "Your assessment is now ready.",
    `Total Amount Due: PHP ${safeTotalAmount}`,
    studentNumber ? `Student Number: ${studentNumber}` : null,
    `Academic Year: ${academicYear || "N/A"}`,
    `Semester: ${semester || "N/A"}`,
    "",
    "Submit your payment details and proof at:",
    paymentLink,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f7f3ef;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${colors.secondary}33;">
        <div style="background:${colors.primary};padding:20px 28px;border-bottom:4px solid ${colors.secondary};">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:700;">Payment Submission Link</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 12px;font-size:16px;color:${colors.primary};">Hello ${safeName},</p>
          <p style="margin:0 0 12px;color:${colors.primary};line-height:1.6;">
            Your assessment is complete. Please submit your payment proof using the secure payment page.
          </p>
          <div style="padding:14px;border-radius:12px;background:${colors.secondary}12;border:1px solid ${colors.secondary}55;">
            <p style="margin:0 0 6px;color:${colors.primary};"><strong>Total Amount Due:</strong> PHP ${safeTotalAmount}</p>
            <p style="margin:0 0 6px;color:${colors.primary};"><strong>Student Number:</strong> ${safeStudentNumber}</p>
            <p style="margin:0 0 6px;color:${colors.primary};"><strong>Academic Year:</strong> ${safeAcademicYear}</p>
            <p style="margin:0;color:${colors.primary};"><strong>Semester:</strong> ${safeSemester}</p>
          </div>
          <p style="margin:18px 0 0;">
            <a href="${safeLink}" style="display:inline-block;background:${colors.secondary};color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">
              Open Payment Page
            </a>
          </p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: trimmedTo,
    subject,
    text,
    html,
  });
}

export async function sendPaymentSubmissionDecisionEmail({
  to,
  studentName,
  status,
  amount,
  paymentMethod,
  referenceNo,
  remarks,
}: PaymentDecisionEmailArgs) {
  const trimmedTo = String(to || "").trim();
  if (!trimmedTo) throw new Error("Student email address is missing.");

  const { transporter, config } = await getTransporter();
  const safeName = escapeHtml(studentName || "Student");
  const safeMethod = escapeHtml(paymentMethod || "Online Payment");
  const safeRef = escapeHtml(referenceNo || "N/A");
  const safeAmount = Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const isApproved = status === "approved";
  const subject = isApproved
    ? "Payment verified successfully"
    : "Payment submission update";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f7f3ef;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid ${colors.secondary}33;">
        <div style="background:${isApproved ? colors.success : colors.danger};padding:18px 24px;">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:700;">${isApproved ? "Payment Approved" : "Payment Requires Update"}</p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 10px;color:${colors.primary};">Hello ${safeName},</p>
          <p style="margin:0 0 14px;color:${colors.primary};line-height:1.6;">
            ${
              isApproved
                ? "Your uploaded payment proof has been verified by the cashier/registrar."
                : "Your uploaded payment proof was reviewed but could not be approved."
            }
          </p>
          <p style="margin:0 0 6px;color:${colors.primary};"><strong>Amount:</strong> PHP ${safeAmount}</p>
          <p style="margin:0 0 6px;color:${colors.primary};"><strong>Method:</strong> ${safeMethod}</p>
          <p style="margin:0 0 6px;color:${colors.primary};"><strong>Reference No:</strong> ${safeRef}</p>
          ${
            remarks
              ? `<p style="margin:12px 0 0;color:${colors.primary};"><strong>Remarks:</strong> ${escapeHtml(remarks)}</p>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: trimmedTo,
    subject,
    text: `${isApproved ? "Approved" : "Rejected"} payment for ${studentName}. Amount: PHP ${safeAmount}. Reference: ${referenceNo}.`,
    html,
  });
}

export async function sendExternalCrossEnrollmentApprovedEmail({
  to,
  studentName,
  studentNumber,
  subjectCode,
  subjectTitle,
  externalSchoolName,
  academicYear,
  semester,
  approvalLetterUrl,
}: ExternalCrossEnrollmentApprovedEmailArgs) {
  const trimmedTo = String(to || "").trim();
  if (!trimmedTo) throw new Error("Student email address is missing.");

  const { transporter, config } = await getTransporter();
  const safeName = escapeHtml(studentName || "Student");
  const safeStudentNumber = escapeHtml(studentNumber || "N/A");
  const safeSubjectCode = escapeHtml(subjectCode || "N/A");
  const safeSubjectTitle = escapeHtml(subjectTitle || "N/A");
  const safeSchool = escapeHtml(externalSchoolName || "External School");
  const safeAcademicYear = escapeHtml(academicYear || "N/A");
  const safeSemester = escapeHtml(String(semester || "N/A"));
  const safeApprovalLetterUrl = escapeHtml(approvalLetterUrl);

  const subject = "External cross-enrollment request approved";
  const text = [
    `Hello ${studentName || "Student"},`,
    "",
    "Your external cross-enrollment request has been approved.",
    `Student Number: ${studentNumber || "N/A"}`,
    `Subject: ${subjectCode || "N/A"} - ${subjectTitle || "N/A"}`,
    `External School: ${externalSchoolName || "N/A"}`,
    `Academic Year: ${academicYear || "N/A"}`,
    `Semester: ${semester || "N/A"}`,
    "",
    "Open your approval form here:",
    approvalLetterUrl,
    "",
    "Please print the form and secure the required manual dean signature when needed.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f7f3ef;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${colors.secondary}33;">
        <div style="background:${colors.primary};padding:20px 28px;border-bottom:4px solid ${colors.secondary};">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:700;">External Cross-Enrollment Approved</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 12px;font-size:16px;color:${colors.primary};">Hello ${safeName},</p>
          <p style="margin:0 0 12px;color:${colors.primary};line-height:1.7;">
            Your request to take a subject from another school has been approved. Please review the request details below and open the approval form for printing or PDF saving.
          </p>
          <div style="padding:14px;border-radius:12px;background:${colors.secondary}12;border:1px solid ${colors.secondary}55;">
            <p style="margin:0 0 6px;color:${colors.primary};"><strong>Student Number:</strong> ${safeStudentNumber}</p>
            <p style="margin:0 0 6px;color:${colors.primary};"><strong>Subject:</strong> ${safeSubjectCode} - ${safeSubjectTitle}</p>
            <p style="margin:0 0 6px;color:${colors.primary};"><strong>External School:</strong> ${safeSchool}</p>
            <p style="margin:0 0 6px;color:${colors.primary};"><strong>Academic Year:</strong> ${safeAcademicYear}</p>
            <p style="margin:0;color:${colors.primary};"><strong>Semester:</strong> ${safeSemester}</p>
          </div>
          <p style="margin:18px 0 0;">
            <a href="${safeApprovalLetterUrl}" style="display:inline-block;background:${colors.secondary};color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">
              Open Approval Form
            </a>
          </p>
          <p style="margin:16px 0 0;color:${colors.primary};line-height:1.7;font-size:14px;">
            The approval form includes the official school header and a dean signature section for manual signing. You may print it directly or save it as PDF from your browser.
          </p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: trimmedTo,
    subject,
    text,
    html,
  });
}

export function isEmailConfigured() {
  return Boolean(getMailConfig());
}
