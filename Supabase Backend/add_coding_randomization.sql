-- Migration: Add selection_mode and random_config to coding_mappings, and create coding_question_assignments table

-- 1. Randomization config on coding_mappings
ALTER TABLE coding_mappings
  ADD COLUMN IF NOT EXISTS selection_mode TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS random_config TEXT NULL;

-- 2. Saved per-candidate assignment table
CREATE TABLE IF NOT EXISTS coding_question_assignments (
  id              SERIAL PRIMARY KEY,
  test_id         TEXT        NOT NULL,
  student_id      INTEGER     NOT NULL,
  problem_codes   TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  CONSTRAINT uq_coding_assignment UNIQUE (test_id, student_id)
);

CREATE INDEX IF NOT EXISTS ix_coding_assign_test ON coding_question_assignments(test_id);
CREATE INDEX IF NOT EXISTS ix_coding_assign_student ON coding_question_assignments(student_id);
