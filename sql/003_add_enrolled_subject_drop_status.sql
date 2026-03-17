ALTER TABLE enrolled_subjects
ADD COLUMN IF NOT EXISTS drop_status VARCHAR(30) NOT NULL DEFAULT 'none';

UPDATE enrolled_subjects
SET drop_status = 'pending_approval',
    status = 'enrolled'
WHERE LOWER(COALESCE(status, '')) = 'approval';

CREATE INDEX IF NOT EXISTS idx_enrolled_subjects_drop_status
  ON enrolled_subjects(drop_status);
  