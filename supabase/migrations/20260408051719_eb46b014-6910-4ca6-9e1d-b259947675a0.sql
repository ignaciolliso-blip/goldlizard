
-- Table 1: copper_market_data
CREATE TABLE public.copper_market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  spot_price_lb numeric NOT NULL,
  spot_price_tonne numeric NOT NULL,
  incentive_price_tonne numeric NOT NULL,
  p90_aisc_tonne numeric NOT NULL,
  deficit_current_year_kt numeric,
  deficit_source text,
  demand_2040_mt numeric,
  supply_peak_year integer,
  fraser_survey_year integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.copper_market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read copper_market_data" ON public.copper_market_data FOR SELECT TO public USING (true);
CREATE POLICY "Admins can write copper_market_data" ON public.copper_market_data FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role write copper_market_data" ON public.copper_market_data FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table 2: copper_jurisdictions
CREATE TABLE public.copper_jurisdictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  fraser_rank_text text,
  key_risk_vector text,
  risk_tag text NOT NULL DEFAULT 'MOD',
  risk_color text,
  narrative text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.copper_jurisdictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read copper_jurisdictions" ON public.copper_jurisdictions FOR SELECT TO public USING (true);
CREATE POLICY "Admins can write copper_jurisdictions" ON public.copper_jurisdictions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role write copper_jurisdictions" ON public.copper_jurisdictions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table 3: copper_equity_names
CREATE TABLE public.copper_equity_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ticker text NOT NULL,
  exchange text,
  tier text NOT NULL DEFAULT 'producer',
  jurisdictions jsonb,
  aisc_lb numeric,
  aisc_source text,
  stage text,
  key_catalyst text,
  catalyst_date date,
  catalyst_type text,
  catalyst_status text DEFAULT 'on_track',
  rationale text,
  is_ucits boolean DEFAULT false,
  isin text,
  expense_ratio numeric,
  aum_usd numeric,
  position_size_pct integer,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.copper_equity_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read copper_equity_names" ON public.copper_equity_names FOR SELECT TO public USING (true);
CREATE POLICY "Admins can write copper_equity_names" ON public.copper_equity_names FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role write copper_equity_names" ON public.copper_equity_names FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table 4: copper_forces
CREATE TABLE public.copper_forces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  category text NOT NULL DEFAULT 'demand',
  current_value text,
  prior_value text,
  direction text DEFAULT 'stable',
  source text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.copper_forces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read copper_forces" ON public.copper_forces FOR SELECT TO public USING (true);
CREATE POLICY "Admins can write copper_forces" ON public.copper_forces FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role write copper_forces" ON public.copper_forces FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table 5: copper_supply_demand_model
CREATE TABLE public.copper_supply_demand_model (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  demand_core_mt numeric,
  demand_ev_mt numeric,
  demand_grid_mt numeric,
  demand_renewables_mt numeric,
  demand_data_centers_mt numeric,
  demand_defense_mt numeric,
  demand_total_mt numeric,
  supply_primary_mt numeric,
  supply_secondary_mt numeric,
  supply_total_mt numeric,
  annual_balance_mt numeric,
  cumulative_deficit_mt numeric,
  scenario text NOT NULL DEFAULT 'base',
  source text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.copper_supply_demand_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read copper_supply_demand_model" ON public.copper_supply_demand_model FOR SELECT TO public USING (true);
CREATE POLICY "Admins can write copper_supply_demand_model" ON public.copper_supply_demand_model FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role write copper_supply_demand_model" ON public.copper_supply_demand_model FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table 6: copper_equity_financials
CREATE TABLE public.copper_equity_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equity_id uuid NOT NULL REFERENCES public.copper_equity_names(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  market_cap_usd_m numeric,
  ev_usd_m numeric,
  net_debt_usd_m numeric,
  ev_ebitda numeric,
  ev_ebitda_forward numeric,
  p_nav numeric,
  fcf_yield_pct numeric,
  dividend_yield_pct numeric,
  net_debt_ebitda numeric,
  production_kt numeric,
  production_growth_pct numeric,
  reserve_life_years numeric,
  copper_revenue_pct numeric,
  capex_usd_m numeric,
  insider_net_buying_usd_m numeric,
  insider_flag text,
  roic_pct numeric,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.copper_equity_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read copper_equity_financials" ON public.copper_equity_financials FOR SELECT TO public USING (true);
CREATE POLICY "Admins can write copper_equity_financials" ON public.copper_equity_financials FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role write copper_equity_financials" ON public.copper_equity_financials FOR ALL TO service_role USING (true) WITH CHECK (true);
