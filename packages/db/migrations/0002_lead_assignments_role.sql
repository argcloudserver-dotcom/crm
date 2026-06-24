-- Add role + assignment_type to lead_assignments so we can track multi-role
-- assignments (director → TL+sales, admin → director+TL+sales) with full
-- history.
ALTER TABLE "lead_assignments"
  ADD COLUMN IF NOT EXISTS "assigned_to_role" varchar(32),
  ADD COLUMN IF NOT EXISTS "assignment_type" varchar(32) NOT NULL DEFAULT 'assign';

CREATE INDEX IF NOT EXISTS "lead_assignments_role_idx"
  ON "lead_assignments" ("assigned_to_role");
