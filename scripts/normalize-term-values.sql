-- SQL Migration: Normalize term values to be consistent
-- Update all term values to use "first", "second", "summer" format (all lowercase)

-- Step 1: Update "1st Semester" variations to "first"
UPDATE enrollment
SET term = 'first'
WHERE LOWER(TRIM(term)) LIKE '%1st%semester%' 
   OR LOWER(TRIM(term)) = '1st semester'
   OR LOWER(TRIM(term)) = '1st'
   OR term = '1st Semester';

-- Step 2: Update "2nd Semester" variations to "second"
UPDATE enrollment
SET term = 'second'
WHERE LOWER(TRIM(term)) LIKE '%2nd%semester%'
   OR LOWER(TRIM(term)) = '2nd semester'
   OR LOWER(TRIM(term)) = '2nd'
   OR term = '2nd Semester';

-- Step 3: Normalize all remaining values to lowercase standard format
UPDATE enrollment
SET term = CASE
    WHEN LOWER(TRIM(term)) IN ('first', '1st', '1st semester', 'first semester') THEN 'first'
    WHEN LOWER(TRIM(term)) IN ('second', '2nd', '2nd semester', 'second semester') THEN 'second'
    WHEN LOWER(TRIM(term)) IN ('summer', 'sum') THEN 'summer'
    ELSE LOWER(TRIM(term))  -- Keep as-is but normalize case
  END
WHERE term IS NOT NULL AND term != '';

-- Step 6: Verify the normalization
SELECT 
  term,
  COUNT(*) as count
FROM enrollment
WHERE term IS NOT NULL
GROUP BY term
ORDER BY term;

-- Expected results should show:
-- first, second, summer (all lowercase)

