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
