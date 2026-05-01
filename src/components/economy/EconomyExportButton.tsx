import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAllEconomyData,
  type EconomyObservation,
  type EconomyForecast,
  type EconomyIndicatorConfig,
} from '@/lib/economyDataFetcher';
import { INDICATOR_DEFINITIONS, REGION_ORDER } from '@/lib/economyConfig';

function safeSheetName(name: string): string {
  // Excel: max 31 chars, no : \ / ? * [ ]
  const cleaned = name.replace(/[:\\\\/?*\\\\[\\\\]]/g, '-');
  return cleaned.slice(0, 31);
}

interface RowEntry {
  date: string;
  values: Partial<Record<string, number | null>>; // region -> value
  type: 'Actual' | 'Forecast';
  source: string;
}

function buildSheetForIndicator(
  indicator: EconomyIndicatorConfig | { indicator_id: string; label: string },
  observations: EconomyObservation[],
  forecasts: EconomyForecast[],
): any[][] {
  const indicatorId = indicator.indicator_id;
  const obs = observations.filter((o) => o.indicator_id === indicatorId);
  const fc = forecasts.filter((f) => f.indicator_id === indicatorId);

  // Map: date+type -> entry
  const map = new Map<string, RowEntry>();

  for (const o of obs) {
    const subKey = o.sub_category ? `|${o.sub_category}` : '';
    const key = `A|${o.observation_date}${subKey}`;
    if (!map.has(key)) {
      map.set(key, { date: o.observation_date, values: {}, type: 'Actual', source: o.source ?? '' });
    }
    map.get(key)!.values[o.region + (o.sub_category ? ` (${o.sub_category})` : '')] = o.value;
  }
  for (const f of fc) {
    const key = `F|${f.forecast_date}|${f.region}`;
    if (!map.has(key)) {
      map.set(key, {
        date: f.forecast_date,
        values: {},
        type: 'Forecast',
        source: f.source ?? '',
      });
    }
    map.get(key)!.values[f.region] = f.value;
  }

  const rows = Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.type.localeCompare(b.type);
  });

  const header = ['Date', 'Global', 'US', 'Europe', 'Spain', 'Type', 'Source'];
  const data: any[][] = [header];
  for (const r of rows) {
    data.push([
      r.date,
      r.values['global'] ?? '',
      r.values['us'] ?? '',
      r.values['europe'] ?? '',
      r.values['spain'] ?? '',
      r.type,
      r.source,
    ]);
    // For sub-categories (population_age), append per-region per-cohort rows are folded in keys above.
    // Simple fallback: include extra columns for any non-standard region keys
    const extraKeys = Object.keys(r.values).filter(
      (k) => !REGION_ORDER.includes(k as any),
    );
    for (const ek of extraKeys) {
      data.push([r.date, '', '', '', '', `Actual: ${ek}`, r.source ?? '']);
      data[data.length - 1][1 + ['global', 'us', 'europe', 'spain'].indexOf(ek.split(' ')[0])] =
        r.values[ek] ?? '';
    }
  }
  return data;
}

function buildReadme(): any[][] {
  const lines: any[][] = [
    ['Meridian — Economy Data Export'],
    ['Generated:', new Date().toISOString()],
    [],
    ['Data Sources:'],
    ['FRED', 'https://fred.stlouisfed.org'],
    ['ECB SDW', 'https://data-api.ecb.europa.eu'],
    ['IMF WEO', 'https://www.imf.org/en/Publications/WEO'],
    ['Eurostat', 'https://ec.europa.eu/eurostat'],
    ['UN Population Division', 'https://population.un.org/wpp/'],
    ['World Bank', 'https://data.worldbank.org'],
    ['OECD', 'https://data.oecd.org'],
    [],
    ['Regional Coverage Notes:'],
    ['- Global aggregate is unavailable for: policy_rate, m2_absolute, m2_yoy, bond_yield_10y, yield_curve.'],
    ['- Spain shares the ECB policy rate as a Eurozone member.'],
    ['- Yield curve definitions vary: US (10Y–2Y), Europe (Bund 10Y–3M), Spain (Bono–Bund spread).'],
    ['- M2 YoY values are derived from M2 absolute series.'],
    [],
    ['Each indicator has its own sheet. Columns: Date | Global | US | Europe | Spain | Type | Source.'],
    ['Type = Actual or Forecast (IMF WEO).'],
  ];
  return lines;
}

export default function EconomyExportButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    setLoading(true);
    try {
      const { observations, forecasts, config } = await fetchAllEconomyData();
      const wb = XLSX.utils.book_new();

      // README first
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildReadme()), 'README');

      // Use INDICATOR_DEFINITIONS to keep ordering stable, supplemented by config labels
      const labelById = new Map(config.map((c) => [c.indicator_id, c.label]));
      for (const def of INDICATOR_DEFINITIONS) {
        const label = labelById.get(def.id) ?? def.label;
        const sheetData = buildSheetForIndicator(
          { indicator_id: def.id, label },
          observations,
          forecasts,
        );
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName(label));
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `meridian-economy-${dateStr}.xlsx`);
    } catch (err: any) {
      console.error('Export failed', err);
      toast({
        title: 'Export failed',
        description: err?.message ?? 'Could not generate Excel file.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-economy/30 px-3 py-1.5 text-xs font-medium text-economy hover:bg-economy/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {loading ? 'Generating…' : 'Export All Data (.xlsx)'}
    </button>
  );
}
