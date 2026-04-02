import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, format, isToday, isPast, parseISO } from 'date-fns';

interface Snapshot {
  id: string;
  asset: string;
  briefing: string;
  dashboard_data: string;
  created_at: string;
  period_label: string | null;
  price_at_prediction: number | null;
  predicted_price: number | null;
  target_date: string | null;
  actual_price: number | null;
}

export function useAnalysisSnapshots(asset: string) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const saveSnapshot = useCallback(async (
    briefing: string,
    dashboardData: string,
    priceAtPrediction: number | null,
    predictedPrice: number | null,
  ) => {
    const now = new Date();
    const targetDate = addMonths(now, 1);
    const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    const periodLabel = `${quarter} ${now.getFullYear()} · ${format(now, 'MMM yyyy')}`;

    const { error } = await supabase.from('analysis_snapshots').insert({
      asset,
      briefing,
      dashboard_data: dashboardData,
      period_label: periodLabel,
      price_at_prediction: priceAtPrediction,
      predicted_price: predictedPrice,
      target_date: format(targetDate, 'yyyy-MM-dd'),
    });

    if (error) throw error;
  }, [asset]);

  const loadSnapshots = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('analysis_snapshots')
        .select('*')
        .eq('asset', asset)
        .order('created_at', { ascending: false })
        .limit(24);

      if (error) throw error;
      const rows = (data ?? []) as Snapshot[];

      // Find rows needing actual_price backfill
      const needsBackfill = rows.filter(
        r => r.actual_price == null && r.target_date &&
          (isToday(parseISO(r.target_date)) || isPast(parseISO(r.target_date)))
      );

      if (needsBackfill.length > 0) {
        let realPrice: number | null = null;

        if (asset === 'gold') {
          const { data: cache } = await supabase
            .from('data_cache')
            .select('data_json')
            .eq('series_id', 'GOLD_SPOT')
            .single();
          if (cache?.data_json) {
            const obs = cache.data_json as Array<{ date: string; value: number }>;
            if (obs.length > 0) {
              realPrice = obs[obs.length - 1].value;
            }
          }
        } else if (asset === 'uranium') {
          const { data: uRows } = await supabase
            .from('uranium_prices')
            .select('spot_price')
            .order('date', { ascending: false })
            .limit(1);
          if (uRows && uRows.length > 0) {
            realPrice = uRows[0].spot_price;
          }
        }

        if (realPrice != null) {
          const idsToUpdate = needsBackfill.map(r => r.id);
          await supabase
            .from('analysis_snapshots')
            .update({ actual_price: realPrice })
            .in('id', idsToUpdate);

          for (const row of rows) {
            if (idsToUpdate.includes(row.id)) {
              row.actual_price = realPrice;
            }
          }
        }
      }

      setSnapshots(rows);
    } finally {
      setLoadingHistory(false);
    }
  }, [asset]);

  return { snapshots, loadingHistory, saveSnapshot, loadSnapshots };
}
