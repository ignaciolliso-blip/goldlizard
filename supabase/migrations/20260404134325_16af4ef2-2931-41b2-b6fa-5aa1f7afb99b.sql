
-- Solana live metrics
CREATE TABLE IF NOT EXISTS public.solana_metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  value NUMERIC,
  value_text TEXT,
  source TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_name)
);

ALTER TABLE public.solana_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read solana_metrics" ON public.solana_metrics FOR SELECT USING (true);
CREATE POLICY "Service role write solana_metrics" ON public.solana_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can write solana_metrics" ON public.solana_metrics FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Solana daily history
CREATE TABLE IF NOT EXISTS public.solana_daily_history (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  sol_price NUMERIC,
  sol_market_cap NUMERIC,
  sol_fdv NUMERIC,
  sol_volume_24h NUMERIC,
  tvl_usd NUMERIC,
  stablecoin_supply_usd NUMERIC,
  daily_fees_usd NUMERIC,
  daily_revenue_usd NUMERIC,
  annualised_fees NUMERIC,
  fdv_fee_ratio NUMERIC,
  daily_transactions NUMERIC,
  daily_active_addresses NUMERIC,
  btc_price NUMERIC,
  eth_price NUMERIC,
  eth_daily_fees NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.solana_daily_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read solana_daily_history" ON public.solana_daily_history FOR SELECT USING (true);
CREATE POLICY "Service role write solana_daily_history" ON public.solana_daily_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can write solana_daily_history" ON public.solana_daily_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Solana agent metrics
CREATE TABLE IF NOT EXISTS public.solana_agent_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  x402_daily_transactions NUMERIC,
  x402_daily_volume_usd NUMERIC,
  agent_pct_of_total_txns NUMERIC,
  total_daily_transactions NUMERIC,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.solana_agent_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read solana_agent_metrics" ON public.solana_agent_metrics FOR SELECT USING (true);
CREATE POLICY "Service role write solana_agent_metrics" ON public.solana_agent_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can write solana_agent_metrics" ON public.solana_agent_metrics FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Forecast log (shared across assets)
CREATE TABLE IF NOT EXISTS public.forecast_log (
  id SERIAL PRIMARY KEY,
  asset TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  price_at_creation NUMERIC,
  target_1y NUMERIC,
  target_3y NUMERIC,
  basis TEXT,
  metadata JSONB,
  checked_at TIMESTAMPTZ,
  actual_price_at_check NUMERIC,
  verdict TEXT DEFAULT 'pending'
);

ALTER TABLE public.forecast_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read forecast_log" ON public.forecast_log FOR SELECT USING (true);
CREATE POLICY "Service role write forecast_log" ON public.forecast_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can write forecast_log" ON public.forecast_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
