-- =====================================================
-- IRREGULAR STUDENT SECTIONING - DATABASE MIGRATIONS
-- =====================================================
-- Run these SQL commands in order to add support for
-- irregular student sectioning with subject selection
-- =====================================================
--
-- AFTER RUNNING THIS MIGRATION:
-- 1. Run: npx prisma db pull   (to sync schema with database)
-- 2. Run: npx prisma generate  (to regenerate Prisma client)
-- =====================================================

-- =====================================================
-- STEP 1: Add assignment_type to student_section table
-- =====================================================
-- This tracks whether assignment is 'regular' or 'irregular'


ALTER TABLE student_section 
ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20) DEFAULT 'regular';

-- Add index for faster filtering by assignment type
CREATE INDEX IF NOT EXISTS idx_student_section_assignment_type 
ON student_section(assignment_type);

-- =====================================================
-- STEP 2: Create student_section_subjects table
-- =====================================================
-- This links irregular students to specific subjects
-- Regular students get ALL subjects from section schedule
-- Irregular students only get subjects listed here

CREATE TABLE IF NOT EXISTS student_section_subjects (
    id SERIAL PRIMARY KEY,
    student_section_id INT NOT NULL,
    class_schedule_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_student_section 
        FOREIGN KEY (student_section_id) 
        REFERENCES student_section(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_class_schedule 
        FOREIGN KEY (class_schedule_id) 
        REFERENCES class_schedule(id) 
        ON DELETE CASCADE,
    
    -- Prevent duplicate subject assignments
    CONSTRAINT unique_student_subject 
        UNIQUE (student_section_id, class_schedule_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_section_subjects_student 
ON student_section_subjects(student_section_id);

CREATE INDEX IF NOT EXISTS idx_student_section_subjects_schedule 
ON student_section_subjects(class_schedule_id);


-- =====================================================
-- ROLLBACK SCRIPT (Run if you need to undo changes)
-- =====================================================
/*
-- To rollback, run these commands in reverse order:

-- Step 2 Rollback: Drop student_section_subjects table
DROP TABLE IF EXISTS student_section_subjects;

-- Step 1 Rollback: Remove assignment_type column
ALTER TABLE student_section DROP COLUMN IF EXISTS assignment_type;

*/


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration was successful:

-- Check student_section has assignment_type column
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'student_section' AND column_name = 'assignment_type';

-- Check student_section_subjects table exists
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'student_section_subjects';

-- Check indexes exist
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN ('student_section', 'student_section_subjects');
