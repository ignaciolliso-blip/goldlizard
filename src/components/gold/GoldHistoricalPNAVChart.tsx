import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { GOLD_PNAV_ANNOTATIONS, GOLD_CYCLE_TABLE, HISTORICAL_AVG_PNAV } from '@/lib/leverageEngine';
import type { GoldPNAVHistoryPoint } from '@/lib/leverageEngine';
import { ExternalLink } from 'lucide-react';

interface Props {
  data: GoldPNAVHistoryPoint[];
  currentPNAV: number;
}

export default function GoldHistoricalPNAVChart({ data, currentPNAV }: Props) {
  const isMobile = useIsMobile();

  const chartData = useMemo(() => {
    if (data.length > 0) {
      return data.map(d => ({
        date: d.date,
        ts: new Date(d.date).getTime(),
        pnav: d.pnav,
      }));
    }
    return GOLD_PNAV_ANNOTATIONS.map(a => ({
      date: a.date + '-01',
      ts: new Date(a.date + '-01').getTime(),
      pnav: a.pnav,
    }));
  }, [data]);

  const todayTs = new Date().getTime();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg text-foreground">Historical Sector P/NAV Through Gold Mining Cycles</h3>
        <p className="text-sm text-muted-foreground mt-1">
          P/NAV below 0.5× = strong buy. P/NAV above 2.0× = take profits. The sweet spot is 0.8–1.5×.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <ResponsiveContainer width="100%" height={isMobile ? 280 : 360}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

            {/* Zone bands */}
            <ReferenceArea y1={0} y2={0.5} fill="hsl(142 76% 36%)" fillOpacity={0.08} />
            <ReferenceArea y1={0.5} y2={0.8} fill="hsl(142 76% 36%)" fillOpacity={0.05} />
            <ReferenceArea y1={0.8} y2={1.5} fill="hsl(45 93% 47%)" fillOpacity={0.05} />
            <ReferenceArea y1={1.5} y2={2.0} fill="hsl(0 84% 60%)" fillOpacity={0.05} />
            <ReferenceArea y1={2.0} y2={3.0} fill="hsl(0 84% 60%)" fillOpacity={0.08} />

            <ReferenceLine y={HISTORICAL_AVG_PNAV} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" opacity={0.6} label={{ value: `Avg ${HISTORICAL_AVG_PNAV}×`, position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <ReferenceLine y={1.0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.3} />

            <XAxis
              dataKey="ts" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
              stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
              domain={[0, 3.0]}
              tickFormatter={(v) => `${v.toFixed(1)}×`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                const annotation = GOLD_PNAV_ANNOTATIONS.find(a =>
                  d.date.startsWith(a.date)
                );
                return (
                  <div className="bg-card border border-border rounded-xl p-3 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-w-xs">
                    <p className="text-muted-foreground">{d.date}</p>
                    <p className="text-primary font-mono font-bold">{d.pnav?.toFixed(2)}× P/NAV</p>
                    {annotation && (
                      <>
                        <p className="text-foreground font-semibold mt-1">{annotation.label}</p>
                        <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{annotation.detail}</p>
                      </>
                    )}
                  </div>
                );
              }}
            />

            <Line
              dataKey="pnav" stroke="hsl(var(--primary))" strokeWidth={2.5}
              dot={(props: any) => {
                const annotation = GOLD_PNAV_ANNOTATIONS.find(a =>
                  props.payload?.date?.startsWith(a.date)
                );
                if (!annotation) return <g key={props.key} />;
                const isToday = annotation.date === '2026-03';
                return (
                  <circle
                    key={props.key}
                    cx={props.cx} cy={props.cy}
                    r={isToday ? 6 : 4}
                    fill={isToday ? 'hsl(var(--primary))' : 'hsl(var(--card))'}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                );
              }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-bullish/30" /> Deep discount (&lt;0.5×)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-neutral/30" /> Fair value (0.8–1.5×)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-bearish/30" /> Premium (&gt;1.5×)
          </span>
        </div>
      </div>

      {/* Cycle comparison table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            How Today Compares to Previous Gold Miner Cycles
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Cycle</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Gold</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">P/NAV</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Margin</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">What Happened Next</th>
              </tr>
            </thead>
            <tbody>
              {GOLD_CYCLE_TABLE.map((row, i) => {
                const isToday = row.cycle.includes('TODAY');
                const pnavNum = parseFloat(row.pnav);
                const pnavColor = pnavNum < 0.5 ? 'text-bullish' : pnavNum > 1.5 ? 'text-bearish' : 'text-neutral';
                return (
                  <tr
                    key={i}
                    className={`border-b border-border ${isToday ? 'bg-primary/5' : ''}`}
                  >
                    <td className={`px-4 py-2.5 font-mono ${isToday ? 'text-primary font-bold' : 'text-foreground'}`}>
                      {row.cycle}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-foreground">{row.price}</td>
                    <td className={`text-right px-4 py-2.5 font-mono font-semibold ${pnavColor}`}>{row.pnav}</td>
                    <td className="text-right px-4 py-2.5 font-mono text-foreground">{row.margin}</td>
                    <td className={`px-4 py-2.5 ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                      {row.result}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Key:</strong> P/NAV below 0.5× = strong buy (2015, 2022). P/NAV above 2.0× = take profits (2011).
            P/NAV 0.8–1.5× = hold and accumulate on dips (TODAY). Today's margins ($3,100/oz) are the highest in history
            — yet P/NAV (1.1×) is below the historical average (1.3×).
          </p>
        </div>
      </div>

      {/* Sources */}
      <p className="text-xs text-muted-foreground/60 text-center leading-relaxed">
        Sources: P/NAV estimates from S&P Global, BMO, RBC, Canaccord, Scotiabank GBM.
        AISC from company quarterly reports & WGC. Historical P/NAV approximate, reconstructed from public research.
        {' '}
        <a href="https://www.gold.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline hover:text-muted-foreground">
          World Gold Council <ExternalLink size={10} />
        </a>
      </p>
    </div>
  );
}
