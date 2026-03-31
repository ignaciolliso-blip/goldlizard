
CREATE TABLE public.miner_valuations (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticker text NOT NULL,
  company text NOT NULL,
  p_nav numeric NOT NULL DEFAULT 1.0,
  ev_per_lb numeric NOT NULL DEFAULT 0,
  nav_usd_bn numeric NOT NULL DEFAULT 0,
  resources_mlb numeric NOT NULL DEFAULT 0,
  jurisdiction text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.miner_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read miner_valuations" ON public.miner_valuations FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert miner_valuations" ON public.miner_valuations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update miner_valuations" ON public.miner_valuations FOR UPDATE TO public USING (true) WITH CHECK (true);
