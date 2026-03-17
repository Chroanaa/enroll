CREATE TABLE IF NOT EXISTS student_cross_enrollment_requests (
  id SERIAL PRIMARY KEY,
  student_number VARCHAR(20) NOT NULL,
  home_program_id INTEGER NULL,
  home_major_id INTEGER NULL,
  host_program_id INTEGER NOT NULL,
  host_major_id INTEGER NULL,
  curriculum_course_id INTEGER NOT NULL,
  subject_id INTEGER NULL,
  academic_year VARCHAR(20) NOT NULL,
  semester INTEGER NOT NULL,
  year_level INTEGER NULL,
  units_total INTEGER NOT NULL DEFAULT 0,
  reason TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
  requested_by INTEGER NULL,
  approved_by INTEGER NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_cross_enrollment_requests_term
  ON student_cross_enrollment_requests(academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_cross_enrollment_requests_status
  ON student_cross_enrollment_requests(status);

CREATE INDEX IF NOT EXISTS idx_cross_enrollment_requests_student
  ON student_cross_enrollment_requests(student_number);
