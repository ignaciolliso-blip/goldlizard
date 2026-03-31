
-- Uranium prices (spot + long-term contract)
CREATE TABLE public.uranium_prices (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date date NOT NULL,
  spot_price numeric NOT NULL,
  lt_contract_price numeric DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(date)
);

ALTER TABLE public.uranium_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read uranium_prices" ON public.uranium_prices FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert uranium_prices" ON public.uranium_prices FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update uranium_prices" ON public.uranium_prices FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Uranium supply/demand
CREATE TABLE public.uranium_supply_demand (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quarter text NOT NULL,
  mine_production_mlb numeric NOT NULL DEFAULT 0,
  secondary_supply_mlb numeric NOT NULL DEFAULT 0,
  reactor_demand_mlb numeric NOT NULL DEFAULT 0,
  contracting_mlb numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(quarter)
);

ALTER TABLE public.uranium_supply_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read uranium_supply_demand" ON public.uranium_supply_demand FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert uranium_supply_demand" ON public.uranium_supply_demand FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update uranium_supply_demand" ON public.uranium_supply_demand FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Uranium reactors
CREATE TABLE public.uranium_reactors (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year integer NOT NULL,
  operating integer NOT NULL DEFAULT 0,
  under_construction integer NOT NULL DEFAULT 0,
  planned integer NOT NULL DEFAULT 0,
  capacity_gw numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(year)
);

ALTER TABLE public.uranium_reactors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read uranium_reactors" ON public.uranium_reactors FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert uranium_reactors" ON public.uranium_reactors FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update uranium_reactors" ON public.uranium_reactors FOR UPDATE TO public USING (true) WITH CHECK (true);
