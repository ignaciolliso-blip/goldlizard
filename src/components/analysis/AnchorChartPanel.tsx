import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import type { AnchorResult } from '@/lib/anchorEngine';
import {
  HISTORICAL_ANNOTATIONS, M2_GROWTH, NET_PARITY_GROWTH, INVESTABLE_OZ,
  HISTORICAL_MEDIAN_PCT, HISTORICAL_MEAN_PCT,
} from '@/lib/anchorEngine';
import type { Observation } from '@/lib/dataFetcher';
import { GuideTooltip } from '@/components/GuideMode';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  anchorResult: AnchorResult;
  goldSpot: Observation[];
  m2Data: Observation[];
}

interface ChartPoint {
  date: string;
  ts: number;
  goldPrice?: number;
  impliedPrice?: number;
  flatGold?: number;
  tracksM2Gold?: number;
  towardParityGold?: number;
  projImplied?: number;
  isForecast?: boolean;
}

const TIME_RANGES = ['10Y', '20Y', 'Max'] as const;
type TimeRange = typeof TIME_RANGES[number];

function fmt(n: number): string {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtFull(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const ZONE_TABLE = [
  {
    zone: 'Above Parity (gold > implied)',
    pctRange: '> 100%',
    lastSeen: '1975-1980',
    context: 'Oil shocks, Cold War, 15% inflation. ONLY time gold exceeded its M2 implied price. Followed by 20yr bear market.',
    zoneKey: 'above_parity',
  },
  {
    zone: 'Approaching Parity',
    pctRange: '50-100%',
    lastSeen: 'TODAY (57%), 2011',
    context: 'Post-crisis QE, CB buying, de-dollarisation. Strong returns but above historical average of ~35%.',
    zoneKey: 'transition',
  },
  {
    zone: 'Transition',
    pctRange: '20-50%',
    lastSeen: '2005-2010, 2013-2024',
    context: 'Gold rallying but still well below parity. Typically the sweet spot for entry.',
    zoneKey: 'undervalued',
  },
  {
    zone: 'Undervalued',
    pctRange: '< 20%',
    lastSeen: '1999-2004',
    context: 'Dot-com, budget surpluses, CBs selling gold. Extreme complacency. Best entry in 50 years — gold rallied 7x.',
    zoneKey: 'extreme_undervaluation',
  },
];

export default function AnchorChartPanel({ anchorResult, goldSpot, m2Data }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('Max');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const isMobile = useIsMobile();

  const { pctOfInvestableParity, currentGoldPrice, investableParity, currentM2 } = anchorResult;

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate = '1971-01-01';
    if (timeRange === '10Y') {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 10);
      startDate = d.toISOString().split('T')[0];
    } else if (timeRange === '20Y') {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 20);
      startDate = d.toISOString().split('T')[0];
    }

    const points: ChartPoint[] = [];
    const goldSeries = anchorResult.goldSeries.filter(o => o.date >= startDate);
    const impliedSeries = anchorResult.impliedPriceSeries.filter(o => o.date >= startDate);

    const dateMap = new Map<string, ChartPoint>();
    for (const g of goldSeries) {
      dateMap.set(g.date, { date: g.date, ts: new Date(g.date).getTime(), goldPrice: g.value });
    }
    for (const ip of impliedSeries) {
      const existing = dateMap.get(ip.date);
      if (existing) {
        existing.impliedPrice = ip.value;
      } else {
        dateMap.set(ip.date, { date: ip.date, ts: new Date(ip.date).getTime(), impliedPrice: ip.value });
      }
    }

    const sorted = Array.from(dateMap.values()).sort((a, b) => a.ts - b.ts);
    points.push(...sorted);

    const todayTs = now.getTime();
    const horizons = [0, 0.5, 1, 2, 3, 4, 5];
    for (const y of horizons) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + Math.round(y * 12));

      const futureImplied = investableParity * Math.pow(1 + NET_PARITY_GROWTH, y);
      const tracksM2Price = currentGoldPrice * Math.pow(1 + M2_GROWTH, y);
      const targetPct = 0.75;
      const currentPct = pctOfInvestableParity / 100;
      const towardPct = currentPct + (targetPct - currentPct) * Math.min(1, y / 5);
      const towardParityPrice = futureImplied * towardPct;

      points.push({
        date: futureDate.toISOString().split('T')[0],
        ts: futureDate.getTime(),
        flatGold: currentGoldPrice,
        tracksM2Gold: tracksM2Price,
        towardParityGold: towardParityPrice,
        projImplied: futureImplied,
        isForecast: true,
      });
    }

    return { points, todayTs };
  }, [anchorResult, timeRange, currentGoldPrice, pctOfInvestableParity, investableParity]);

  const visibleAnnotations = useMemo(() => {
    const startDate = timeRange === '10Y'
      ? new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]
      : timeRange === '20Y'
      ? new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString().split('T')[0]
      : '1971-01-01';

    let filtered = HISTORICAL_ANNOTATIONS.filter(a => a.date >= startDate);
    if (isMobile && !showAllEvents) {
      filtered = filtered.filter(a => a.key);
    }
    return filtered;
  }, [timeRange, isMobile, showAllEvents]);

  const proj5y = useMemo(() => {
    const futureImplied = investableParity * Math.pow(1 + NET_PARITY_GROWTH, 5);
    const tracksM2Price = currentGoldPrice * Math.pow(1 + M2_GROWTH, 5);
    const towardParityPrice = futureImplied * 0.75;
    return {
      flat: currentGoldPrice,
      flatPct: ((currentGoldPrice / futureImplied) * 100).toFixed(0),
      tracksM2: tracksM2Price,
      tracksM2Pct: ((tracksM2Price / futureImplied) * 100).toFixed(0),
      towardParity: towardParityPrice,
      towardPct: '75',
      futureImplied,
    };
  }, [currentGoldPrice, investableParity]);

  const currentZoneKey = pctOfInvestableParity >= 100 ? 'above_parity'
    : pctOfInvestableParity >= 50 ? 'transition'
    : pctOfInvestableParity >= 20 ? 'undervalued'
    : 'extreme_undervaluation';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <GuideTooltip id="anchor-chart" text="This chart shows two lines: the actual gold price and its 'implied price' from the M2 money supply. The gap between them is the debasement that hasn't been priced in. Gold has only exceeded its implied price once — during the 1980 mania.">
            <h2 className="font-display text-xl text-foreground">Gold vs M2 Implied Price</h2>
          </GuideTooltip>
          <p className="text-sm text-muted-foreground mt-1">
            Gold price (gold line) vs M2 implied price (blue dashed). Click any marker for context.
          </p>
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                timeRange === r ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'
              }`}
            >{r}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 500}>
          <ComposedChart data={chartData.points} margin={{ top: 20, right: 50, bottom: 30, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

            <XAxis
              dataKey="ts" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
              stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false}
            />
            <YAxis
              scale="log"
              domain={['auto', 'auto']}
              tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
              stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}
              tickCount={5}
            />

            <ReferenceLine x={chartData.todayTs} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.5} />

            {visibleAnnotations.map(a => (
              <ReferenceLine
                key={a.date}
                x={new Date(a.date).getTime()}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 4"
                opacity={0.15}
              />
            ))}

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as ChartPoint;
                const annotation = HISTORICAL_ANNOTATIONS.find(a =>
                  Math.abs(new Date(a.date).getTime() - d.ts) < 60 * 24 * 60 * 60 * 1000
                );
                return (
                  <div className="bg-card border border-border rounded-xl p-4 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-w-sm">
                    <p className="font-medium text-foreground mb-1">{d.date}{d.isForecast ? ' (projected)' : ''}</p>
                    {d.goldPrice != null && <p className="text-primary font-mono">Gold: {fmtFull(d.goldPrice)}</p>}
                    {d.impliedPrice != null && <p className="text-blue-400 font-mono">M2 Implied: {fmtFull(d.impliedPrice)}</p>}
                    {d.goldPrice != null && d.impliedPrice != null && (
                      <p className="text-muted-foreground font-mono">
                        {((d.goldPrice / d.impliedPrice) * 100).toFixed(0)}% of parity
                      </p>
                    )}
                    {d.flatGold != null && <p className="text-bearish font-mono">Gold flat: {fmtFull(d.flatGold)}</p>}
                    {d.tracksM2Gold != null && <p className="text-neutral font-mono">Tracks M2: {fmtFull(d.tracksM2Gold)}</p>}
                    {d.towardParityGold != null && <p className="text-bullish font-mono">Toward parity: {fmtFull(d.towardParityGold)}</p>}
                    {d.projImplied != null && <p className="text-blue-400 font-mono">Implied: {fmtFull(d.projImplied)}</p>}
                    {annotation && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="font-semibold text-foreground">{annotation.label}</p>
                        <p className="text-muted-foreground mt-0.5 leading-relaxed">{annotation.detail}</p>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            <Line dataKey="impliedPrice" stroke="hsl(210 80% 60%)" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls name="M2 Implied" />
            <Line dataKey="goldPrice" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} connectNulls name="Gold" />

            <Line dataKey="projImplied" stroke="hsl(210 80% 60%)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
            <Line dataKey="flatGold" stroke="hsl(var(--bearish))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line dataKey="tracksM2Gold" stroke="hsl(var(--neutral))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line dataKey="towardParityGold" stroke="hsl(var(--bullish))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <GuideTooltip id="anchor-gap" text="The gap between the lines is the 'debasement gap' — money that's been printed but gold hasn't caught up to. When the gap narrows, gold is repricing toward the money supply.">
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-primary inline-block" /> Gold spot</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-px bg-blue-400 inline-block border-t border-dashed border-blue-400" /> M2 implied (inv. parity)</span>
          </div>
        </GuideTooltip>

        <GuideTooltip id="proj-lines" text="The three forward lines show what happens if gold stays flat (loses ground), tracks M2 (treads water at ~57%), or reprices toward 75% of parity (the bull case). The implied price line rises ~4.5%/yr.">
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1.5"><span className="w-5 h-px bg-bearish inline-block" /> Flat: {fmtFull(proj5y.flat)} → {proj5y.flatPct}%</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-px bg-neutral inline-block" /> Tracks M2: ~{fmtFull(proj5y.tracksM2)} → {proj5y.tracksM2Pct}%</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-px bg-bullish inline-block" /> Toward parity: ~{fmtFull(proj5y.towardParity)} → 75%</span>
          </div>
        </GuideTooltip>
        <p className="text-xs text-muted-foreground/60 text-center mt-2">
          Investable parity at 5yr: ~{fmtFull(proj5y.futureImplied)} | Uses current investable gold stock (86,389t)
        </p>

        {isMobile && (
          <button
            onClick={() => setShowAllEvents(p => !p)}
            className="text-xs text-primary mt-3 hover:underline"
          >
            {showAllEvents ? 'Show key events only' : 'Show all events'}
          </button>
        )}
      </div>

      {/* Historical Pattern Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Pattern</th>
                <th className="text-center px-3 py-3 text-muted-foreground font-medium">% Parity</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium hidden sm:table-cell">Last Seen</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">What Was Happening</th>
              </tr>
            </thead>
            <tbody>
              {ZONE_TABLE.map(z => {
                const isCurrent = z.zoneKey === currentZoneKey;
                return (
                  <tr key={z.zoneKey} className={`border-b border-border/50 ${isCurrent ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {z.zone} {isCurrent && <span className="text-primary">●</span>}
                    </td>
                    <td className="text-center px-3 py-3 font-mono text-muted-foreground">{z.pctRange}</td>
                    <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">{z.lastSeen}</td>
                    <td className="px-4 py-3 text-muted-foreground leading-relaxed">{z.context}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground/60">
            Historical average: ~{HISTORICAL_MEAN_PCT}% of parity (mean since 1980). Today: {pctOfInvestableParity.toFixed(0)}% — above average but below the only time gold exceeded parity.
          </p>
        </div>
      </div>
    </div>
  );
}
