-- =====================================================
-- Migration: Add 'locked' status support to sectionss
-- Description: Adds support for 'locked' status in sections table
--              to prevent modifications after enrollment period
-- Date: 2024
-- =====================================================

-- The sections.status field is already VarChar(50), so it can handle 'locked'
-- No schema change needed, but we add a check constraint to ensure valid statuses

-- Step 1: Update any existing data if needed (optional)
-- No data migration needed as 'locked' is a new status value

-- Step 2: Add check constraint to ensure valid status values
-- Note: MySQL doesn't support CHECK constraints in older versions
-- If using MySQL 8.0.16+, uncomment the following:

-- ALTER TABLE sections
-- ADD CONSTRAINT chk_section_status 
-- CHECK (status IN ('draft', 'active', 'locked', 'closed'));

-- For MySQL < 8.0.16 or if CHECK constraints are not supported,
-- validation will be handled at the application level (already implemented)

-- Step 3: Add index on status for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status);

-- Step 4: Add comment to document the status values
-- ALTER TABLE sections MODIFY COLUMN status VARCHAR(50) 
-- COMMENT 'Section status: draft (being created), active (ready for enrollment), locked (no modifications), closed (archived)';

-- Verification query
SELECT 
    status,
    COUNT(*) as count
FROM sections
GROUP BY status
ORDER BY status;

-- Expected statuses after migration:
-- draft, active, locked, closed

