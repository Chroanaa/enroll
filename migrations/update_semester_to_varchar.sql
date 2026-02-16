-- =====================================================
-- MIGRATION: Update semester columns from INT to VARCHAR(50)
-- Date: 2026-02-16
-- Description: Convert semester fields to use text values
--              (First Semester, Second Semester, Summer)
-- =====================================================

-- Step 1: Add temporary VARCHAR columns
ALTER TABLE sections ADD COLUMN semester_temp VARCHAR(50);
ALTER TABLE student_section ADD COLUMN semester_temp VARCHAR(50);
ALTER TABLE class_schedule ADD COLUMN semester_temp VARCHAR(50);
ALTER TABLE sections ADD COLUMN academic_year_temp VARCHAR(20);
ALTER TABLE student_section ADD COLUMN academic_year_temp VARCHAR(20);
ALTER TABLE class_schedule ADD COLUMN academic_year_temp VARCHAR(20);

-- Step 2: Convert existing integer values to text
-- 1 = 'First Semester', 2 = 'Second Semester', 3 = 'Summer'

-- Update sections table
UPDATE sections 
SET semester_temp = CASE 
    WHEN semester = 1 THEN 'first'
    WHEN semester = 2 THEN 'second'
    WHEN semester = 3 THEN 'summer'
    ELSE NULL
END;

UPDATE sections
SET academic_year_temp = CASE
    WHEN academic_year IS NOT NULL THEN academic_year::text || '-' || (academic_year + 1)
    ELSE NULL
END;

-- Update student_section table
UPDATE student_section 
SET semester_temp = CASE 
    WHEN semester = 1 THEN 'first'
    WHEN semester = 2 THEN 'second'
    WHEN semester = 3 THEN 'summer'
END;

UPDATE student_section
SET academic_year_temp = academic_year::text || '-' || (academic_year + 1);

-- Update class_schedule table
UPDATE class_schedule 
SET semester_temp = CASE 
    WHEN semester = 1 THEN 'first'
    WHEN semester = 2 THEN 'second'
    WHEN semester = 3 THEN 'summer'
END;

UPDATE class_schedule
SET academic_year_temp = academic_year::text || '-' || (academic_year + 1);

-- Step 3: Drop the unique constraint on student_section before dropping the column
ALTER TABLE student_section DROP CONSTRAINT IF EXISTS student_section_student_number_academic_year_semester_key;

-- Step 4: Drop old integer columns
ALTER TABLE sections DROP COLUMN semester;
ALTER TABLE student_section DROP COLUMN semester;
ALTER TABLE class_schedule DROP COLUMN semester;
ALTER TABLE sections DROP COLUMN academic_year;
ALTER TABLE student_section DROP COLUMN academic_year;
ALTER TABLE class_schedule DROP COLUMN academic_year;

-- Step 5: Rename temporary columns to original names
ALTER TABLE sections RENAME COLUMN semester_temp TO semester;
ALTER TABLE student_section RENAME COLUMN semester_temp TO semester;
ALTER TABLE class_schedule RENAME COLUMN semester_temp TO semester;
ALTER TABLE sections RENAME COLUMN academic_year_temp TO academic_year;
ALTER TABLE student_section RENAME COLUMN academic_year_temp TO academic_year;
ALTER TABLE class_schedule RENAME COLUMN academic_year_temp TO academic_year;

-- Step 6: Recreate the unique constraint on student_section
ALTER TABLE student_section 
ADD CONSTRAINT student_section_student_number_academic_year_semester_key 
UNIQUE (student_number, academic_year, semester);

-- Step 7: Recreate index on class_schedule (if needed)
DROP INDEX IF EXISTS idx_class_schedule_section;
CREATE INDEX idx_class_schedule_section ON class_schedule(section_id, academic_year, semester);

-- Step 8: Verify the changes
SELECT 
    'sections' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT semester) as distinct_semesters,
    STRING_AGG(DISTINCT semester, ', ') as semester_values
FROM sections
UNION ALL
SELECT 
    'student_section' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT semester) as distinct_semesters,
    STRING_AGG(DISTINCT semester, ', ') as semester_values
FROM student_section
UNION ALL
SELECT 
    'class_schedule' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT semester) as distinct_semesters,
    STRING_AGG(DISTINCT semester, ', ') as semester_values
FROM class_schedule;

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
/*
-- Add back integer columns
ALTER TABLE sections ADD COLUMN semester_int INT;
ALTER TABLE student_section ADD COLUMN semester_int INT;
ALTER TABLE class_schedule ADD COLUMN semester_int INT;
ALTER TABLE sections ADD COLUMN academic_year_int INT;
ALTER TABLE student_section ADD COLUMN academic_year_int INT;
ALTER TABLE class_schedule ADD COLUMN academic_year_int INT;

-- Convert back to integers
UPDATE sections SET semester_int = CASE 
    WHEN semester = 'first' THEN 1
    WHEN semester = 'second' THEN 2
    WHEN semester = 'summer' THEN 3
END;

UPDATE student_section SET semester_int = CASE 
    WHEN semester = 'first' THEN 1
    WHEN semester = 'second' THEN 2
    WHEN semester = 'summer' THEN 3
END;

UPDATE class_schedule SET semester_int = CASE 
    WHEN semester = 'first' THEN 1
    WHEN semester = 'second' THEN 2
    WHEN semester = 'summer' THEN 3
END;

UPDATE sections SET academic_year_int = CASE
    WHEN academic_year IS NOT NULL THEN split_part(academic_year, '-', 1)::int
END;

UPDATE student_section SET academic_year_int = CASE
    WHEN academic_year IS NOT NULL THEN split_part(academic_year, '-', 1)::int
END;

UPDATE class_schedule SET academic_year_int = CASE
    WHEN academic_year IS NOT NULL THEN split_part(academic_year, '-', 1)::int
END;

-- Drop unique constraint
ALTER TABLE student_section DROP CONSTRAINT student_section_student_number_academic_year_semester_key;

-- Drop VARCHAR columns
ALTER TABLE sections DROP COLUMN semester;
ALTER TABLE student_section DROP COLUMN semester;
ALTER TABLE class_schedule DROP COLUMN semester;
ALTER TABLE sections DROP COLUMN academic_year;
ALTER TABLE student_section DROP COLUMN academic_year;
ALTER TABLE class_schedule DROP COLUMN academic_year;

-- Rename integer columns back
ALTER TABLE sections RENAME COLUMN semester_int TO semester;
ALTER TABLE student_section RENAME COLUMN semester_int TO semester;
ALTER TABLE class_schedule RENAME COLUMN semester_int TO semester;
ALTER TABLE sections RENAME COLUMN academic_year_int TO academic_year;
ALTER TABLE student_section RENAME COLUMN academic_year_int TO academic_year;
ALTER TABLE class_schedule RENAME COLUMN academic_year_int TO academic_year;

-- Recreate constraint
ALTER TABLE student_section 
ADD CONSTRAINT student_section_student_number_academic_year_semester_key 
UNIQUE (student_number, academic_year, semester);
*/
