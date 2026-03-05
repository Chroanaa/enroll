-- Make faculty_id nullable in class_schedule table
-- This allows schedules to be created without assigning faculty first
-- Faculty can be assigned later

ALTER TABLE class_schedule 
ALTER COLUMN faculty_id DROP NOT NULL;

-- Add comment to document this change
COMMENT ON COLUMN class_schedule.faculty_id IS 'Faculty ID - nullable to allow schedule creation before faculty assignment';
