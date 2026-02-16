-- =====================================================
-- Rollback: Remove 'locked' status support from sections
-- Description: Removes 'locked' status constraint and index
-- Date: 2024
-- =====================================================

-- Step 1: Update any sections with 'locked' status back to 'active' or 'closed'
-- Choose appropriate status based on your business logic
UPDATE sections
SET status = 'active'
WHERE status = 'locked';

-- Alternative: Set to 'closed' if you prefer
-- UPDATE sections
-- SET status = 'closed'
-- WHERE status = 'locked';

-- Step 2: Remove the index (if created)
DROP INDEX IF EXISTS idx_sections_status ON sections;

-- Step 3: Remove check constraint (if added)
-- ALTER TABLE sections DROP CONSTRAINT IF EXISTS chk_section_status;

-- Verification query
SELECT 
    status,
    COUNT(*) as count
FROM sections
GROUP BY status
ORDER BY status;

-- Expected: No 'locked' status should remain

