CREATE TABLE public.economy_observations (
  id BIGSERIAL PRIMARY KEY,
  indicator_id TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('global', 'us', 'europe', 'spain')),
  observation_date DATE NOT NULL,
  value NUMERIC,
  unit TEXT,
  source TEXT,
  source_series_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, region, observation_date)
);

CREATE TABLE public.economy_forecasts (
  id BIGSERIAL PRIMARY KEY,
  indicator_id TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('global', 'us', 'europe', 'spain')),
  forecast_date DATE NOT NULL,
  value NUMERIC,
  unit TEXT,
  source TEXT,
  publication_round TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, region, forecast_date, source)
);

CREATE TABLE public.economy_cache_meta (
  indicator_id TEXT NOT NULL,
  region TEXT NOT NULL,
  last_fetched TIMESTAMPTZ,
  last_observation_date DATE,
  fetch_status TEXT DEFAULT 'pending',
  error_message TEXT,
  PRIMARY KEY (indicator_id, region)
);

CREATE TABLE public.economy_indicator_config (
  indicator_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('structural', 'monetary')),
  unit_label TEXT,
  chart_type TEXT DEFAULT 'line' CHECK (chart_type IN ('line', 'stacked_area', 'bar')),
  display_order INTEGER,
  notes TEXT
);

ALTER TABLE public.economy_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access economy_observations" ON public.economy_observations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.economy_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access economy_forecasts" ON public.economy_forecasts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.economy_cache_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access economy_cache_meta" ON public.economy_cache_meta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.economy_indicator_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access economy_indicator_config" ON public.economy_indicator_config FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.economy_indicator_config (indicator_id, label, description, category, unit_label, chart_type, display_order, notes) VALUES
('gdp_absolute', 'GDP (Absolute)', 'Gross Domestic Product in current USD', 'structural', 'USD Trillions', 'line', 1, 'Annual for Global/IMF; Quarterly for US/EU; Quarterly for Spain'),
('debt_absolute', 'Government Debt (Absolute)', 'General government gross debt in current USD', 'structural', 'USD Trillions', 'line', 2, 'Annual for Global; Quarterly others'),
('debt_pct_gdp', 'Debt % of GDP', 'General government gross debt as % of GDP', 'structural', '% of GDP', 'line', 3, NULL),
('gdp_per_capita', 'GDP per Capita', 'GDP divided by total population, current USD', 'structural', 'USD', 'line', 4, NULL),
('population_age', 'Population by Age Group', 'Population split: 0-14, 15-24, 25-54, 55-64, 65+', 'structural', 'Millions', 'stacked_area', 5, 'Annual data only for all regions'),
('unemployment_youth', 'Youth Unemployment (Under 25)', 'Unemployment rate for population aged 15-24', 'structural', '%', 'line', 6, 'Monthly for US/Spain; Quarterly for Europe'),
('unemployment_total', 'Unemployment Rate (Total)', 'Total unemployment as % of labour force', 'structural', '%', 'line', 7, 'Monthly for US/Spain; Monthly for Europe'),
('cpi_yoy', 'CPI Year-on-Year', 'Consumer Price Index annual change', 'structural', '%', 'line', 8, 'Monthly for all regions; Global = IMF aggregated'),
('policy_rate', 'Central Bank Policy Rate', 'Official short-term policy interest rate', 'monetary', '%', 'line', 9, 'Global column intentionally empty — no single global rate'),
('m2_absolute', 'M2 Money Supply (Absolute)', 'Broad money supply M2 in current USD', 'monetary', 'USD Trillions', 'line', 10, 'Global column empty — no single global M2 aggregate'),
('m2_yoy', 'M2 Growth YoY', 'M2 money supply annual percentage change', 'monetary', '%', 'line', 11, 'Derived from m2_absolute'),
('bond_yield_10y', '10Y Government Bond Yield', '10-year benchmark government bond yield', 'monetary', '%', 'line', 12, 'Global column empty'),
('yield_curve', 'Yield Curve (10Y–2Y Spread)', 'Spread between 10-year and 2-year government bonds', 'monetary', 'bps', 'line', 13, 'US and Europe only. Spain shown as 10Y Bono minus 10Y Bund (sovereign risk spread)');