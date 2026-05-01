import { supabase } from '@/integrations/supabase/client';

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
  // Pull pages of 1000 to bypass row limit
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

export async function triggerEconomyRefresh(): Promise<{
  fetched?: number;
  errors?: string[];
  duration_ms?: number;
}> {
  const { data, error } = await supabase.functions.invoke('fetch-economy-data', {
    body: {},
  });
  if (error) throw error;
  return data ?? {};
}
