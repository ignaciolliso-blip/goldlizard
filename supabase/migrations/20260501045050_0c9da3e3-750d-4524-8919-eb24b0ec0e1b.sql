-- Drop the expression index that PostgREST can't use for ON CONFLICT
DROP INDEX IF EXISTS public.economy_observations_unique_idx;

-- Backfill any NULL sub_category to empty string so we can use a real constraint
UPDATE public.economy_observations SET sub_category = '' WHERE sub_category IS NULL;

-- Set default + NOT NULL going forward
ALTER TABLE public.economy_observations
  ALTER COLUMN sub_category SET DEFAULT '',
  ALTER COLUMN sub_category SET NOT NULL;

-- Create proper unique constraint that PostgREST/upsert can target
ALTER TABLE public.economy_observations
  ADD CONSTRAINT economy_observations_unique
  UNIQUE (indicator_id, region, observation_date, sub_category);