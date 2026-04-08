import { supabase } from "@/integrations/supabase/client";

export interface CopperMarketData {
  id: string;
  date: string;
  spot_price_lb: number;
  spot_price_tonne: number;
  incentive_price_tonne: number;
  p90_aisc_tonne: number;
  deficit_current_year_kt: number | null;
  deficit_source: string | null;
  demand_2040_mt: number | null;
  supply_peak_year: number | null;
  fraser_survey_year: number | null;
  updated_at: string;
}

export interface CopperJurisdiction {
  id: string;
  country: string;
  fraser_rank_text: string | null;
  key_risk_vector: string | null;
  risk_tag: string;
  risk_color: string | null;
  narrative: string | null;
  sort_order: number;
}

export interface CopperForce {
  id: string;
  metric_name: string;
  category: string;
  current_value: string | null;
  prior_value: string | null;
  direction: string | null;
  source: string | null;
  notes: string | null;
  sort_order: number;
}

export interface CopperEquityName {
  id: string;
  name: string;
  ticker: string;
  exchange: string | null;
  tier: string;
  jurisdictions: { country: string; risk_tag: string }[] | null;
  aisc_lb: number | null;
  aisc_source: string | null;
  stage: string | null;
  key_catalyst: string | null;
  catalyst_date: string | null;
  catalyst_type: string | null;
  catalyst_status: string | null;
  rationale: string | null;
  is_ucits: boolean | null;
  isin: string | null;
  expense_ratio: number | null;
  aum_usd: number | null;
  position_size_pct: number | null;
  notes: string | null;
  sort_order: number;
  active: boolean;
}

export async function fetchCopperMarketData(): Promise<CopperMarketData | null> {
  const { data, error } = await supabase
    .from("copper_market_data")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as CopperMarketData;
}

export async function fetchCopperJurisdictions(): Promise<CopperJurisdiction[]> {
  const { data, error } = await supabase
    .from("copper_jurisdictions")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as CopperJurisdiction[];
}

export async function fetchCopperForces(): Promise<CopperForce[]> {
  const { data, error } = await supabase
    .from("copper_forces")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as CopperForce[];
}

export async function fetchCopperEquities(): Promise<CopperEquityName[]> {
  const { data, error } = await supabase
    .from("copper_equity_names")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as unknown) as CopperEquityName[];
}

export interface CopperSupplyDemandRow {
  id: string;
  year: number;
  demand_core_mt: number | null;
  demand_ev_mt: number | null;
  demand_grid_mt: number | null;
  demand_renewables_mt: number | null;
  demand_data_centers_mt: number | null;
  demand_defense_mt: number | null;
  demand_total_mt: number | null;
  supply_primary_mt: number | null;
  supply_secondary_mt: number | null;
  supply_total_mt: number | null;
  annual_balance_mt: number | null;
  cumulative_deficit_mt: number | null;
  scenario: string;
  source: string | null;
}

export async function fetchCopperSupplyDemand(scenario = "base"): Promise<CopperSupplyDemandRow[]> {
  const { data, error } = await supabase
    .from("copper_supply_demand_model")
    .select("*")
    .eq("scenario", scenario)
    .order("year", { ascending: true });

  if (error || !data) return [];
  return data as CopperSupplyDemandRow[];
}

export interface CopperEquityFinancial {
  id: string;
  equity_id: string;
  as_of_date: string;
  market_cap_usd_m: number | null;
  ev_usd_m: number | null;
  net_debt_usd_m: number | null;
  ev_ebitda: number | null;
  ev_ebitda_forward: number | null;
  p_nav: number | null;
  fcf_yield_pct: number | null;
  dividend_yield_pct: number | null;
  net_debt_ebitda: number | null;
  production_kt: number | null;
  production_growth_pct: number | null;
  reserve_life_years: number | null;
  copper_revenue_pct: number | null;
  capex_usd_m: number | null;
  insider_net_buying_usd_m: number | null;
  insider_flag: string | null;
  roic_pct: number | null;
  source: string | null;
  updated_at: string;
}

export async function fetchCopperFinancials(): Promise<CopperEquityFinancial[]> {
  const { data, error } = await supabase
    .from("copper_equity_financials")
    .select("*")
    .order("as_of_date", { ascending: false });

  if (error || !data) return [];
  return data as CopperEquityFinancial[];
}
