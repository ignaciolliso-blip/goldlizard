
CREATE TABLE public.miner_prices (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date date NOT NULL,
  ticker text NOT NULL DEFAULT 'GDX',
  close_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.miner_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read miner_prices" ON public.miner_prices FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert miner_prices" ON public.miner_prices FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update miner_prices" ON public.miner_prices FOR UPDATE TO public USING (true) WITH CHECK (true);
