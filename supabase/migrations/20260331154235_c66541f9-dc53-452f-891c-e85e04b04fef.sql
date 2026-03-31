
-- 1. Create user_roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Admins can read all roles, users can read their own
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access on user_roles" ON public.user_roles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Drop all "Authenticated users can insert/update" policies on all 13 tables
DROP POLICY IF EXISTS "Authenticated users can insert uranium_reactors" ON public.uranium_reactors;
DROP POLICY IF EXISTS "Authenticated users can update uranium_reactors" ON public.uranium_reactors;
DROP POLICY IF EXISTS "Authenticated users can insert etf_holdings" ON public.etf_holdings;
DROP POLICY IF EXISTS "Authenticated users can update etf_holdings" ON public.etf_holdings;
DROP POLICY IF EXISTS "Authenticated users can insert miner_prices" ON public.miner_prices;
DROP POLICY IF EXISTS "Authenticated users can update miner_prices" ON public.miner_prices;
DROP POLICY IF EXISTS "Authenticated users can insert scenario_targets" ON public.scenario_targets;
DROP POLICY IF EXISTS "Authenticated users can update scenario_targets" ON public.scenario_targets;
DROP POLICY IF EXISTS "Authenticated users can insert narrator_cache" ON public.narrator_cache;
DROP POLICY IF EXISTS "Authenticated users can update narrator_cache" ON public.narrator_cache;
DROP POLICY IF EXISTS "Authenticated users can insert uranium_prices" ON public.uranium_prices;
DROP POLICY IF EXISTS "Authenticated users can update uranium_prices" ON public.uranium_prices;
DROP POLICY IF EXISTS "Authenticated users can insert data_cache" ON public.data_cache;
DROP POLICY IF EXISTS "Authenticated users can update data_cache" ON public.data_cache;
DROP POLICY IF EXISTS "Authenticated users can insert variable_explanations" ON public.variable_explanations;
DROP POLICY IF EXISTS "Authenticated users can update variable_explanations" ON public.variable_explanations;
DROP POLICY IF EXISTS "Authenticated users can insert etf_flows" ON public.etf_flows;
DROP POLICY IF EXISTS "Authenticated users can update etf_flows" ON public.etf_flows;
DROP POLICY IF EXISTS "Authenticated users can insert uranium_supply_demand" ON public.uranium_supply_demand;
DROP POLICY IF EXISTS "Authenticated users can update uranium_supply_demand" ON public.uranium_supply_demand;
DROP POLICY IF EXISTS "Authenticated users can insert miner_valuations" ON public.miner_valuations;
DROP POLICY IF EXISTS "Authenticated users can update miner_valuations" ON public.miner_valuations;
DROP POLICY IF EXISTS "Authenticated users can insert central_bank_gold" ON public.central_bank_gold;
DROP POLICY IF EXISTS "Authenticated users can update central_bank_gold" ON public.central_bank_gold;
DROP POLICY IF EXISTS "Authenticated users can insert sector_pnav_history" ON public.sector_pnav_history;
DROP POLICY IF EXISTS "Authenticated users can update sector_pnav_history" ON public.sector_pnav_history;

-- 4. Add service_role write policies for ALL tables (some already exist for cache tables)
-- Cache tables already have service_role policies, add for the rest:
CREATE POLICY "Service role can insert uranium_reactors" ON public.uranium_reactors FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update uranium_reactors" ON public.uranium_reactors FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert etf_holdings" ON public.etf_holdings FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update etf_holdings" ON public.etf_holdings FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert miner_prices" ON public.miner_prices FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update miner_prices" ON public.miner_prices FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert scenario_targets" ON public.scenario_targets FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update scenario_targets" ON public.scenario_targets FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert uranium_prices" ON public.uranium_prices FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update uranium_prices" ON public.uranium_prices FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert etf_flows" ON public.etf_flows FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update etf_flows" ON public.etf_flows FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert uranium_supply_demand" ON public.uranium_supply_demand FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update uranium_supply_demand" ON public.uranium_supply_demand FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert miner_valuations" ON public.miner_valuations FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update miner_valuations" ON public.miner_valuations FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert central_bank_gold" ON public.central_bank_gold FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update central_bank_gold" ON public.central_bank_gold FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert sector_pnav_history" ON public.sector_pnav_history FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update sector_pnav_history" ON public.sector_pnav_history FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- 5. Add admin-only write policies for data management tables (not cache tables)
CREATE POLICY "Admins can insert uranium_reactors" ON public.uranium_reactors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update uranium_reactors" ON public.uranium_reactors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert etf_holdings" ON public.etf_holdings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update etf_holdings" ON public.etf_holdings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert miner_prices" ON public.miner_prices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update miner_prices" ON public.miner_prices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert scenario_targets" ON public.scenario_targets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update scenario_targets" ON public.scenario_targets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert uranium_prices" ON public.uranium_prices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update uranium_prices" ON public.uranium_prices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert etf_flows" ON public.etf_flows FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update etf_flows" ON public.etf_flows FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert uranium_supply_demand" ON public.uranium_supply_demand FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update uranium_supply_demand" ON public.uranium_supply_demand FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert miner_valuations" ON public.miner_valuations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update miner_valuations" ON public.miner_valuations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert central_bank_gold" ON public.central_bank_gold FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update central_bank_gold" ON public.central_bank_gold FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sector_pnav_history" ON public.sector_pnav_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sector_pnav_history" ON public.sector_pnav_history FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
