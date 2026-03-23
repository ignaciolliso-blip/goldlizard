
-- Data cache table for FRED API responses
CREATE TABLE public.data_cache (
  series_id TEXT PRIMARY KEY,
  data_json JSONB NOT NULL,
  last_fetched TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.data_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read data_cache" ON public.data_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can insert data_cache" ON public.data_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update data_cache" ON public.data_cache FOR UPDATE USING (true);

-- Central bank gold purchases quarterly data
CREATE TABLE public.central_bank_gold (
  id SERIAL PRIMARY KEY,
  quarter TEXT NOT NULL UNIQUE,
  tonnes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.central_bank_gold ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read central_bank_gold" ON public.central_bank_gold FOR SELECT USING (true);
CREATE POLICY "Anyone can insert central_bank_gold" ON public.central_bank_gold FOR INSERT WITH CHECK (true);

-- Scenario targets for forecast configuration
CREATE TABLE public.scenario_targets (
  id SERIAL PRIMARY KEY,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scenario_targets" ON public.scenario_targets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scenario_targets" ON public.scenario_targets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update scenario_targets" ON public.scenario_targets FOR UPDATE USING (true);
