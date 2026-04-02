
CREATE TABLE public.analysis_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset TEXT NOT NULL,
  briefing TEXT NOT NULL,
  dashboard_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_label TEXT,
  price_at_prediction NUMERIC,
  predicted_price NUMERIC,
  target_date DATE,
  actual_price NUMERIC
);

CREATE INDEX idx_analysis_snapshots_asset_created ON public.analysis_snapshots (asset, created_at DESC);

ALTER TABLE public.analysis_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analysis_snapshots"
  ON public.analysis_snapshots FOR SELECT TO public USING (true);

CREATE POLICY "Admins can insert analysis_snapshots"
  ON public.analysis_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update analysis_snapshots"
  ON public.analysis_snapshots FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert analysis_snapshots"
  ON public.analysis_snapshots FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update analysis_snapshots"
  ON public.analysis_snapshots FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
