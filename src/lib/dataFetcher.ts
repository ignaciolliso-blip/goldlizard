import { supabase } from '@/integrations/supabase/client';
import { FRED_SERIES, CACHE_TTL_HOURS } from './constants';
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

function isCacheFresh(lastFetched: string): boolean {
  const fetched = new Date(lastFetched).getTime();
  const now = Date.now();
  return (now - fetched) < CACHE_TTL_HOURS * 60 * 60 * 1000;
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
  const { data: cached } = await supabase
    .from('data_cache')
    .select('*')
    .eq('series_id', seriesId)
    .maybeSingle();

  if (cached && isCacheFresh(cached.last_fetched)) {
    return cached.data_json as unknown as Observation[];
  }

  const seriesInfo = FRED_SERIES.find(s => s.id === seriesId);
  onStatus?.(`Fetching ${seriesInfo?.name || seriesId}...`);

  const { data, error } = await supabase.functions.invoke('fred-proxy', {
    body: { series_id: seriesId, observation_start: '2005-01-01' },
  });

  if (error) {
    console.error(`Edge function error for ${seriesId}:`, error);
    throw new Error(`Failed to fetch ${seriesId}`);
  }

  if (!data?.observations) {
    console.error(`No observations for ${seriesId}:`, data);
    throw new Error(`Failed to fetch ${seriesId}: ${data?.error_message || 'no data'}`);
  }

  const observations = parseObservations(data.observations);

  await supabase.from('data_cache').upsert({
    series_id: seriesId,
    data_json: observations as any,
    last_fetched: new Date().toISOString(),
  });

  return observations;
}

export async function fetchGoldSpot(onStatus?: (msg: string) => void): Promise<Observation[]> {
  const { data: cached } = await supabase
    .from('data_cache')
    .select('*')
    .eq('series_id', 'GOLD_SPOT')
    .maybeSingle();

  if (cached && isCacheFresh(cached.last_fetched)) {
    return cached.data_json as unknown as Observation[];
  }

  onStatus?.('Fetching Gold Spot Price...');

  try {
    const res = await fetch('/data/gold-historical.json');
    if (res.ok) {
      const observations: Observation[] = await res.json();
      if (observations.length > 0) {
        await supabase.from('data_cache').upsert({
          series_id: 'GOLD_SPOT',
          data_json: observations as any,
          last_fetched: new Date().toISOString(),
        });
      }
      return observations;
    }
  } catch (e) {
    console.error('Failed to load gold data:', e);
  }

  return [];
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
