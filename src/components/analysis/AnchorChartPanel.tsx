import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, ReferenceArea,
} from 'recharts';
import type { AnchorResult } from '@/lib/anchorEngine';
import { HISTORICAL_ANNOTATIONS, ANCHOR_ZONES, getZone } from '@/lib/anchorEngine';
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
  ratio?: number;
  flat?: number;
  tracksM2?: number;
  reprice2011?: number;
  isForecast?: boolean;
}

const TIME_RANGES = ['10Y', '20Y', 'Max'] as const;
type TimeRange = typeof TIME_RANGES[number];

export default function AnchorChartPanel({ anchorResult, goldSpot, m2Data }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('Max');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const isMobile = useIsMobile();

  const { m2GoldRatio, currentM2, currentGoldPrice } = anchorResult;
  const M2_GROWTH = 0.06;

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

    // Filter historical ratio series
    const points: ChartPoint[] = anchorResult.ratioSeries
      .filter(o => o.date >= startDate)
      .map(o => ({
        date: o.date,
        ts: new Date(o.date).getTime(),
        ratio: o.value,
      }));

    // Add forward projection (5 years)
    const todayTs = now.getTime();
    const horizons = [0, 0.25, 0.5, 1, 2, 3, 4, 5];
    for (const y of horizons) {
      if (y === 0) continue;
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + Math.round(y * 12));
      const projM2 = currentM2 * Math.pow(1 + M2_GROWTH, y);

      // Flat: gold stays at current price
      const flatRatio = projM2 / currentGoldPrice;
      // Tracks M2: gold grows at M2 rate
      const tracksM2Ratio = projM2 / (currentGoldPrice * Math.pow(1 + M2_GROWTH, y));
      // Reprice to 2011: ratio moves toward 3.5
      const currentRatio = m2GoldRatio;
      const targetRatio = 3.5;
      const projectedRatio = currentRatio + (targetRatio - currentRatio) * Math.min(1, y / 5);

      points.push({
        date: futureDate.toISOString().split('T')[0],
        ts: futureDate.getTime(),
        flat: flatRatio,
        tracksM2: tracksM2Ratio,
        reprice2011: projectedRatio,
        isForecast: true,
      });
    }

    return { points, todayTs };
  }, [anchorResult, timeRange, currentM2, currentGoldPrice, m2GoldRatio]);

  // Filter annotations by time range and mobile
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

  // Projection prices at 5Y
  const proj5y = useMemo(() => {
    const projM2_5y = currentM2 * Math.pow(1 + M2_GROWTH, 5);
    return {
      flat: currentGoldPrice,
      flatRatio: (projM2_5y / currentGoldPrice).toFixed(1),
      tracksM2: currentGoldPrice * Math.pow(1 + M2_GROWTH, 5),
      tracksM2Ratio: m2GoldRatio.toFixed(1),
      reprice2011: projM2_5y / 3.5,
    };
  }, [currentM2, currentGoldPrice, m2GoldRatio]);

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <GuideTooltip id="anchor-chart" text="This chart shows the M2/Gold ratio over 55 years. Peaks (gold cheap) and troughs (gold expensive) correspond to major geopolitical and economic events. The pattern repeats: crisis pushes gold up, stability lets it drift, next crisis pushes it up again. Click any event marker for context.">
          <h2 className="font-display text-lg text-foreground">The Anchor — M2/Gold Ratio</h2>
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
          <ComposedChart data={chartData.points} margin={{ top: 20, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

            {/* Zone shading */}
            <ReferenceArea y1={15} y2={25} fill="hsl(var(--bullish))" fillOpacity={0.06} />
            <ReferenceArea y1={10} y2={15} fill="hsl(var(--bullish))" fillOpacity={0.04} />
            <ReferenceArea y1={5} y2={10} fill="hsl(var(--primary))" fillOpacity={0.04} />
            <ReferenceArea y1={3} y2={5} fill="hsl(var(--bearish))" fillOpacity={0.04} />
            <ReferenceArea y1={0} y2={3} fill="hsl(var(--bearish))" fillOpacity={0.08} />

            <XAxis
              dataKey="ts" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
              stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false}
            />
            <YAxis
              domain={[0, 22]}
              stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
            />

            {/* Zone labels on right */}
            <ReferenceLine y={20} stroke="none" label={{ value: 'GOLD CHEAP', fill: 'hsl(var(--bullish))', fontSize: 8, position: 'right' }} />
            <ReferenceLine y={12} stroke="none" label={{ value: 'UNDERVALUED', fill: 'hsl(var(--bullish))', fontSize: 8, position: 'right' }} />
            <ReferenceLine y={7.5} stroke="none" label={{ value: 'TRANSITION', fill: 'hsl(var(--primary))', fontSize: 8, position: 'right' }} />
            <ReferenceLine y={4} stroke="none" label={{ value: 'ELEVATED', fill: 'hsl(var(--bearish))', fontSize: 8, position: 'right' }} />
            <ReferenceLine y={1.5} stroke="none" label={{ value: 'EXPENSIVE', fill: 'hsl(var(--bearish))', fontSize: 8, position: 'right' }} />

            {/* Today reference line */}
            <ReferenceLine x={chartData.todayTs} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.5} />

            {/* Annotation reference lines */}
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
                    {d.ratio != null && <p className="text-primary font-mono">M2/Gold: {d.ratio.toFixed(1)} — {getZone(d.ratio).label}</p>}
                    {d.flat != null && <p className="text-bearish font-mono">Gold flat: ratio → {d.flat.toFixed(1)}</p>}
                    {d.tracksM2 != null && <p className="text-neutral font-mono">Tracks M2: ratio → {d.tracksM2.toFixed(1)}</p>}
                    {d.reprice2011 != null && <p className="text-bullish font-mono">Reprice to 2011: ratio → {d.reprice2011.toFixed(1)}</p>}
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

            {/* Main ratio line */}
            <Line dataKey="ratio" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} connectNulls />

            {/* Projection lines */}
            <Line dataKey="flat" stroke="hsl(var(--bearish))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line dataKey="tracksM2" stroke="hsl(var(--neutral))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line dataKey="reprice2011" stroke="hsl(var(--bullish))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend for projections */}
        <GuideTooltip id="proj-lines" text="The three forward lines show what happens to the ratio depending on whether gold stays flat (red — ratio rises, gold gets cheaper), keeps pace with money printing (amber — ratio flat), or reprices toward crisis levels (green — ratio falls). The GDI-Weighted Expected Value tells you which path is most likely given current forces.">
          <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-4 h-px bg-bearish inline-block" /> Gold flat: {fmt(proj5y.flat)} → ratio {proj5y.flatRatio}</span>
            <span className="flex items-center gap-1"><span className="w-4 h-px bg-neutral inline-block" /> Tracks M2: ~{fmt(proj5y.tracksM2)} → ratio ~{proj5y.tracksM2Ratio}</span>
            <span className="flex items-center gap-1"><span className="w-4 h-px bg-bullish inline-block" /> Reprice to 2011: ~{fmt(proj5y.reprice2011)} → ratio 3.5</span>
          </div>
        </GuideTooltip>

        {/* Show all events toggle */}
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
              <th className="text-center px-2 py-2 text-muted-foreground font-medium">Ratio</th>
              <th className="text-left px-2 py-2 text-muted-foreground font-medium hidden sm:table-cell">Last Seen</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">What Was Happening</th>
            </tr>
          </thead>
          <tbody>
            {ANCHOR_ZONES.slice().reverse().map(z => {
              const currentZone = getZone(m2GoldRatio);
              const isCurrent = z.zone === currentZone.zone;
              return (
                <tr key={z.zone} className={`border-b border-border/50 ${isCurrent ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                  <td className="px-3 py-2 font-medium text-foreground">
                    {z.label} {isCurrent && <span className="text-primary">●</span>}
                  </td>
                  <td className="text-center px-2 py-2 font-mono text-muted-foreground">
                    {z.range[0] === 0 ? `< ${z.range[1]}` : z.range[1] === 25 ? `> ${z.range[0]}` : `${z.range[0]}-${z.range[1]}`}
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
