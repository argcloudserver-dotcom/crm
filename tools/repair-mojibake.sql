-- ============================================================
-- Repair Arabic mojibake (Ø§Ù„... pattern)
-- ============================================================
-- Cause: rows were imported with bytes already in UTF-8 but the
-- driver/connection treated them as Latin-1, so they were stored
-- as the UTF-8 of the Latin-1 reading of the original UTF-8 bytes.
--
-- Fix: for each affected text column, re-encode the stored UTF-8
-- string back to its Latin-1 byte form, then decode those bytes
-- as UTF-8.  Only touches rows that still contain the telltale
-- pattern, so it is idempotent and safe to re-run.
--
-- BACK UP THE DATABASE BEFORE RUNNING.
--   pg_dump $DATABASE_URL > backup-before-mojibake-repair.sql
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.__fix_mojibake(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN t IS NULL THEN NULL
    -- Only repair strings that look like double-encoded Arabic / Latin1.
    WHEN t ~ '[ØÙÚÛ]' THEN
      convert_from(convert_to(t, 'LATIN1'), 'UTF8')
    ELSE t
  END;
$$;

-- Leads
UPDATE public.leads SET
  name        = public.__fix_mojibake(name),
  address     = public.__fix_mojibake(address),
  notes       = public.__fix_mojibake(notes)
WHERE name ~ '[ØÙÚÛ]' OR address ~ '[ØÙÚÛ]' OR notes ~ '[ØÙÚÛ]';

-- Clients
UPDATE public.clients SET
  name    = public.__fix_mojibake(name),
  address = public.__fix_mojibake(address),
  notes   = public.__fix_mojibake(notes)
WHERE name ~ '[ØÙÚÛ]' OR address ~ '[ØÙÚÛ]' OR notes ~ '[ØÙÚÛ]';

-- Projects
UPDATE public.projects SET
  name       = public.__fix_mojibake(name),
  owner_name = public.__fix_mojibake(owner_name),
  location   = public.__fix_mojibake(location)
WHERE name ~ '[ØÙÚÛ]' OR owner_name ~ '[ØÙÚÛ]' OR location ~ '[ØÙÚÛ]';

-- Resale
UPDATE public.resale_units SET
  project_name = public.__fix_mojibake(project_name),
  owner_name   = public.__fix_mojibake(owner_name),
  address      = public.__fix_mojibake(address)
WHERE project_name ~ '[ØÙÚÛ]' OR owner_name ~ '[ØÙÚÛ]' OR address ~ '[ØÙÚÛ]';

-- Activities / comments (Arabic notes typed by sales)
UPDATE public.lead_activities SET
  message = public.__fix_mojibake(message)
WHERE message ~ '[ØÙÚÛ]';

DROP FUNCTION public.__fix_mojibake(text);

COMMIT;

-- After running, hard-reload the web app; cached query data may
-- still show the old strings until React Query refetches.
