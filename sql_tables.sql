-- ============================================
-- SQL TABLES FOR ENROLLMENT FORM SYSTEM
-- ============================================

-- ============================================
-- TABLE 1: SHS Programs (including custom/other)
-- ============================================
CREATE TABLE IF NOT EXISTS shs_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shs_programs_name ON shs_programs(name);
CREATE INDEX IF NOT EXISTS idx_shs_programs_is_custom ON shs_programs(is_custom);

-- Insert default SHS programs
INSERT INTO shs_programs (name, is_custom) VALUES
    ('STEM – Science, Technology, Engineering, and Mathematics', FALSE),
    ('ABM – Accountancy, Business, and Management', FALSE),
    ('HUMSS – Humanities and Social Sciences', FALSE),
    ('GAS – General Academic Strand', FALSE),
    ('TVL – ICT (Information and Communications Technology)', FALSE),
    ('TVL – HE (Home Economics)', FALSE),
    ('TVL – IA (Industrial Arts)', FALSE),
    ('TVL – AFA (Agri-Fishery Arts)', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TABLE 2: Last School Attended
-- ============================================
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);
CREATE INDEX IF NOT EXISTS idx_schools_is_custom ON schools(is_custom);

-- ============================================
-- TABLE 3: Composite Unique Constraint for Duplicate Prevention
-- ============================================
-- Add composite unique constraint to enrollment table
-- This prevents duplicate student records based on:
-- First Name + Middle Name + Last Name + Date of Birth

-- Note: This assumes the enrollment table already exists
-- If using Prisma, add this to schema.prisma:
-- @@unique([first_name, middle_name, family_name, birthdate], name: "unique_student_enrollment")

-- For direct SQL execution:
ALTER TABLE enrollment 
ADD CONSTRAINT unique_student_enrollment 
UNIQUE (
    UPPER(TRIM(first_name)), 
    UPPER(TRIM(COALESCE(middle_name, ''))), 
    UPPER(TRIM(family_name)), 
    birthdate
);

-- Alternative: Create a unique index (more flexible, allows NULL handling)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_enrollment 
ON enrollment (
    UPPER(TRIM(first_name)), 
    UPPER(TRIM(COALESCE(middle_name, ''))), 
    UPPER(TRIM(family_name)), 
    birthdate
) WHERE first_name IS NOT NULL AND family_name IS NOT NULL AND birthdate IS NOT NULL;

-- ============================================
-- NOTES:
-- ============================================
-- 1. The shs_programs table stores both default and custom programs
--    - is_custom = FALSE: Pre-defined programs
--    - is_custom = TRUE: User-added programs via modal
-- 
-- 2. The schools table stores both default and custom schools
--    - is_custom = FALSE: Pre-existing schools
--    - is_custom = TRUE: User-added schools via modal
--
-- 3. The composite unique constraint ensures no duplicate enrollments
--    based on the combination of:
--    - First Name (case-insensitive, trimmed)
--    - Middle Name (case-insensitive, trimmed, nullable)
--    - Family Name (case-insensitive, trimmed)
--    - Date of Birth
--
-- 4. Both tables include created_at and updated_at for audit trails
--
-- 5. Indexes are created for performance optimization on common queries

