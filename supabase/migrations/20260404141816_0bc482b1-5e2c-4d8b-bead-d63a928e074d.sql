
CREATE POLICY "Allow anon insert solana_metrics"
  ON public.solana_metrics FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update solana_metrics"
  ON public.solana_metrics FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon insert solana_agent_metrics"
  ON public.solana_agent_metrics FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update solana_agent_metrics"
  ON public.solana_agent_metrics FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon insert forecast_log"
  ON public.forecast_log FOR INSERT TO anon
  WITH CHECK (true);
