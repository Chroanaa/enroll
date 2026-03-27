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
  paymentUrl?: string | null;
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
  paymentUrl,
}: VerifiedEmailArgs) {
  const trimmedTo = String(to || "").trim();
  if (!trimmedTo) {
    throw new Error("Student email address is missing.");
  }

  const { transporter, config } = await getTransporter();
  const safeName = escapeHtml(studentName || "Student");
  const safeStudentNumber = escapeHtml(studentNumber || "N/A");
  const safePaymentUrl = paymentUrl ? escapeHtml(paymentUrl) : null;
  const primary = colors.primary;
  const secondary = colors.secondary;

  const subject = "Enrollment verified: you may proceed to payment";
  const textLines = [
    `Hello ${studentName || "Student"},`,
    "",
    "Your enrollment information has been verified successfully.",
    "Your record has already been reviewed by the registrar.",
    "You may now proceed to the payment step based on your school's payment process.",
    studentNumber ? `Student Number: ${studentNumber}` : null,
    paymentUrl ? `Payment Link: ${paymentUrl}` : null,
    "",
    "If you have questions, please contact the registrar or cashier's office.",
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
          You may now proceed to the <strong>payment</strong> step based on your school's payment process.
        </p>
        <div style="margin:24px 0;padding:16px;border-radius:12px;background:${secondary}12;border:1px solid ${secondary}66;">
          <p style="margin:0 0 8px;font-size:14px;color:${primary};"><strong>Student Number:</strong> ${safeStudentNumber}</p>
          ${
            safePaymentUrl
              ? `<p style="margin:0;font-size:14px;"><a href="${safePaymentUrl}" style="display:inline-block;background:${secondary};color:#ffffff;text-decoration:none;padding:8px 12px;border-radius:8px;font-weight:600;">Proceed to payment</a></p>`
              : `<p style="margin:0;font-size:14px;color:${primary};">Please continue with payment using the normal school process.</p>`
          }
        </div>
        <p style="margin:0;font-size:14px;line-height:1.7;color:${primary}CC;">
          If you have questions, please contact the registrar or cashier's office.
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

export function isEmailConfigured() {
  return Boolean(getMailConfig());
}
