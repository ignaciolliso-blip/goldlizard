ALTER TABLE public.economy_observations 
DROP CONSTRAINT IF EXISTS economy_observations_indicator_id_region_observation_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS economy_observations_unique_idx 
ON public.economy_observations (indicator_id, region, observation_date, COALESCE(sub_category, ''));