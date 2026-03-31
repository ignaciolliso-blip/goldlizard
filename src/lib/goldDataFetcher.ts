import { supabase } from '@/integrations/supabase/client';
import type { GoldMinerValuation, GoldPNAVHistoryPoint } from './leverageEngine';

export async function fetchGoldMinerValuations(): Promise<GoldMinerValuation[]> {
  const { data, error } = await supabase
    .from('miner_valuations')
    .select('ticker, company, p_nav, aisc_per_oz, nav_usd_bn, jurisdiction, stage')
    .eq('commodity', 'gold')
    .order('nav_usd_bn', { ascending: false });

  if (error) throw error;
  return (data || []).map(d => ({
    ticker: d.ticker,
    company: d.company,
    p_nav: Number(d.p_nav),
    aisc_per_oz: Number((d as any).aisc_per_oz || 0),
    nav_usd_bn: Number(d.nav_usd_bn),
    jurisdiction: d.jurisdiction,
    stage: d.stage,
  }));
}

export async function fetchGoldPNAVHistory(): Promise<GoldPNAVHistoryPoint[]> {
  const { data, error } = await supabase
    .from('sector_pnav_history')
    .select('date, sector_avg_pnav, commodity_price, source, notes')
    .eq('commodity', 'gold')
    .order('date', { ascending: true });

  if (error) throw error;
  return (data || []).map(d => ({
    date: String(d.date),
    pnav: Number(d.sector_avg_pnav),
    goldPrice: Number((d as any).commodity_price || 0),
    source: (d as any).source || '',
    notes: (d as any).notes || '',
  }));
}
