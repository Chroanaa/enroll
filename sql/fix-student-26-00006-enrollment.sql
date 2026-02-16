-- Fix student 26-00006 enrollment to match the section criteria
-- The student should be in Second Semester 2025-2026 (not First Semester 2026-2027)

-- First, check the current enrollment
SELECT 
  id,
  student_number,
  first_name,
  family_name,
  course_program,
  year_level,
  academic_year,
  term,
  status
FROM enrollment
WHERE student_number = '26-00006';

-- Update the enrollment to Second Semester 2025-2026
UPDATE enrollment
SET 
  academic_year = '2025-2026',
  term = 'Second Semester'
WHERE student_number = '26-00006'
  AND id = 67;

-- Verify the update
SELECT 
  id,
  student_number,
  first_name,
  family_name,
  course_program,
  year_level,
  academic_year,
  term,
  status
FROM enrollment
WHERE student_number = '26-00006';

-- Also check what your section's academic year is
SELECT 
  id,
  section_name,
  program_id,
  year_level,
  academic_year,
  semester,
  advisor
FROM sections
WHERE id = 13;
