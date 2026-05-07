import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";
import { getAppBaseUrl } from "@/app/lib/appUrl";

export type OnlinePaymentMethod = {
  id: number;
  name: string;
  receiver_name: string;
  receiver_account: string;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

let ensurePromise: Promise<void> | null = null;

export async function ensureOnlinePaymentTables() {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS payment_gateway_methods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        receiver_name VARCHAR(150) NOT NULL,
        receiver_account VARCHAR(120) NOT NULL,
        instructions TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS online_payment_links (
        id SERIAL PRIMARY KEY,
        token VARCHAR(128) UNIQUE NOT NULL,
        assessment_id INTEGER NOT NULL,
        student_number VARCHAR(20) NOT NULL,
        email_address VARCHAR(255),
        academic_year VARCHAR(20),
        semester INTEGER,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS online_payment_submissions (
        id SERIAL PRIMARY KEY,
        assessment_id INTEGER NOT NULL,
        student_number VARCHAR(20) NOT NULL,
        student_name VARCHAR(255),
        academic_year VARCHAR(20),
        semester INTEGER,
        payment_method_id INTEGER NOT NULL,
        payment_method_name VARCHAR(100),
        receiver_name VARCHAR(150),
        receiver_account VARCHAR(120),
        reference_no VARCHAR(120) NOT NULL,
        or_number VARCHAR(120),
        amount DECIMAL(10,2) NOT NULL,
        proof_path TEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        admin_remarks TEXT,
        reviewed_by INTEGER,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_online_payment_links_assessment
      ON online_payment_links(assessment_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_online_payment_links_token
      ON online_payment_links(token)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_online_payment_submissions_assessment
      ON online_payment_submissions(assessment_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_online_payment_submissions_status
      ON online_payment_submissions(status)
    `);
  })();

  return ensurePromise;
}

export function createPaymentLinkToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function getPaymentPortalBaseUrl(fallbackOrigin: string) {
  return (
    process.env.ENROLLMENT_PAYMENT_URL?.trim() ||
    getAppBaseUrl(fallbackOrigin)
  );
}

export function normalizeMethodPaymentType(name: string) {
  const key = String(name || "").trim().toLowerCase();
  if (key.includes("gcash")) return "gcash";
  if (key.includes("maya")) return "bank_transfer";
  if (key.includes("bank")) return "bank_transfer";
  return "bank_transfer";
}
