import { supabase } from '@/integrations/supabase/client';
import { FRED_SERIES } from './constants';
import type { CentralBankEntry, EtfFlowEntry } from './gdiEngine';
import type { MinerPrice } from './leverageEngine';

export interface Observation {
  date: string;
  value: number;
}

export type { CentralBankEntry, EtfFlowEntry, MinerPrice };

export interface SeriesData {
  seriesId: string;
  observations: Observation[];
}

function parseObservations(rawObs: any[]): Observation[] {
  return rawObs
    .filter((o: any) => o.value !== '.' && !isNaN(parseFloat(o.value)))
    .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }));
}

export async function fetchFredSeries(
  seriesId: string,
  onStatus?: (msg: string) => void
): Promise<Observation[]> {
  const seriesInfo = FRED_SERIES.find(s => s.id === seriesId);
  onStatus?.(`Fetching ${seriesInfo?.name || seriesId}...`);

  // Edge function now handles caching server-side with service role
  const { data, error } = await supabase.functions.invoke('fred-proxy', {
    body: { series_id: seriesId, observation_start: '2005-01-01', cache_key: seriesId },
  });

  if (error) {
    console.error(`Edge function error for ${seriesId}:`, error);
    throw new Error(`Failed to fetch ${seriesId}`);
  }

  // If returned from cache, observations are already parsed
  if (data?.fromCache && Array.isArray(data.observations)) {
    return data.observations as Observation[];
  }

  if (!data?.observations) {
    console.error(`No observations for ${seriesId}:`, data);
    throw new Error(`Failed to fetch ${seriesId}: ${data?.error_message || 'no data'}`);
  }

  return parseObservations(data.observations);
}

export async function fetchGoldSpot(onStatus?: (msg: string) => void): Promise<Observation[]> {
  onStatus?.('Fetching Gold Spot Price...');

  try {
    // 1. Check data_cache for fresh GOLD_SPOT (< 6 hours old)
    const { data: cacheRow } = await supabase
      .from('data_cache')
      .select('data_json, last_fetched')
      .eq('series_id', 'GOLD_SPOT')
      .maybeSingle();

    if (cacheRow) {
      const age = Date.now() - new Date(cacheRow.last_fetched).getTime();
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      if (age < SIX_HOURS && Array.isArray(cacheRow.data_json)) {
        console.log('GOLD_SPOT: using fresh cache');
        return (cacheRow.data_json as any[]).map((o: any) => ({ date: o.date, value: Number(o.value) }));
      }
    }

    // 2. Cache stale/missing — call fred-proxy for fresh FRED data
    const { data, error } = await supabase.functions.invoke('fred-proxy', {
      body: { series_id: 'GOLDPMGBD228NLBM', observation_start: '2005-01-01', cache_key: 'GOLD_SPOT' },
    });

    if (error) throw error;

    if (data?.fromCache && Array.isArray(data.observations)) {
      return data.observations as Observation[];
    }

    if (!data?.observations) {
      throw new Error(data?.error_message || 'no data');
    }

    return parseObservations(data.observations);
  } catch (e) {
    // 3. Fallback to static JSON if both above fail
    console.warn('GOLD_SPOT: FRED fetch failed, falling back to static file:', e);
    try {
      const res = await fetch('/data/gold-historical.json');
      if (!res.ok) throw new Error(`Static file HTTP ${res.status}`);
      const json = await res.json();
      return (json as any[]).map((o: any) => ({ date: o.date, value: Number(o.value || o.price) }));
    } catch (fallbackErr) {
      console.error('GOLD_SPOT: all sources failed', fallbackErr);
      throw new Error('Failed to fetch gold spot price from any source');
    }
  }
}

export async function fetchPhysicalDemand(): Promise<CentralBankEntry[]> {
  const { data, error } = await supabase
    .from('central_bank_gold')
    .select('quarter, tonnes, bar_coin_tonnes')
    .order('quarter', { ascending: true });

  if (error) throw error;
  return (data || []).map(d => ({
    quarter: d.quarter,
    tonnes: d.tonnes,
    bar_coin_tonnes: (d as any).bar_coin_tonnes || 0,
  }));
}

export async function fetchEtfFlows(): Promise<EtfFlowEntry[]> {
  const { data, error } = await supabase
    .from('etf_flows')
    .select('month, flows_usd_bn, holdings_tonnes')
    .order('month', { ascending: true });

  if (error) throw error;
  return (data || []).map(d => ({
    month: d.month,
    flows_usd_bn: Number(d.flows_usd_bn),
    holdings_tonnes: Number(d.holdings_tonnes),
  }));
}

export async function fetchMinerPrices(): Promise<MinerPrice[]> {
  const { data, error } = await supabase
    .from('miner_prices')
    .select('date, ticker, close_price')
    .eq('ticker', 'GDX')
    .order('date', { ascending: true });

  if (error) throw error;
  return (data || []).map(d => ({
    date: String(d.date),
    ticker: d.ticker,
    close_price: Number(d.close_price),
  }));
}

export async function fetchAllData(onStatus?: (msg: string) => void) {
  const fredResults: Record<string, Observation[]> = {};
  const errors: string[] = [];

  const physicalPromise = fetchPhysicalDemand();
  const etfPromise = fetchEtfFlows();
  const minerPromise = fetchMinerPrices();

  const fredPromises = FRED_SERIES.map(async (series) => {
    try {
      const obs = await fetchFredSeries(series.id, onStatus);
      fredResults[series.id] = obs;
    } catch (e) {
      errors.push(series.id);
      console.error(`Error fetching ${series.id}:`, e);
    }
  });

  const goldPromise = fetchGoldSpot(onStatus);

  const [, goldSpot, physicalDemand, etfFlows, minerPrices] = await Promise.all([
    Promise.all(fredPromises),
    goldPromise,
    physicalPromise,
    etfPromise,
    minerPromise,
  ]);

  return { fredResults, goldSpot, physicalDemand, etfFlows, minerPrices, errors };
}
