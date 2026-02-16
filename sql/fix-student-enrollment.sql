-- Fix student enrollment data to match section criteria
-- Update student 26-00006 to be enrolled in 2025-2026 Second Semester

-- First, check current enrollment data
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

-- Update the enrollment to match the section's academic year and term
UPDATE enrollment
SET 
  academic_year = '2025-2026',
  term = 'Second Semester'  -- or just 'second' depending on your data format
WHERE student_number = '26-00006'
  AND id = 67;  -- Use the specific enrollment ID from your logs

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
