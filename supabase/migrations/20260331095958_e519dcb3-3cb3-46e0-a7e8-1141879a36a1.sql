
CREATE TABLE public.sector_pnav_history (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date date NOT NULL,
  sector_avg_pnav numeric NOT NULL DEFAULT 1.0,
  uranium_spot numeric NOT NULL DEFAULT 0,
  uranium_lt_contract numeric,
  source text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sector_pnav_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sector_pnav_history" ON public.sector_pnav_history FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert sector_pnav_history" ON public.sector_pnav_history FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update sector_pnav_history" ON public.sector_pnav_history FOR UPDATE TO public USING (true) WITH CHECK (true);
