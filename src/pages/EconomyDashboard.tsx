import { useEffect, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import Footer from '@/components/Footer';
import EconomyIndicatorChart from '@/components/economy/EconomyIndicatorChart';
import EconomyExportButton from '@/components/economy/EconomyExportButton';
import { triggerEconomyRefresh } from '@/lib/economyDataFetcher';
import {
  INDICATOR_DEFINITIONS,
  REGION_LABELS,
  REGION_ORDER,
  type EconomyRegion,
} from '@/lib/economyConfig';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function EconomyDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  async function runRefresh(silent = false) {
    setRefreshing(true);
    try {
      const res = await triggerEconomyRefresh();
      // Invalidate every chart query
      queryClient.invalidateQueries({ queryKey: ['economy-chart'] });
      if (!silent) {
        toast({
          title: 'Data refreshed',
          description: `Updated ${res.fetched ?? 0} series${
            res.errors?.length ? ` (${res.errors.length} errors)` : ''
          }.`,
        });
      }
    } catch (err: any) {
      if (!silent) {
        toast({
          title: 'Refresh failed',
          description: err?.message ?? 'Could not refresh economy data.',
          variant: 'destructive',
        });
      } else {
        console.error('Background economy refresh failed', err);
      }
    } finally {
      setRefreshing(false);
    }
  }

  // Background refresh on mount — silent
  useEffect(() => {
    runRefresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-8 space-y-12">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl text-economy tracking-wide">
                Macro Economy
              </h1>
              {refreshing && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-economy/10 text-economy px-2 py-0.5 text-[11px] font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refreshing data…
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Key economic indicators across Global · United States · Europe · Spain
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Sources: FRED, ECB SDW, IMF WEO, Eurostat, OECD — free public data only
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <EconomyExportButton />
            <button
              onClick={() => runRefresh(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh Data
            </button>
          </div>
        </div>

        {/* Indicator rows */}
        {INDICATOR_DEFINITIONS.map((indicator) => (
          <section key={indicator.id} className="space-y-3">
            <div className="border-b border-border/40 pb-2">
              <h2 className="font-display text-lg text-foreground">{indicator.label}</h2>
              <p className="text-xs text-muted-foreground">{indicator.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {REGION_ORDER.map((region: EconomyRegion) => (
                <EconomyIndicatorChart
                  key={region}
                  indicatorId={indicator.id}
                  region={region}
                  label={indicator.label}
                  regionLabel={REGION_LABELS[region]}
                  unit={indicator.unit}
                  sourceLabel={indicator.sourceLabel[region]}
                  sourceUrl={indicator.sourceUrl[region]}
                  chartType={indicator.chartType}
                  notes={indicator.notes}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
