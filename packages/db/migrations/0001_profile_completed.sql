-- Add profile_completed flag for OAuth complete-profile flow.
-- Existing rows are backfilled to TRUE so current users are unaffected;
-- only new OAuth signups will get FALSE (set explicitly by the API).
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "profile_completed" boolean NOT NULL DEFAULT true;

-- If this migration is applied to a database that already has OAuth users
-- created by an older build, keep incomplete OAuth signup requests out of the
-- admin approval queue until they submit /complete-profile.
UPDATE "users"
SET "profile_completed" = false
WHERE "oauth_provider" IS NOT NULL
  AND "status" = 'pending'
  AND "role" = 'sales'
  AND "team_leader_id" IS NULL;
