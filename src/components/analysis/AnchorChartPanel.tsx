import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import type { AnchorResult } from '@/lib/anchorEngine';
import type { Observation } from '@/lib/dataFetcher';

interface Props {
  anchorResult: AnchorResult;
  goldSpot: Observation[];
  cpiData: Observation[];
  m2Data: Observation[];
  gdiWeightedEVs: Record<string, number>; // '3m','6m','1y','3y','5y' → price
  onBaselineChange: (b: '1971' | '2000') => void;
  baseline: '1971' | '2000';
}

interface ChartPoint {
  date: string;
  ts: number;
  gold?: number;
  cpiFV?: number;
  m2FV?: number;
  ev?: number;
  isForecast?: boolean;
}

const TIME_RANGES = ['5Y', '10Y', 'Max'] as const;
type TimeRange = typeof TIME_RANGES[number];

function percentileRank(value: number, arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return Math.round((sorted.filter(v => v < value).length / sorted.length) * 100);
}

export default function AnchorChartPanel({
  anchorResult, goldSpot, cpiData, m2Data, gdiWeightedEVs, onBaselineChange, baseline,
}: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('10Y');

  const chartData = useMemo(() => {
    const {
      historicalAvgGoldCPIRatio, historicalAvgGoldM2Ratio,
      currentCPI, currentM2,
    } = anchorResult;

    // Build maps for CPI and M2
    const cpiMap = new Map<string, number>();
    cpiData.forEach(o => cpiMap.set(o.date.substring(0, 7), o.value));

    const m2MonthMap = new Map<string, number>();
    m2Data.forEach(o => m2MonthMap.set(o.date.substring(0, 7), o.value));

    // Determine start date
    const now = new Date();
    let startDate = '2000-01-01';
    if (timeRange === '5Y') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 5);
      startDate = d.toISOString().split('T')[0];
    } else if (timeRange === '10Y') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 10);
      startDate = d.toISOString().split('T')[0];
    }

    // Historical points (monthly granularity for performance)
    const points: ChartPoint[] = [];
    const monthSet = new Set<string>();

    for (const obs of goldSpot) {
      if (obs.date < startDate) continue;
      const month = obs.date.substring(0, 7);
      if (monthSet.has(month)) continue;
      monthSet.add(month);

      let lastCpi: number | undefined;
      let lastM2: number | undefined;

      // forward-fill CPI and M2
      for (const [m, v] of cpiMap) {
        if (m <= month) lastCpi = v;
      }
      for (const [m, v] of m2MonthMap) {
        if (m <= month) lastM2 = v;
      }

      const cpiFV = lastCpi ? historicalAvgGoldCPIRatio * lastCpi : undefined;
      const m2FV = lastM2 ? historicalAvgGoldM2Ratio * lastM2 : undefined;

      points.push({
        date: obs.date,
        ts: new Date(obs.date).getTime(),
        gold: obs.value,
        cpiFV,
        m2FV,
      });
    }

    // Today's date string
    const todayStr = now.toISOString().split('T')[0];

    // Forecast points
    const horizons: { key: string; years: number }[] = [
      { key: '3m', years: 0.25 },
      { key: '6m', years: 0.5 },
      { key: '1y', years: 1 },
      { key: '3y', years: 3 },
      { key: '5y', years: 5 },
    ];

    for (const h of horizons) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + Math.round(h.years * 12));
      const dateStr = futureDate.toISOString().split('T')[0];

      const projCPI = currentCPI * Math.pow(1.027, h.years);
      const projM2 = currentM2 * Math.pow(1.06, h.years);

      points.push({
        date: dateStr,
        ts: futureDate.getTime(),
        cpiFV: historicalAvgGoldCPIRatio * projCPI,
        m2FV: historicalAvgGoldM2Ratio * projM2,
        ev: gdiWeightedEVs[h.key],
        isForecast: true,
      });
    }

    return { points, todayStr };
  }, [anchorResult, goldSpot, cpiData, m2Data, gdiWeightedEVs, timeRange]);

  const { goldCPIRatio, goldM2Ratio, goldCPIRatioSeries, goldM2RatioSeries, historicalAvgGoldCPIRatio, historicalAvgGoldM2Ratio } = anchorResult;

  const cpiPctile = useMemo(() => percentileRank(goldCPIRatio, goldCPIRatioSeries.map(s => s.value)), [goldCPIRatio, goldCPIRatioSeries]);
  const m2Pctile = useMemo(() => percentileRank(goldM2Ratio, goldM2RatioSeries.map(s => s.value)), [goldM2Ratio, goldM2RatioSeries]);

  const todayTs = new Date().getTime();

  const formatPrice = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground">The Anchor</h2>
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === r
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={chartData.points} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as ChartPoint;
                return (
                  <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
                    <p className="font-medium text-foreground mb-1">{d.date}{d.isForecast ? ' (projected)' : ''}</p>
                    {d.gold != null && <p className="text-primary">Gold: {formatPrice(d.gold)}</p>}
                    {d.cpiFV != null && <p className="text-bullish">CPI FV: {formatPrice(d.cpiFV)}</p>}
                    {d.m2FV != null && <p className="text-blue-400">M2 FV: {formatPrice(d.m2FV)}</p>}
                    {d.ev != null && <p className="text-primary">GDI-EV: {formatPrice(d.ev)}</p>}
                    {d.gold != null && d.cpiFV != null && d.m2FV != null && (
                      <p className="text-muted-foreground mt-1">
                        {((d.gold / d.cpiFV - 1) * 100).toFixed(0)}% vs CPI FV · {((d.gold / d.m2FV - 1) * 100).toFixed(0)}% vs M2 FV
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine x={todayTs} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.5} />

            {/* Shaded corridor between CPI and M2 FV */}
            <Area dataKey="m2FV" stroke="none" fill="hsl(var(--accent))" fillOpacity={0.06} />
            <Area dataKey="cpiFV" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />

            {/* Lines */}
            <Line dataKey="cpiFV" stroke="hsl(var(--bullish))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line dataKey="m2FV" stroke="#5C9CE6" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line
              dataKey="gold"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              dataKey="ev"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs font-mono text-muted-foreground">
        <span>Gold/CPI: {goldCPIRatio.toFixed(2)} ({cpiPctile}th pctile vs {baseline}+ avg of {historicalAvgGoldCPIRatio.toFixed(2)})</span>
        <span>Gold/M2: {goldM2Ratio.toFixed(4)} ({m2Pctile}th pctile vs {baseline}+ avg of {historicalAvgGoldM2Ratio.toFixed(4)})</span>
      </div>

      {/* Baseline toggle */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Baseline:</span>
        {(['2000', '1971'] as const).map(b => (
          <button
            key={b}
            onClick={() => onBaselineChange(b)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              baseline === b
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {b}+
          </button>
        ))}
      </div>
    </div>
  );
}
