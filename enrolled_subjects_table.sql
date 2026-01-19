-- SQL script to create enrolled_subjects table (PostgreSQL)
-- This table stores the subjects that students are enrolled in for a specific academic term
-- Run this SQL manually in your PostgreSQL database

CREATE TABLE IF NOT EXISTS enrolled_subjects (
  id SERIAL PRIMARY KEY,
  student_number VARCHAR(20) NOT NULL,
  program_id INT,
  curriculum_course_id INT NOT NULL,
  subject_id INT,
  academic_year VARCHAR(20) NOT NULL,
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  term VARCHAR(50),
  year_level INT,
  units_total INT NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed')),
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_enrolled_subjects_student_number ON enrolled_subjects(student_number);
CREATE INDEX IF NOT EXISTS idx_enrolled_subjects_program_semester ON enrolled_subjects(program_id, semester, academic_year);
CREATE INDEX IF NOT EXISTS idx_enrolled_subjects_academic_term ON enrolled_subjects(academic_year, semester);

-- Add foreign key constraints (uncomment if you want referential integrity)
-- ALTER TABLE enrolled_subjects 
--   ADD CONSTRAINT fk_student_number 
--   FOREIGN KEY (student_number) REFERENCES enrollment(student_number) ON DELETE CASCADE;
--
-- ALTER TABLE enrolled_subjects 
--   ADD CONSTRAINT fk_program_id 
--   FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE SET NULL;
--
-- ALTER TABLE enrolled_subjects 
--   ADD CONSTRAINT fk_curriculum_course_id 
--   FOREIGN KEY (curriculum_course_id) REFERENCES curriculum_course(id) ON DELETE CASCADE;
--
-- ALTER TABLE enrolled_subjects 
--   ADD CONSTRAINT fk_subject_id 
--   FOREIGN KEY (subject_id) REFERENCES subject(id) ON DELETE SET NULL;

-- Add comments (PostgreSQL syntax)
COMMENT ON TABLE enrolled_subjects IS 'Stores subjects that students are enrolled in for a specific academic term';
COMMENT ON COLUMN enrolled_subjects.student_number IS 'Student number from enrollment table';
COMMENT ON COLUMN enrolled_subjects.program_id IS 'Program ID from program table';
COMMENT ON COLUMN enrolled_subjects.curriculum_course_id IS 'Reference to curriculum_course table';
COMMENT ON COLUMN enrolled_subjects.subject_id IS 'Reference to subject table';
COMMENT ON COLUMN enrolled_subjects.academic_year IS 'Academic year in format YYYY-YYYY';
COMMENT ON COLUMN enrolled_subjects.semester IS 'Semester number (1 or 2)';
COMMENT ON COLUMN enrolled_subjects.term IS 'Term description (e.g., First Semester, Second Semester)';
COMMENT ON COLUMN enrolled_subjects.year_level IS 'Year level of the student';
COMMENT ON COLUMN enrolled_subjects.units_total IS 'Total units for this subject';
COMMENT ON COLUMN enrolled_subjects.status IS 'Enrollment status: enrolled, dropped, or completed';

