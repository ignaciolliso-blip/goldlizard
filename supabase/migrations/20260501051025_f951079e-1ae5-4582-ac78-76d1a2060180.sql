-- Clear stale error records so they retry on next refresh
DELETE FROM public.economy_cache_meta WHERE fetch_status = 'error';

-- Clear records that had no last_observation_date (silently failed)
DELETE FROM public.economy_cache_meta WHERE last_observation_date IS NULL;

-- Clean any zero-value GDP / debt rows from prior bad fetches
DELETE FROM public.economy_observations
WHERE indicator_id IN ('gdp_absolute','gdp_per_capita','debt_absolute','debt_pct_gdp')
  AND (value IS NULL OR value = 0);