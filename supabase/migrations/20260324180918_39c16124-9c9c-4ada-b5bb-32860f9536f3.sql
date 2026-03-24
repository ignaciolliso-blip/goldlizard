
-- Add bar_coin_tonnes column to central_bank_gold (keeping table name for now to avoid breaking types)
ALTER TABLE public.central_bank_gold ADD COLUMN IF NOT EXISTS bar_coin_tonnes integer NOT NULL DEFAULT 0;

-- Create etf_flows table
CREATE TABLE IF NOT EXISTS public.etf_flows (
  id serial PRIMARY KEY,
  month text NOT NULL UNIQUE,
  flows_usd_bn numeric NOT NULL DEFAULT 0,
  holdings_tonnes numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.etf_flows ENABLE ROW LEVEL SECURITY;

-- RLS policies for etf_flows
CREATE POLICY "Anyone can read etf_flows" ON public.etf_flows FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert etf_flows" ON public.etf_flows FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update etf_flows" ON public.etf_flows FOR UPDATE TO public USING (true) WITH CHECK (true);
