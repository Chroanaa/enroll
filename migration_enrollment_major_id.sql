-- ============================================
-- MIGRATION SCRIPT: Update Enrollment Table
-- ============================================
-- This script updates the enrollment table to:
-- 1. Add major_id column (for linking to major table)
-- 2. Remove program_id column (if exists, using course_program instead)
-- 
-- Run this SQL manually in your PostgreSQL database
-- ============================================

-- Step 1: Add major_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'enrollment' 
        AND column_name = 'major_id'
    ) THEN
        ALTER TABLE enrollment 
        ADD COLUMN major_id INT;
        
        -- Add comment
        COMMENT ON COLUMN enrollment.major_id IS 'Foreign key reference to major table. Set when a program has majors and student selects one.';
    END IF;
END $$;

-- Step 2: Remove program_id column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'enrollment' 
        AND column_name = 'program_id'
    ) THEN
        -- Drop the column
        ALTER TABLE enrollment 
        DROP COLUMN program_id;
    END IF;
END $$;

-- Step 3: Add foreign key constraint for major_id (optional, for referential integrity)
-- Uncomment if you want to enforce referential integrity
/*
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_enrollment_major_id'
        AND table_name = 'enrollment'
    ) THEN
        ALTER TABLE enrollment 
        ADD CONSTRAINT fk_enrollment_major_id 
        FOREIGN KEY (major_id) 
        REFERENCES major(id) 
        ON DELETE SET NULL;
    END IF;
END $$;
*/

-- Step 4: Add index on major_id for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_enrollment_major_id 
ON enrollment(major_id) 
WHERE major_id IS NOT NULL;

-- Step 5: Add index on course_program for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_enrollment_course_program 
ON enrollment(course_program) 
WHERE course_program IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the migration:

-- Check if major_id column exists
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'enrollment' 
-- AND column_name IN ('major_id', 'program_id', 'course_program')
-- ORDER BY column_name;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'enrollment' 
-- AND indexname LIKE '%major%' OR indexname LIKE '%course_program%';

-- ============================================
-- NOTES:
-- ============================================
-- 1. major_id: Stores the ID of the selected major (nullable)
--    - Set when a program has majors and student selects one
--    - NULL when program has no majors
--
-- 2. course_program: Stores the program ID as a string
--    - Contains the program ID (as VARCHAR)
--    - Used instead of separate program_id column
--
-- 3. department: Automatically derived from:
--    - The major's program (if major is selected)
--    - The program directly (if no major exists)
--
-- 4. The foreign key constraint is optional and commented out
--    - Uncomment if you want referential integrity enforcement
--    - Keep commented if you prefer flexibility

