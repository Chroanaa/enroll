-- Update enrollment term values from "first" to "second"
-- Safe to re-run: once updated, no further rows match the WHERE clause.

BEGIN;

-- Before update: see current term distribution
SELECT term, COUNT(*) AS total
FROM enrollment
GROUP BY term
ORDER BY term;

-- Targeted update
UPDATE enrollment
SET term = 'second'
WHERE LOWER(TRIM(term)) = 'first';

-- After update: confirm changes
SELECT term, COUNT(*) AS total
FROM enrollment
GROUP BY term
ORDER BY term;

COMMIT;
