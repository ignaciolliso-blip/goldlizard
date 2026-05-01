import { supabase } from '@/integrations/supabase/client';
import { INDICATOR_DEFINITIONS, REGION_ORDER, type EconomyRegion } from './economyConfig';

export interface EconomyObservation {
  id: number;
  indicator_id: string;
  region: string;
  observation_date: string;
  value: number | null;
  unit: string | null;
  source: string | null;
  sub_category: string | null;
  source_series_id: string | null;
}

export interface EconomyForecast {
  id: number;
  indicator_id: string;
  region: string;
  forecast_date: string;
  value: number | null;
  unit: string | null;
  source: string | null;
  publication_round: string | null;
}

export interface EconomyIndicatorConfig {
  indicator_id: string;
  label: string;
  description: string | null;
  category: string;
  unit_label: string | null;
  chart_type: string | null;
  display_order: number | null;
  notes: string | null;
}

export async function fetchAllEconomyData(): Promise<{
  observations: EconomyObservation[];
  forecasts: EconomyForecast[];
  config: EconomyIndicatorConfig[];
}> {
  async function fetchAll<T>(table: string, orderCol: string): Promise<T[]> {
    const all: T[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .order(orderCol, { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...(data as T[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  const [observations, forecasts, configRes] = await Promise.all([
    fetchAll<EconomyObservation>('economy_observations', 'observation_date'),
    fetchAll<EconomyForecast>('economy_forecasts', 'forecast_date'),
    supabase
      .from('economy_indicator_config')
      .select('*')
      .order('display_order', { ascending: true }),
  ]);

  if (configRes.error) throw configRes.error;
  return {
    observations,
    forecasts,
    config: (configRes.data ?? []) as EconomyIndicatorConfig[],
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RefreshSummary {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
  duration_ms: number;
}

/**
 * Trigger a refresh by invoking the edge function once per indicator+region
 * combination. Skips combinations where the source is 'N/A' (not applicable).
 * Calls are sequential with a 200ms delay to avoid overwhelming the runtime.
 */
export async function triggerEconomyRefresh(
  options: { forceRefresh?: boolean; onProgress?: (done: number, total: number) => void } = {},
): Promise<RefreshSummary> {
  const startedAt = Date.now();
  const combos: { indicator_id: string; region: EconomyRegion }[] = [];

  for (const def of INDICATOR_DEFINITIONS) {
    for (const region of REGION_ORDER) {
      if (def.sourceLabel[region] === 'N/A') continue;
      combos.push({ indicator_id: def.id, region });
    }
  }

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < combos.length; i++) {
    const c = combos[i];
    try {
      const { data, error } = await supabase.functions.invoke('fetch-economy-data', {
        body: { indicator_id: c.indicator_id, region: c.region, force_refresh: !!options.forceRefresh },
      });
      if (error) {
        failed++;
        errors.push(`${c.indicator_id}/${c.region}: ${error.message}`);
      } else {
        const errs = (data as any)?.errors as string[] | undefined;
        if (errs && errs.length) {
          failed++;
          errors.push(...errs);
        } else {
          succeeded++;
        }
      }
    } catch (e: any) {
      failed++;
      errors.push(`${c.indicator_id}/${c.region}: ${e?.message || String(e)}`);
    }
    options.onProgress?.(i + 1, combos.length);
    if (i < combos.length - 1) await sleep(200);
  }

  return {
    total: combos.length,
    succeeded,
    failed,
    errors,
    duration_ms: Date.now() - startedAt,
  };
}
