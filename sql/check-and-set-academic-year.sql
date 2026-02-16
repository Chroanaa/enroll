-- Check current academic year settings
SELECT * FROM settings 
WHERE key IN ('current_academic_year', 'current_semester', 'last_term_sync');

-- If the settings don't exist or are wrong, insert/update them
-- For February 2026, it should be Second Semester 2025-2026

-- Set current academic year to 2025-2026
INSERT INTO settings (key, value, description)
VALUES ('current_academic_year', '2025-2026', 'Current academic year')
ON CONFLICT (key) 
DO UPDATE SET 
  value = '2025-2026',
  description = 'Current academic year - manually set',
  updated_at = NOW();

-- Set current semester to second
INSERT INTO settings (key, value, description)
VALUES ('current_semester', 'second', 'Current semester')
ON CONFLICT (key) 
DO UPDATE SET 
  value = 'second',
  description = 'Current semester - manually set',
  updated_at = NOW();

-- Verify the update
SELECT * FROM settings 
WHERE key IN ('current_academic_year', 'current_semester', 'last_term_sync');
