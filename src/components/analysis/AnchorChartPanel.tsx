import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, ReferenceArea,
} from 'recharts';
import type { AnchorResult } from '@/lib/anchorEngine';
import { HISTORICAL_ANNOTATIONS, ANCHOR_ZONES, getZone, M2_GROWTH, GOLD_SUPPLY_GROWTH, NET_PARITY_GROWTH, INVESTABLE_OZ } from '@/lib/anchorEngine';
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
  pctParity?: number;
  flat?: number;
  tracksM2?: number;
  towardParity?: number;
  isForecast?: boolean;
}

const TIME_RANGES = ['10Y', '20Y', 'Max'] as const;
type TimeRange = typeof TIME_RANGES[number];

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function AnchorChartPanel({ anchorResult, goldSpot, m2Data }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('Max');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const isMobile = useIsMobile();

  const { pctOfInvestableParity, currentM2, currentGoldPrice, investableParity } = anchorResult;

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

    const points: ChartPoint[] = anchorResult.paritySeries
      .filter(o => o.date >= startDate)
      .map(o => ({
        date: o.date,
        ts: new Date(o.date).getTime(),
        pctParity: o.value,
      }));

    // Forward projection (5 years)
    const todayTs = now.getTime();
    const horizons = [0.25, 0.5, 1, 2, 3, 4, 5];
    for (const y of horizons) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + Math.round(y * 12));
      
      // Investable parity rises at NET_PARITY_GROWTH per year
      const futureInvParity = investableParity * Math.pow(1 + NET_PARITY_GROWTH, y);

      // Gold flat → % falls
      const flatPct = (currentGoldPrice / futureInvParity) * 100;
      // Gold tracks M2 → % roughly flat
      const tracksM2Price = currentGoldPrice * Math.pow(1 + M2_GROWTH, y);
      const tracksM2Pct = (tracksM2Price / futureInvParity) * 100;
      // Gold toward parity → target ~75-80%
      const targetPct = 75;
      const towardPct = pctOfInvestableParity + (targetPct - pctOfInvestableParity) * Math.min(1, y / 5);

      points.push({
        date: futureDate.toISOString().split('T')[0],
        ts: futureDate.getTime(),
        flat: flatPct,
        tracksM2: tracksM2Pct,
        towardParity: towardPct,
        isForecast: true,
      });
    }

    return { points, todayTs };
  }, [anchorResult, timeRange, currentM2, currentGoldPrice, pctOfInvestableParity, investableParity]);

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

  // 5Y projections for legend
  const proj5y = useMemo(() => {
    const futureInvParity = investableParity * Math.pow(1 + NET_PARITY_GROWTH, 5);
    const tracksM2Price = currentGoldPrice * Math.pow(1 + M2_GROWTH, 5);
    // Toward parity: 75% of future investable parity
    const towardParityPrice = futureInvParity * 0.75;
    return {
      flat: currentGoldPrice,
      flatPct: ((currentGoldPrice / futureInvParity) * 100).toFixed(0),
      tracksM2: tracksM2Price,
      tracksM2Pct: ((tracksM2Price / futureInvParity) * 100).toFixed(0),
      towardParity: towardParityPrice,
      towardPct: '75',
      futureInvParity,
    };
  }, [currentGoldPrice, investableParity]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <GuideTooltip id="anchor-chart" text="This chart shows gold's position relative to investable parity over 55 years. Peaks (gold expensive) and troughs (gold cheap) correspond to major events. The pattern repeats: crisis pushes gold up toward parity, stability lets it drift down.">
          <h2 className="font-display text-lg text-foreground">The Anchor — % of Investable Parity</h2>
        </GuideTooltip>
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === r ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'
              }`}
            >{r}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 500}>
          <ComposedChart data={chartData.points} margin={{ top: 20, right: 40, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

            {/* Zone shading */}
            <ReferenceArea y1={100} y2={200} fill="hsl(var(--bearish))" fillOpacity={0.06} />
            <ReferenceArea y1={60} y2={100} fill="hsl(var(--bearish))" fillOpacity={0.03} />
            <ReferenceArea y1={30} y2={60} fill="hsl(var(--primary))" fillOpacity={0.04} />
            <ReferenceArea y1={10} y2={30} fill="hsl(var(--bullish))" fillOpacity={0.04} />
            <ReferenceArea y1={0} y2={10} fill="hsl(var(--bullish))" fillOpacity={0.08} />

            <XAxis
              dataKey="ts" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
              stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false}
            />
            <YAxis
              domain={[0, 200]}
              tickFormatter={(v) => `${v}%`}
              stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
            />

            {/* Zone labels */}
            <ReferenceLine y={150} stroke="none" label={{ value: 'ABOVE PARITY', fill: 'hsl(var(--bearish))', fontSize: 8, position: 'right' }} />
            <ReferenceLine y={80} stroke="none" label={{ value: 'ELEVATED', fill: 'hsl(var(--bearish))', fontSize: 8, position: 'right' }} />
            <ReferenceLine y={45} stroke="none" label={{ value: 'TRANSITION', fill: 'hsl(var(--primary))', fontSize: 8, position: 'right' }} />
            <ReferenceLine y={20} stroke="none" label={{ value: 'UNDERVALUED', fill: 'hsl(var(--bullish))', fontSize: 8, position: 'right' }} />

            {/* 100% parity line */}
            <ReferenceLine y={100} stroke="hsl(210 80% 60%)" strokeDasharray="6 3" opacity={0.6} label={{ value: 'INVESTABLE PARITY', fill: 'hsl(210 80% 60%)', fontSize: 9, position: 'insideTopRight' }} />

            {/* Historical average ~45% */}
            <ReferenceLine y={45} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.3} label={{ value: 'HIST. AVG', fill: 'hsl(var(--muted-foreground))', fontSize: 8, position: 'insideBottomRight' }} />

            {/* Today */}
            <ReferenceLine x={chartData.todayTs} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.5} />

            {/* Annotation lines */}
            {visibleAnnotations.map(a => (
              <ReferenceLine
                key={a.date}
                x={new Date(a.date).getTime()}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 4"
                opacity={0.2}
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
                  <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg max-w-xs">
                    <p className="font-medium text-foreground mb-1">{d.date}{d.isForecast ? ' (projected)' : ''}</p>
                    {d.pctParity != null && <p className="text-primary font-mono">% of Inv. Parity: {d.pctParity.toFixed(1)}% — {getZone(d.pctParity).label}</p>}
                    {d.flat != null && <p className="text-bearish font-mono">Gold flat: → {d.flat.toFixed(1)}%</p>}
                    {d.tracksM2 != null && <p className="text-neutral font-mono">Tracks M2: → {d.tracksM2.toFixed(1)}%</p>}
                    {d.towardParity != null && <p className="text-bullish font-mono">Toward parity: → {d.towardParity.toFixed(1)}%</p>}
                    {annotation && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="font-semibold text-foreground">{annotation.label}</p>
                        <p className="text-muted-foreground mt-0.5">{annotation.detail}</p>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Main line */}
            <Line dataKey="pctParity" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} connectNulls />

            {/* Projections */}
            <Line dataKey="flat" stroke="hsl(var(--bearish))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line dataKey="tracksM2" stroke="hsl(var(--neutral))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line dataKey="towardParity" stroke="hsl(var(--bullish))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>

        <GuideTooltip id="proj-lines" text="Both parity levels rise every year because M2 grows at ~6%/yr while gold supply grows only ~1.5%/yr. The three lines show: gold flat (loses ground), tracks M2 (treads water), or reprices toward parity (bull case).">
          <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-4 h-px bg-bearish inline-block" /> Gold flat: {fmt(proj5y.flat)} → {proj5y.flatPct}%</span>
            <span className="flex items-center gap-1"><span className="w-4 h-px bg-neutral inline-block" /> Tracks M2: ~{fmt(proj5y.tracksM2)} → {proj5y.tracksM2Pct}%</span>
            <span className="flex items-center gap-1"><span className="w-4 h-px bg-bullish inline-block" /> Toward parity: ~{fmt(proj5y.towardParity)} → 75%</span>
          </div>
        </GuideTooltip>
        <p className="text-[9px] text-muted-foreground/60 text-center mt-1">Investable parity at 5yr: ~{fmt(proj5y.futureInvParity)}</p>

        {isMobile && (
          <button
            onClick={() => setShowAllEvents(p => !p)}
            className="text-[10px] text-primary mt-2 hover:underline"
          >
            {showAllEvents ? 'Show key events only' : 'Show all events'}
          </button>
        )}
      </div>

      {/* Five Zones Reference Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-[10px] sm:text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Zone</th>
              <th className="text-center px-2 py-2 text-muted-foreground font-medium">% Parity</th>
              <th className="text-left px-2 py-2 text-muted-foreground font-medium hidden sm:table-cell">Last Seen</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">What Was Happening</th>
            </tr>
          </thead>
          <tbody>
            {ANCHOR_ZONES.slice().reverse().map(z => {
              const currentZone = getZone(pctOfInvestableParity);
              const isCurrent = z.zone === currentZone.zone;
              return (
                <tr key={z.zone} className={`border-b border-border/50 ${isCurrent ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                  <td className="px-3 py-2 font-medium text-foreground">
                    {z.label} {isCurrent && <span className="text-primary">●</span>}
                  </td>
                  <td className="text-center px-2 py-2 font-mono text-muted-foreground">
                    {z.range[0] === 0 ? `< ${z.range[1]}%` : z.range[1] >= 200 ? `> ${z.range[0]}%` : `${z.range[0]}-${z.range[1]}%`}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground hidden sm:table-cell">{z.lastSeen}</td>
                  <td className="px-3 py-2 text-muted-foreground">{z.context}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
