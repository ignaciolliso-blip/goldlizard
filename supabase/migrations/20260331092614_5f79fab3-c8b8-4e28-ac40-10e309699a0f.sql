
CREATE TABLE public.etf_holdings (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  etf_ticker text NOT NULL DEFAULT 'URNM',
  company text NOT NULL,
  ticker text NOT NULL,
  weight_pct numeric NOT NULL DEFAULT 0,
  jurisdiction text NOT NULL DEFAULT '',
  market_cap_usd text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.etf_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read etf_holdings" ON public.etf_holdings FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert etf_holdings" ON public.etf_holdings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update etf_holdings" ON public.etf_holdings FOR UPDATE TO public USING (true) WITH CHECK (true);
