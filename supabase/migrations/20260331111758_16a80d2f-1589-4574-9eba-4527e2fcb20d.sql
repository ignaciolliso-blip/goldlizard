
-- Drop all public INSERT policies
DROP POLICY IF EXISTS "Anyone can insert uranium_reactors" ON public.uranium_reactors;
DROP POLICY IF EXISTS "Anyone can insert etf_holdings" ON public.etf_holdings;
DROP POLICY IF EXISTS "Anyone can insert miner_prices" ON public.miner_prices;
DROP POLICY IF EXISTS "Anyone can insert scenario_targets" ON public.scenario_targets;
DROP POLICY IF EXISTS "Anyone can insert narrator_cache" ON public.narrator_cache;
DROP POLICY IF EXISTS "Anyone can insert uranium_prices" ON public.uranium_prices;
DROP POLICY IF EXISTS "Anyone can insert data_cache" ON public.data_cache;
DROP POLICY IF EXISTS "Anyone can insert variable_explanations" ON public.variable_explanations;
DROP POLICY IF EXISTS "Anyone can insert etf_flows" ON public.etf_flows;
DROP POLICY IF EXISTS "Anyone can insert uranium_supply_demand" ON public.uranium_supply_demand;
DROP POLICY IF EXISTS "Anyone can insert miner_valuations" ON public.miner_valuations;
DROP POLICY IF EXISTS "Anyone can insert central_bank_gold" ON public.central_bank_gold;
DROP POLICY IF EXISTS "Anyone can insert sector_pnav_history" ON public.sector_pnav_history;

-- Drop all public UPDATE policies
DROP POLICY IF EXISTS "Anyone can update uranium_reactors" ON public.uranium_reactors;
DROP POLICY IF EXISTS "Anyone can update etf_holdings" ON public.etf_holdings;
DROP POLICY IF EXISTS "Anyone can update miner_prices" ON public.miner_prices;
DROP POLICY IF EXISTS "Anyone can update scenario_targets" ON public.scenario_targets;
DROP POLICY IF EXISTS "Anyone can update narrator_cache" ON public.narrator_cache;
DROP POLICY IF EXISTS "Anyone can update uranium_prices" ON public.uranium_prices;
DROP POLICY IF EXISTS "Anyone can update data_cache" ON public.data_cache;
DROP POLICY IF EXISTS "Anyone can update variable_explanations" ON public.variable_explanations;
DROP POLICY IF EXISTS "Anyone can update etf_flows" ON public.etf_flows;
DROP POLICY IF EXISTS "Anyone can update uranium_supply_demand" ON public.uranium_supply_demand;
DROP POLICY IF EXISTS "Anyone can update miner_valuations" ON public.miner_valuations;
DROP POLICY IF EXISTS "Anyone can update central_bank_gold" ON public.central_bank_gold;
DROP POLICY IF EXISTS "Anyone can update sector_pnav_history" ON public.sector_pnav_history;

-- Recreate INSERT policies for authenticated users only
CREATE POLICY "Authenticated users can insert uranium_reactors" ON public.uranium_reactors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert etf_holdings" ON public.etf_holdings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert miner_prices" ON public.miner_prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert scenario_targets" ON public.scenario_targets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert narrator_cache" ON public.narrator_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert uranium_prices" ON public.uranium_prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert data_cache" ON public.data_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert variable_explanations" ON public.variable_explanations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert etf_flows" ON public.etf_flows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert uranium_supply_demand" ON public.uranium_supply_demand FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert miner_valuations" ON public.miner_valuations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert central_bank_gold" ON public.central_bank_gold FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert sector_pnav_history" ON public.sector_pnav_history FOR INSERT TO authenticated WITH CHECK (true);

-- Recreate UPDATE policies for authenticated users only
CREATE POLICY "Authenticated users can update uranium_reactors" ON public.uranium_reactors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update etf_holdings" ON public.etf_holdings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update miner_prices" ON public.miner_prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update scenario_targets" ON public.scenario_targets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update narrator_cache" ON public.narrator_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update uranium_prices" ON public.uranium_prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update data_cache" ON public.data_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update variable_explanations" ON public.variable_explanations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update etf_flows" ON public.etf_flows FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update uranium_supply_demand" ON public.uranium_supply_demand FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update miner_valuations" ON public.miner_valuations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update central_bank_gold" ON public.central_bank_gold FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update sector_pnav_history" ON public.sector_pnav_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Also allow service_role to INSERT/UPDATE on cache tables (for edge functions)
CREATE POLICY "Service role can insert data_cache" ON public.data_cache FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update data_cache" ON public.data_cache FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert narrator_cache" ON public.narrator_cache FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update narrator_cache" ON public.narrator_cache FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert variable_explanations" ON public.variable_explanations FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update variable_explanations" ON public.variable_explanations FOR UPDATE TO service_role USING (true) WITH CHECK (true);
