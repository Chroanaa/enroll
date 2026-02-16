-- Fix student 26-00006 term to match the expected format
-- Change from 'second' to 'Second Semester'

-- Check current value
SELECT 
  id,
  student_number,
  academic_year,
  term,
  status
FROM enrollment
WHERE student_number = '26-00006';

-- Update to correct format
UPDATE enrollment
SET term = 'Second Semester'
WHERE student_number = '26-00006' 
  AND id = 67;

-- Verify the change
SELECT 
  id,
  student_number,
  academic_year,
  term,
  status
FROM enrollment
WHERE student_number = '26-00006';
