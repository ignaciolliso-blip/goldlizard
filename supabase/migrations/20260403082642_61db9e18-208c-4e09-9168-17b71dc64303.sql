
-- Table 1: uranium_miner_universe
CREATE TABLE public.uranium_miner_universe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  stage TEXT NOT NULL,
  jurisdiction_hq TEXT,
  jurisdiction_operations TEXT NOT NULL,
  resources_mlb NUMERIC,
  resources_source_url TEXT,
  resources_source_date DATE,
  resources_approved BOOLEAN DEFAULT false,
  annual_production_mlb NUMERIC,
  production_source_url TEXT,
  capex_to_production_usd_m NUMERIC,
  capex_source_url TEXT,
  optionality_narrative TEXT,
  optionality_source_url TEXT,
  notes TEXT,
  last_ai_extraction TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.uranium_miner_universe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read uranium_miner_universe" ON public.uranium_miner_universe FOR SELECT USING (true);
CREATE POLICY "Allow public insert uranium_miner_universe" ON public.uranium_miner_universe FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update uranium_miner_universe" ON public.uranium_miner_universe FOR UPDATE TO anon USING (true);
CREATE POLICY "Service role can insert uranium_miner_universe" ON public.uranium_miner_universe FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update uranium_miner_universe" ON public.uranium_miner_universe FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Table 2: uranium_miner_financials
CREATE TABLE public.uranium_miner_financials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  share_price NUMERIC,
  market_cap_usd_bn NUMERIC,
  total_debt_usd_bn NUMERIC,
  cash_usd_bn NUMERIC,
  ebitda_usd_bn NUMERIC,
  ev_usd_bn NUMERIC,
  shares_outstanding_bn NUMERIC,
  annual_production_mlb NUMERIC
);

ALTER TABLE public.uranium_miner_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read uranium_miner_financials" ON public.uranium_miner_financials FOR SELECT USING (true);
CREATE POLICY "Allow public insert uranium_miner_financials" ON public.uranium_miner_financials FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update uranium_miner_financials" ON public.uranium_miner_financials FOR UPDATE TO anon USING (true);
CREATE POLICY "Service role can insert uranium_miner_financials" ON public.uranium_miner_financials FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update uranium_miner_financials" ON public.uranium_miner_financials FOR UPDATE TO service_role USING (true) WITH CHECK (true);
