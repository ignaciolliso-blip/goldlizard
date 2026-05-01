UPDATE public.economy_forecasts
SET value = value / 1000.0
WHERE indicator_id = 'gdp_absolute'
  AND region IN ('global','europe','spain')
  AND value > 1000;