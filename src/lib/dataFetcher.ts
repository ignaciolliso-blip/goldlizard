import { supabase } from '@/integrations/supabase/client';
import { FRED_SERIES, CACHE_TTL_HOURS } from './constants';

export interface Observation {
  date: string;
  value: number;
}

export interface SeriesData {
  seriesId: string;
  observations: Observation[];
}

export interface CentralBankEntry {
  quarter: string;
  tonnes: number;
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
  // Check cache — use maybeSingle to avoid 406 on empty result
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

  // Update cache
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
    const res = await fetch('https://api.freegoldapi.com/v1/daily?start=2005-01-01&end=2026-03-23');
    const json = await res.json();

    let observations: Observation[] = [];
    if (Array.isArray(json)) {
      observations = json.map((d: any) => ({ date: d.date, value: d.price }));
    } else if (json.data && Array.isArray(json.data)) {
      observations = json.data.map((d: any) => ({ date: d.date, value: d.price || d.value }));
    }

    if (observations.length > 0) {
      await supabase.from('data_cache').upsert({
        series_id: 'GOLD_SPOT',
        data_json: observations as any,
        last_fetched: new Date().toISOString(),
      });
    }

    return observations;
  } catch (e) {
    console.error('Gold API failed:', e);
    return [];
  }
}

export async function fetchCentralBankGold(): Promise<CentralBankEntry[]> {
  const { data, error } = await supabase
    .from('central_bank_gold')
    .select('quarter, tonnes')
    .order('quarter', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchAllData(onStatus?: (msg: string) => void) {
  const fredResults: Record<string, Observation[]> = {};
  const errors: string[] = [];

  // Fetch CB data first (no external API)
  const cbPromise = fetchCentralBankGold();

  // Fetch all FRED series in parallel
  const fredPromises = FRED_SERIES.map(async (series) => {
    try {
      const obs = await fetchFredSeries(series.id, onStatus);
      fredResults[series.id] = obs;
    } catch (e) {
      errors.push(series.id);
      console.error(`Error fetching ${series.id}:`, e);
    }
  });

  // Fetch gold spot
  const goldPromise = fetchGoldSpot(onStatus);

  const [, goldSpot, centralBank] = await Promise.all([
    Promise.all(fredPromises),
    goldPromise,
    cbPromise,
  ]);

  return { fredResults, goldSpot, centralBank, errors };
}
