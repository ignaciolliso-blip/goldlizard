ALTER TABLE public.economy_observations
  ADD COLUMN IF NOT EXISTS sub_category text;

-- Drop the old uniqueness if it exists, recreate including sub_category
DROP INDEX IF EXISTS economy_observations_unique_idx;
CREATE UNIQUE INDEX economy_observations_unique_idx
  ON public.economy_observations (indicator_id, region, observation_date, COALESCE(sub_category, ''));

ALTER TABLE public.economy_cache_meta
  ADD COLUMN IF NOT EXISTS notes text;

-- Forecasts uniqueness for upserts
DROP INDEX IF EXISTS economy_forecasts_unique_idx;
CREATE UNIQUE INDEX economy_forecasts_unique_idx
  ON public.economy_forecasts (indicator_id, region, forecast_date, source);

-- Cache meta uniqueness
ALTER TABLE public.economy_cache_meta
  DROP CONSTRAINT IF EXISTS economy_cache_meta_pkey;
ALTER TABLE public.economy_cache_meta
  ADD CONSTRAINT economy_cache_meta_pkey PRIMARY KEY (indicator_id, region);