import { supabase } from '@/integrations/supabase/client';
import type { UraniumPrice, UraniumSupplyDemand, UraniumReactor, MinerValuation } from './uraniumEngine';
import type { MinerPrice } from './leverageEngine';

export async function fetchUraniumPrices(): Promise<UraniumPrice[]> {
  const { data, error } = await supabase
    .from('uranium_prices')
    .select('*')
    .order('date', { ascending: true });
  if (error) throw new Error('Failed to fetch uranium prices: ' + error.message);
  return (data || []).map(r => ({
    date: r.date,
    spot_price: Number(r.spot_price),
    lt_contract_price: r.lt_contract_price ? Number(r.lt_contract_price) : null,
  }));
}

export async function fetchUraniumSupplyDemand(): Promise<UraniumSupplyDemand[]> {
  const { data, error } = await supabase
    .from('uranium_supply_demand')
    .select('*')
    .order('quarter', { ascending: true });
  if (error) throw new Error('Failed to fetch uranium supply/demand: ' + error.message);
  return (data || []).map(r => ({
    quarter: r.quarter,
    mine_production_mlb: Number(r.mine_production_mlb),
    secondary_supply_mlb: Number(r.secondary_supply_mlb),
    reactor_demand_mlb: Number(r.reactor_demand_mlb),
    contracting_mlb: Number(r.contracting_mlb),
  }));
}

export async function fetchUraniumReactors(): Promise<UraniumReactor[]> {
  const { data, error } = await supabase
    .from('uranium_reactors')
    .select('*')
    .order('year', { ascending: true });
  if (error) throw new Error('Failed to fetch uranium reactors: ' + error.message);
  return (data || []).map(r => ({
    year: r.year,
    operating: r.operating,
    under_construction: r.under_construction,
    planned: r.planned,
    capacity_gw: Number(r.capacity_gw),
  }));
}

export async function fetchUraniumMinerPrices(): Promise<MinerPrice[]> {
  const { data, error } = await supabase
    .from('miner_prices')
    .select('*')
    .in('ticker', ['URNM', 'U3O8'])
    .order('date', { ascending: true });
  if (error) throw new Error('Failed to fetch uranium miner prices: ' + error.message);
  return (data || []).map(r => ({
    date: r.date,
    ticker: r.ticker,
    close_price: Number(r.close_price),
  }));
}

export async function fetchMinerValuations(): Promise<MinerValuation[]> {
  const { data, error } = await supabase
    .from('miner_valuations')
    .select('*')
    .order('p_nav', { ascending: false });
  if (error) throw new Error('Failed to fetch miner valuations: ' + error.message);
  return (data || []).map(r => ({
    ticker: r.ticker,
    company: r.company,
    p_nav: Number(r.p_nav),
    ev_per_lb: Number(r.ev_per_lb),
    nav_usd_bn: Number(r.nav_usd_bn),
    resources_mlb: Number(r.resources_mlb),
    jurisdiction: r.jurisdiction,
    stage: r.stage,
    updated_at: r.updated_at,
  }));
}

export async function fetchAllUraniumData() {
  const [prices, supplyDemand, reactors, minerPrices, valuations] = await Promise.all([
    fetchUraniumPrices(),
    fetchUraniumSupplyDemand(),
    fetchUraniumReactors(),
    fetchUraniumMinerPrices(),
    fetchMinerValuations(),
  ]);
  return { prices, supplyDemand, reactors, minerPrices, valuations };
}
