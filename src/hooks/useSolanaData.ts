import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export interface SolanaMetrics {
  sol_price: number;
  sol_market_cap: number;
  sol_fdv: number;
  sol_volume_24h: number;
  btc_price: number;
  eth_price: number;
  tvl_usd: number;
  stablecoin_supply: number;
  daily_fees: number;
  daily_revenue: number;
  fdv_fee_ratio: number;
  eth_daily_fees: number;
  last_updated: string;
}

export interface SolanaDailyHistory {
  date: string;
  sol_price: number | null;
  sol_market_cap: number | null;
  sol_fdv: number | null;
  sol_volume_24h: number | null;
  tvl_usd: number | null;
  stablecoin_supply_usd: number | null;
  daily_fees_usd: number | null;
  daily_revenue_usd: number | null;
  annualised_fees: number | null;
  fdv_fee_ratio: number | null;
  daily_transactions: number | null;
  daily_active_addresses: number | null;
  btc_price: number | null;
  eth_price: number | null;
  eth_daily_fees: number | null;
}

export interface SolanaAgentMetric {
  date: string;
  x402_daily_transactions: number | null;
  x402_daily_volume_usd: number | null;
  agent_pct_of_total_txns: number | null;
  total_daily_transactions: number | null;
  source: string | null;
  notes: string | null;
}

export function useSolanaData() {
  const [metrics, setMetrics] = useState<SolanaMetrics | null>(null);
  const [history, setHistory] = useState<SolanaDailyHistory[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<SolanaAgentMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Trigger edge function to refresh if stale
        await supabase.functions.invoke('fetch-solana-data');

        // Read current metrics
        const { data: metricsData } = await supabase
          .from('solana_metrics' as any)
          .select('*');

        if (metricsData) {
          const m: any = {};
          let lastUpdated = '';
          (metricsData as any[]).forEach((row: any) => {
            m[row.metric_name] = row.value ?? 0;
            if (row.fetched_at && row.fetched_at > lastUpdated) {
              lastUpdated = row.fetched_at;
            }
          });
          m.last_updated = lastUpdated;
          setMetrics(m as SolanaMetrics);
        }

        // Read historical data for charts
        const { data: histData } = await supabase
          .from('solana_daily_history' as any)
          .select('*')
          .order('date', { ascending: true });
        setHistory((histData as any[]) || []);

        // Read agent metrics
        const { data: agentData } = await supabase
          .from('solana_agent_metrics' as any)
          .select('*')
          .order('date', { ascending: true });
        setAgentMetrics((agentData as any[]) || []);

      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { metrics, history, agentMetrics, loading, error };
}
