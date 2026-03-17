DROP INDEX IF EXISTS idx_enrolled_subjects_drop_status;

ALTER TABLE enrolled_subjects
DROP COLUMN IF EXISTS drop_status;
