import { forwardRef, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Maximize2, ExternalLink, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface EconomyIndicatorChartProps {
  indicatorId: string;
  region: 'global' | 'us' | 'europe' | 'spain';
  label: string;
  regionLabel: string;
  unit: string;
  sourceLabel: string;
  sourceUrl: string;
  chartType: 'line' | 'stacked_area';
  notes?: string;
  /** Optional override for the small card title; defaults to `label`. */
  cardTitle?: string;
  /** Custom message shown when the indicator is intentionally not applicable for this region. */
  emptyStateNote?: string;
  /** Footnote rendered beneath the chart (e.g. Euro Area data caveat). */
  regionNote?: string;
  accentColor?: string;
}

type ZoomMode = 'full' | 'ltm';

// Muted palette for stacked age groups
const STACK_COLORS = [
  'hsl(199 60% 35%)',
  'hsl(199 70% 45%)',
  'hsl(199 80% 55%)',
  'hsl(199 70% 65%)',
  'hsl(199 60% 75%)',
  'hsl(40 60% 55%)',
  'hsl(15 65% 55%)',
];

function formatYAxis(value: number, unit: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const u = unit.toLowerCase();
  if (u.includes('%') || u.includes('bps')) return `${value.toFixed(1)}`;
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return `${value.toFixed(1)}`;
}

// Parse YYYY-MM-DD as UTC to avoid timezone shifting the displayed day.
function parseISODate(iso: string): Date | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateShort(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  // Annual data convention: Jan 1 → show only the year
  if (d.getUTCMonth() === 0 && d.getUTCDate() === 1) {
    return `${d.getUTCFullYear()}`;
  }
  return `${MONTHS_SHORT[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(-2)}`;
}

function formatDateFull(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

interface ObservationRow {
  observation_date: string;
  value: number | null;
  sub_category: string | null;
}
interface ForecastRow {
  forecast_date: string;
  value: number | null;
  source: string | null;
}

async function fetchChartData(indicatorId: string, region: string) {
  const [obsRes, fcRes] = await Promise.all([
    supabase
      .from('economy_observations')
      .select('observation_date,value,sub_category')
      .eq('indicator_id', indicatorId)
      .eq('region', region)
      .order('observation_date', { ascending: true }),
    supabase
      .from('economy_forecasts')
      .select('forecast_date,value,source')
      .eq('indicator_id', indicatorId)
      .eq('region', region)
      .order('forecast_date', { ascending: true }),
  ]);

  if (obsRes.error) throw obsRes.error;
  if (fcRes.error) throw fcRes.error;

  return {
    observations: (obsRes.data ?? []) as ObservationRow[],
    forecasts: (fcRes.data ?? []) as ForecastRow[],
  };
}

interface ChartDatum {
  date: string;
  actual?: number | null;
  forecast?: number | null;
  forecastSource?: string | null;
  [k: string]: any;
}

function buildSeries(
  observations: ObservationRow[],
  forecasts: ForecastRow[],
  zoom: ZoomMode,
  chartType: 'line' | 'stacked_area',
): { data: ChartDatum[]; subCategories: string[] } {
  // Build date filter
  let cutoff: Date | null = null;
  if (zoom === 'ltm') {
    cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
  } else {
    cutoff = new Date('2000-01-01');
  }

  if (chartType === 'stacked_area') {
    // Pivot by date, columns = sub_category
    const subCategories = Array.from(
      new Set(observations.map((o) => o.sub_category).filter((s): s is string => !!s)),
    );
    const byDate = new Map<string, ChartDatum>();
    observations.forEach((o) => {
      const d = new Date(o.observation_date);
      if (cutoff && d < cutoff) return;
      const key = o.observation_date;
      if (!byDate.has(key)) byDate.set(key, { date: key });
      const row = byDate.get(key)!;
      if (o.sub_category) row[o.sub_category] = o.value;
    });
    const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    return { data, subCategories };
  }

  const map = new Map<string, ChartDatum>();
  observations.forEach((o) => {
    const d = new Date(o.observation_date);
    if (cutoff && d < cutoff) return;
    map.set(o.observation_date, {
      date: o.observation_date,
      actual: o.value,
    });
  });

  // For LTM, include all forecasts; for full, also include all forecasts
  forecasts.forEach((f) => {
    const existing = map.get(f.forecast_date);
    if (existing) {
      existing.forecast = f.value;
      existing.forecastSource = f.source;
    } else {
      map.set(f.forecast_date, {
        date: f.forecast_date,
        forecast: f.value,
        forecastSource: f.source,
      });
    }
  });

  // Bridge actual->forecast: copy last actual value into forecast at the same point
  const data = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  const lastActualIdx = [...data].reverse().findIndex((d) => d.actual != null);
  if (lastActualIdx !== -1 && forecasts.length > 0) {
    const idx = data.length - 1 - lastActualIdx;
    if (data[idx].forecast == null) data[idx].forecast = data[idx].actual;
  }
  return { data, subCategories: [] };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit: string;
}
const CustomTooltip = forwardRef<HTMLDivElement, CustomTooltipProps>(function CustomTooltip(
  { active, payload, label, unit },
  ref,
) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div ref={ref} className="rounded-md border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-foreground">{label ? formatDateFull(label) : ''}</div>
      <div className="mt-1 space-y-0.5">
        {payload.map((p: any) => {
          const isForecast = p.dataKey === 'forecast';
          const src = p.payload?.forecastSource;
          return (
            <div key={p.dataKey} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: p.color }}
              />
              <span className="text-muted-foreground">
                {isForecast ? `Forecast${src ? ` (${src})` : ''}` : p.name || 'Value'}:
              </span>
              <span className="font-mono text-foreground">
                {p.value != null ? `${formatYAxis(p.value, unit)} ${unit}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

interface ChartBodyProps {
  data: ChartDatum[];
  subCategories: string[];
  chartType: 'line' | 'stacked_area';
  unit: string;
  height: number;
  hasForecast: boolean;
}
const ChartBody = forwardRef<HTMLDivElement, ChartBodyProps>(function ChartBody(
  { data, subCategories, chartType, unit, height, hasForecast },
  ref,
) {
  const gridStroke = 'hsl(var(--border))';
  const tickStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

  // Build numeric time domain so Recharts can space ticks evenly across the
  // full range instead of treating each daily date as a categorical label.
  const timestamps = data
    .map((d) => parseISODate(d.date)?.getTime())
    .filter((t): t is number => typeof t === 'number');
  const xDomain: [number, number] | undefined =
    timestamps.length > 0 ? [Math.min(...timestamps), Math.max(...timestamps)] : undefined;
  const xTickFormatter = (ts: number) => {
    const iso = new Date(ts).toISOString().slice(0, 10);
    return formatDateShort(iso);
  };
  const tooltipLabelFormatter = (ts: any) => {
    if (typeof ts === 'number') return new Date(ts).toISOString().slice(0, 10);
    return String(ts);
  };
  const xAxisProps = {
    dataKey: 'ts' as const,
    type: 'number' as const,
    scale: 'time' as const,
    domain: xDomain ?? ['dataMin', 'dataMax'],
    tickFormatter: xTickFormatter,
    tick: tickStyle,
    stroke: gridStroke,
    minTickGap: 40,
  };

  // Augment data with numeric timestamp
  const numericData = data.map((d) => ({ ...d, ts: parseISODate(d.date)?.getTime() ?? 0 }));

  if (chartType === 'stacked_area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={numericData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={gridStroke} strokeOpacity={0.4} vertical={false} />
          <XAxis {...xAxisProps} />
          <YAxis
            tick={tickStyle}
            stroke={gridStroke}
            tickFormatter={(v) => formatYAxis(v, unit)}
            label={{
              value: unit,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))', textAnchor: 'middle' },
            }}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} labelFormatter={tooltipLabelFormatter} />
          {subCategories.map((sc, i) => (
            <Area
              key={sc}
              type="monotone"
              dataKey={sc}
              stackId="1"
              stroke={STACK_COLORS[i % STACK_COLORS.length]}
              fill={STACK_COLORS[i % STACK_COLORS.length]}
              fillOpacity={0.7}
              name={sc}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={numericData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={gridStroke} strokeOpacity={0.4} vertical={false} />
        <XAxis {...xAxisProps} />
        <YAxis
          tick={tickStyle}
          stroke={gridStroke}
          tickFormatter={(v) => formatYAxis(v, unit)}
          label={{
            value: unit,
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))', textAnchor: 'middle' },
          }}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} labelFormatter={tooltipLabelFormatter} />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="hsl(var(--economy))"
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
        {hasForecast && (
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="hsl(var(--economy-light))"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
});

export default function EconomyIndicatorChart({
  indicatorId,
  region,
  label,
  regionLabel,
  unit,
  sourceLabel,
  sourceUrl,
  chartType,
  notes,
  cardTitle,
  emptyStateNote,
  regionNote,
}: EconomyIndicatorChartProps) {
  const displayTitle = cardTitle || label;
  const isNotApplicable = sourceLabel === 'N/A';
  const [zoom, setZoom] = useState<ZoomMode>('full');
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['economy-chart', indicatorId, region],
    queryFn: () => fetchChartData(indicatorId, region),
    staleTime: 5 * 60 * 1000,
    enabled: !isNotApplicable,
  });

  const { series, hasForecast, isEmpty } = useMemo(() => {
    if (!data) return { series: { data: [] as ChartDatum[], subCategories: [] }, hasForecast: false, isEmpty: true };
    const built = buildSeries(data.observations, data.forecasts, zoom, chartType);
    const empty = data.observations.length === 0 && data.forecasts.length === 0;
    return {
      series: built,
      hasForecast: data.forecasts.length > 0,
      isEmpty: empty,
    };
  }, [data, zoom, chartType]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-[220px] w-full bg-muted/50" />
      </div>
    );
  }

  // Empty / not applicable state
  if (isNotApplicable || isError || isEmpty) {
    const message = emptyStateNote || (isNotApplicable
      ? `Not applicable for ${regionLabel}`
      : `No data available for ${regionLabel}`);
    return (
      <div className="bg-card/50 border border-border/60 rounded-xl p-4 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-sm font-medium text-muted-foreground">{displayTitle}</div>
            <div className="text-xs text-muted-foreground/70">{regionLabel}</div>
          </div>
        </div>
        <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-center px-6">
          <Info className="h-6 w-6 text-muted-foreground/60 mb-2" />
          <div className="text-sm text-muted-foreground">{message}</div>
          {notes && !emptyStateNote && (
            <div className="text-xs text-muted-foreground/70 mt-1 italic max-w-xs">{notes}</div>
          )}
        </div>
      </div>
    );
  }

  const Header = ({ inDialog = false }: { inDialog?: boolean }) => (
    <div className="flex items-start justify-between gap-3">
      {!inDialog && (
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{displayTitle}</div>
          <div className="text-xs text-muted-foreground">{regionLabel}</div>
        </div>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title={`Source: ${sourceLabel}`}
        >
          <span className="hidden sm:inline">{sourceLabel}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={() => setZoom(zoom === 'full' ? 'ltm' : 'full')}
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide transition-colors',
            'bg-economy/10 text-economy hover:bg-economy/20',
          )}
        >
          {zoom === 'full' ? '20Y' : 'LTM'}
        </button>
        {!inDialog && (
          <button
            onClick={() => setExpanded(true)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Expand chart"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <Header />
        <ChartBody
          data={series.data}
          subCategories={series.subCategories}
          chartType={chartType}
          unit={unit}
          height={220}
          hasForecast={hasForecast}
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          {notes || regionNote ? (
            <div className="text-xs italic text-muted-foreground">
              {regionNote || notes}
            </div>
          ) : (
            <div />
          )}
          {hasForecast && (
            <div className="text-xs text-economy/70 whitespace-nowrap">↗ Forecast: IMF WEO</div>
          )}
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {label} <span className="text-muted-foreground font-normal">— {regionLabel}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Header inDialog />
            <ChartBody
              data={series.data}
              subCategories={series.subCategories}
              chartType={chartType}
              unit={unit}
              height={480}
              hasForecast={hasForecast}
            />
            <div className="flex items-center justify-between gap-3 text-xs">
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                Source: {sourceLabel}
                <ExternalLink className="h-3 w-3" />
              </a>
              {hasForecast && <div className="text-economy/70">↗ Forecast: IMF WEO</div>}
            </div>
            {notes && <div className="text-xs italic text-muted-foreground">{notes}</div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
