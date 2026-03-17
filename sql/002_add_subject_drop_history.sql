CREATE TABLE IF NOT EXISTS subject_drop_history (
  id SERIAL PRIMARY KEY,
  enrolled_subject_id INT,
  student_number VARCHAR(20) NOT NULL,
  program_id INT,
  curriculum_course_id INT NOT NULL,
  subject_id INT,
  academic_year VARCHAR(20) NOT NULL,
  semester INT NOT NULL,
  term VARCHAR(50),
  year_level INT,
  units_total INT DEFAULT 0,
  status VARCHAR(20),
  course_code VARCHAR(50),
  descriptive_title VARCHAR(255),
  dropped_at TIMESTAMP NOT NULL DEFAULT NOW(),
  dropped_by INT,
  drop_reason VARCHAR(255),
  refundable BOOLEAN NOT NULL DEFAULT FALSE,
  refundable_days INT NOT NULL DEFAULT 15,
  semester_start_date DATE,
  refund_deadline DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_drop_history_student_number
  ON subject_drop_history(student_number);

CREATE INDEX IF NOT EXISTS idx_subject_drop_history_academic_term
  ON subject_drop_history(academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_subject_drop_history_dropped_at
  ON subject_drop_history(dropped_at);
