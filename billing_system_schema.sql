-- =====================================================
-- Student Billing System - Manual SQL Schema
-- =====================================================
-- This SQL script creates the tables for the student
-- assessment, discount, fee snapshot, and payment system.
-- =====================================================

-- =====================================================
-- 1. DISCOUNT TABLE (Master Data)
-- =====================================================
-- Stores all available discount rules/policies
-- =====================================================

CREATE TABLE IF NOT EXISTS "discount" (
    "id" SERIAL PRIMARY KEY,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "percentage" DECIMAL(5, 2) NOT NULL,
    "semester" VARCHAR(20) NOT NULL,
    "status" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for filtering active discounts by semester
CREATE INDEX IF NOT EXISTS "idx_discount_status_semester" 
    ON "discount" ("status", "semester");

-- =====================================================
-- 2. STUDENT_ASSESSMENT TABLE (Transaction Header)
-- =====================================================
-- Represents one semester billing snapshot per student
-- Stores final computed tuition, discount, and totals
-- =====================================================

CREATE TABLE IF NOT EXISTS "student_assessment" (
    "id" SERIAL PRIMARY KEY,
    "student_number" VARCHAR(20) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "semester" INTEGER NOT NULL,
    
    -- Tuition calculations
    "gross_tuition" DECIMAL(10, 2) NOT NULL,
    "discount_id" INTEGER,
    "discount_percent" DECIMAL(5, 2),
    "discount_amount" DECIMAL(10, 2),
    
    -- Final totals
    "net_tuition" DECIMAL(10, 2) NOT NULL,
    "total_fees" DECIMAL(10, 2) NOT NULL,
    "total_due" DECIMAL(10, 2) NOT NULL,
    
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to discount (optional, can be NULL)
    CONSTRAINT "student_assessment_discount_id_fkey" 
        FOREIGN KEY ("discount_id") 
        REFERENCES "discount"("id") 
        ON DELETE SET NULL
);

-- Unique constraint: Only one assessment per student per semester
CREATE UNIQUE INDEX IF NOT EXISTS "idx_assessment_unique" 
    ON "student_assessment" ("student_number", "academic_year", "semester");

-- Index for querying by student
CREATE INDEX IF NOT EXISTS "idx_assessment_student" 
    ON "student_assessment" ("student_number");

-- Index for querying by academic term
CREATE INDEX IF NOT EXISTS "idx_assessment_term" 
    ON "student_assessment" ("academic_year", "semester");

-- =====================================================
-- 3. ASSESSMENT_FEE TABLE (Fee Snapshot)
-- =====================================================
-- Stores a copy of all fees used in that assessment
-- Preserves historical integrity (fees can change in master table)
-- =====================================================

CREATE TABLE IF NOT EXISTS "assessment_fee" (
    "id" SERIAL PRIMARY KEY,
    "assessment_id" INTEGER NOT NULL,
    "fee_id" INTEGER,
    
    -- Snapshot of fee data at assessment time
    "fee_name" VARCHAR(255) NOT NULL,
    "fee_category" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    
    -- Foreign key to assessment (CASCADE delete)
    CONSTRAINT "assessment_fee_assessment_id_fkey" 
        FOREIGN KEY ("assessment_id") 
        REFERENCES "student_assessment"("id") 
        ON DELETE CASCADE
);

-- Index for querying fees by assessment
CREATE INDEX IF NOT EXISTS "idx_assessment_fee_assessment" 
    ON "assessment_fee" ("assessment_id");

-- =====================================================
-- 4. STUDENT_PAYMENT TABLE (Payment Transactions)
-- =====================================================
-- Tracks actual payments made by students
-- Links to assessment to know which semester was paid
-- =====================================================

CREATE TABLE IF NOT EXISTS "student_payment" (
    "id" SERIAL PRIMARY KEY,
    "assessment_id" INTEGER NOT NULL,
    "amount_paid" DECIMAL(10, 2) NOT NULL,
    "payment_type" VARCHAR(50) NOT NULL,
    "payment_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference_no" VARCHAR(100),
    
    -- Foreign key to assessment (CASCADE delete)
    CONSTRAINT "student_payment_assessment_id_fkey" 
        FOREIGN KEY ("assessment_id") 
        REFERENCES "student_assessment"("id") 
        ON DELETE CASCADE
);

-- Index for querying payments by assessment
CREATE INDEX IF NOT EXISTS "idx_payment_assessment" 
    ON "student_payment" ("assessment_id");

-- Index for querying payments by date
CREATE INDEX IF NOT EXISTS "idx_payment_date" 
    ON "student_payment" ("payment_date");

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE "discount" IS 'Master Data: Reusable discount policies. Only active discounts are selectable.';
COMMENT ON TABLE "student_assessment" IS 'Transaction: Assessment header. One assessment per student per semester. Stores financial snapshot.';
COMMENT ON TABLE "assessment_fee" IS 'Transaction: Fee snapshot table. Preserves historical integrity when master fee table changes.';
COMMENT ON TABLE "student_payment" IS 'Transaction: Payment records. Tracks how much has been paid and which semester payment belongs to.';

COMMENT ON COLUMN "student_assessment"."discount_id" IS 'Optional reference to discount master table';
COMMENT ON COLUMN "student_assessment"."discount_percent" IS 'Snapshot of discount percentage at assessment time';
COMMENT ON COLUMN "student_assessment"."discount_amount" IS 'Snapshot of discount amount at assessment time';
COMMENT ON COLUMN "assessment_fee"."fee_id" IS 'Optional reference to fee master table (may be NULL if fee was deleted)';
COMMENT ON COLUMN "assessment_fee"."fee_name" IS 'Snapshot of fee name at assessment time';
COMMENT ON COLUMN "assessment_fee"."fee_category" IS 'Snapshot of fee category at assessment time';
COMMENT ON COLUMN "assessment_fee"."amount" IS 'Snapshot of fee amount at assessment time';
COMMENT ON COLUMN "student_payment"."payment_type" IS 'Type of payment: cash, prelim, midterm, finals, etc.';
COMMENT ON COLUMN "student_payment"."reference_no" IS 'Optional payment reference number (receipt, transaction ID, etc.)';

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Sample discount records
-- INSERT INTO "discount" ("code", "name", "percentage", "semester", "status") VALUES
-- ('FT1', 'Dean Lister - Full Time', 30.00, 'First', 'active'),
-- ('FT2', 'Dean Lister - Full Time', 20.00, 'Second', 'active'),
-- ('HH1', 'Employee Admin', 100.00, 'First', 'active'),
-- ('HH2', 'Employee Staff', 50.00, 'First', 'active');

-- =====================================================
-- END OF SCHEMA
-- =====================================================

