ALTER TABLE enrollment
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_by INT NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP(6) NULL,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT NULL;

UPDATE enrollment
SET verification_status = 'pending'
WHERE verification_status IS NULL;

