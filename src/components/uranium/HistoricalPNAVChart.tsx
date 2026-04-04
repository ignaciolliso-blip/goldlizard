import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExternalLink } from 'lucide-react';

export interface SectorPNAVPoint {
  date: string;
  sector_avg_pnav: number;
  uranium_spot: number;
  uranium_lt_contract: number | null;
  source: string;
  notes: string;
}

const PNAV_ANNOTATIONS = [
  { date: '2003-06-01', pnav: 1.0, label: 'Early bull — U at $10/lb', detail: 'Miners trading at or below NAV. Nobody wants uranium. Smart money (Rick Rule, Sprott) begins accumulating at deep discounts. This is the equivalent of buying gold miners in 2001.' },
  { date: '2005-06-01', pnav: 2.0, label: 'Bull acceleration', detail: 'Uranium has tripled to $30/lb. Miners re-rate as institutional money arrives. P/NAV expansion is now doing more work than the commodity price itself. Cameco trades at 2× NAV.' },
  { date: '2007-06-01', pnav: 4.5, label: 'MANIA PEAK — U at $136', detail: 'Miners at 3.5-5.0× NAV. Junior explorers with no reserves trade at absurd valuations. Cigar Lake flood triggers panic buying. P/NAV of 4-5× has never been sustained. Within 18 months, prices collapse 70%.' },
  { date: '2008-12-01', pnav: 1.5, label: 'GFC — P/NAV crashes', detail: 'Global financial crisis smashes uranium from $136 to $45. P/NAV compression from 4.5× to 1.5× in 18 months — a 67% multiple contraction on top of a 67% commodity price decline. Total miner losses: -80% to -90%.' },
  { date: '2011-02-01', pnav: 1.8, label: 'Pre-Fukushima recovery', detail: 'Uranium recovering to $70. Miners re-rate modestly. Nuclear renaissance narrative building. P/NAV at 1.8× — healthy premium for growth. One month before everything changes.' },
  { date: '2011-06-01', pnav: 1.2, label: 'FUKUSHIMA — instant re-rating', detail: 'Earthquake + tsunami destroy three reactors. Japan shuts 54 reactors. Germany announces full phase-out. P/NAV drops from 1.8× to 1.2× overnight. Beginning of a 5-year bear market.' },
  { date: '2016-11-01', pnav: 0.35, label: 'CYCLE TROUGH — U at $18', detail: 'P/NAV at 0.3-0.5×. The market is pricing in mine closures and bankruptcies. Cameco shuts McArthur River. Most juniors trade below cash value. Generational buying opportunity.' },
  { date: '2020-03-01', pnav: 0.6, label: 'COVID + Sprott buying', detail: 'Pandemic shuts mines. Sprott launches physical uranium trust, removing supply from spot market. P/NAV begins recovering. The structural bull case crystallises.' },
  { date: '2024-01-15', pnav: 1.7, label: 'U breaks $100 — miners re-rate', detail: 'Spot hits $106 for first time since 2007. Miners at 1.5-1.7× NAV. Market has priced in deficit but not yet mania-level premiums.' },
  { date: '2026-03-01', pnav: 1.5, label: 'TODAY — ~1.5× NAV', detail: 'After volatile 2025 (spot flat, equities +40%), miners at moderate premiums. Historical average since 2003: ~1.2×. Current 1.5× is one-third of the 2007 peak.' },
];

const CYCLE_TABLE_STATIC = [
  { cycle: '2003 Early Bull', price: '$10/lb', pnav: '1.0×', result: 'Uranium 10×\'d, miners 20×\'d' },
  { cycle: '2007 Mania Peak', price: '$136/lb', pnav: '4.5×', result: 'Uranium -70%, miners -90%' },
  { cycle: '2011 Pre-Fukushima', price: '$70/lb', pnav: '1.8×', result: 'Uranium -75%, miners -85%' },
  { cycle: '2016 Cycle Trough', price: '$18/lb', pnav: '0.35×', result: 'Uranium 5×\'d, miners 8×\'d' },
  { cycle: '2024 Recovery', price: '$106/lb', pnav: '1.7×', result: '[in progress]' },
];

interface Props {
  data: SectorPNAVPoint[];
  currentPNAV: number;
  currentSpotPrice?: number;
}

export default function HistoricalPNAVChart({ data, currentPNAV, currentSpotPrice }: Props) {
  const isMobile = useIsMobile();
  const CYCLE_TABLE = useMemo(() => {
    const spotLabel = currentSpotPrice && currentSpotPrice > 0 ? `$${Math.round(currentSpotPrice)}/lb` : '—';
    return [
      ...CYCLE_TABLE_STATIC,
      { cycle: 'TODAY (2026)', price: spotLabel, pnav: `${currentPNAV.toFixed(1)}×`, result: '???' },
    ];
  }, [currentPNAV, currentSpotPrice]);

  const chartData = useMemo(() => {
    if (!data.length) {
      // Use annotations as fallback
      return PNAV_ANNOTATIONS.map(a => ({
        date: a.date,
        ts: new Date(a.date).getTime(),
        pnav: a.pnav,
      }));
    }
    return data.map(d => ({
      date: d.date,
      ts: new Date(d.date).getTime(),
      pnav: d.sector_avg_pnav,
    }));
  }, [data]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
          HISTORICAL P/NAV THROUGH THE CYCLES
        </h3>
        <p className="text-sm text-muted-foreground">
          Sector-weighted P/NAV from 2003 to today — four complete uranium cycles
        </p>
      </div>

      {/* Chart */}
      <div style={{ height: isMobile ? 300 : 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 15, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            {/* Zone bands */}
            <ReferenceArea y1={0.2} y2={0.8} fill="hsl(var(--bullish))" fillOpacity={0.06} />
            <ReferenceArea y1={0.8} y2={1.5} fill="hsl(var(--primary))" fillOpacity={0.06} />
            <ReferenceArea y1={1.5} y2={3.0} fill="hsl(var(--neutral))" fillOpacity={0.06} />
            <ReferenceArea y1={3.0} y2={5.0} fill="hsl(var(--bearish))" fillOpacity={0.06} />
            {/* Historical average line */}
            <ReferenceLine y={1.2} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" opacity={0.5}
              label={{ value: 'Hist. Avg 1.2×', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <XAxis
              dataKey="ts" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 5]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
              width={45} tickLine={false} axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as any;
                const anno = PNAV_ANNOTATIONS.find(a => a.date === d.date);
                return (
                  <div className="bg-card border border-border rounded-xl p-3 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-w-[280px]">
                    <p className="text-muted-foreground text-xs">{d.date}</p>
                    <p className="font-mono font-semibold text-foreground mt-1">P/NAV: {d.pnav?.toFixed(2)}×</p>
                    {anno && (
                      <>
                        <p className="font-semibold text-uranium mt-1.5">{anno.label}</p>
                        <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{anno.detail}</p>
                      </>
                    )}
                  </div>
                );
              }}
            />
            {/* Annotation reference lines */}
            {PNAV_ANNOTATIONS.filter((_, i) => !isMobile || i % 2 === 0).map(a => (
              <ReferenceLine
                key={a.date}
                x={new Date(a.date).getTime()}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 4" strokeOpacity={0.3}
                label={isMobile ? undefined : { value: a.label, position: 'top', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
              />
            ))}
            <Line
              type="monotone" dataKey="pnav"
              stroke="hsl(var(--leverage-miner))" strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(var(--leverage-miner))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Zone legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {[
          { label: 'DISTRESSED (< 0.8×)', cls: 'bg-bullish/10 text-bullish' },
          { label: 'FAIR VALUE (0.8-1.5×)', cls: 'bg-primary/10 text-primary' },
          { label: 'PREMIUM (1.5-3.0×)', cls: 'bg-neutral/10 text-neutral' },
          { label: 'MANIA (3.0×+)', cls: 'bg-bearish/10 text-bearish' },
        ].map(z => (
          <div key={z.label} className={`px-2 py-1.5 rounded font-medium ${z.cls}`}>{z.label}</div>
        ))}
      </div>

      {/* Cycle comparison table */}
      <div className="bg-secondary/30 rounded-xl p-4 sm:p-5">
        <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
          HOW TODAY COMPARES TO PREVIOUS CYCLES
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 pr-3 font-medium">CYCLE</th>
                <th className="text-right py-2 px-3 font-medium">U PRICE</th>
                <th className="text-right py-2 px-3 font-medium">P/NAV</th>
                <th className="text-left py-2 pl-3 font-medium">WHAT HAPPENED NEXT</th>
              </tr>
            </thead>
            <tbody>
              {CYCLE_TABLE.map((row, i) => {
                const pnavNum = parseFloat(row.pnav);
                const color = pnavNum < 0.8 ? 'text-bullish' : pnavNum < 1.5 ? 'text-primary' : pnavNum < 3.0 ? 'text-neutral' : 'text-bearish';
                const isToday = i === CYCLE_TABLE.length - 1;
                return (
                  <tr key={row.cycle} className={`border-b border-border/50 ${isToday ? 'bg-uranium/5' : ''}`}>
                    <td className={`py-2 pr-3 ${isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {row.cycle}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-foreground">{row.price}</td>
                    <td className={`py-2 px-3 text-right font-mono font-semibold ${color}`}>{row.pnav}</td>
                    <td className="py-2 pl-3 text-muted-foreground">{row.result}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Reading */}
        <div className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <span className="font-semibold text-foreground">READING:</span> At {currentPNAV.toFixed(1)}× P/NAV,
            miners are above the historical average (1.2×) but FAR below the 2007 mania peak (4.5×). The premium
            is modest and arguably justified by the structural deficit. The risk-reward favours accumulating on
            pullbacks (when P/NAV drops toward 1.0-1.2×) rather than chasing at current levels.
          </p>
          <p>
            <span className="font-semibold text-foreground">KEY LESSON FROM HISTORY:</span> P/NAV above 2.5×
            has ALWAYS been followed by severe corrections. P/NAV below 0.5× has ALWAYS been followed by
            multi-year bull runs. Today at {currentPNAV.toFixed(1)}× is neither extreme — it's a hold/accumulate
            zone, not a strong buy or sell.
          </p>
        </div>
      </div>

      {/* Sources */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
        <p className="font-medium text-foreground/60">Sources:</p>
        <p>• P/NAV estimates: S&P Global Visible Alpha, Sprott Asset Management, broker consensus (BMO, Canaccord, Raymond James)</p>
        <p>
          • Uranium prices: TradeTech / UxC via Cameco{' '}
          <a href="https://www.cameco.com/invest/markets/uranium-price" target="_blank" rel="noopener noreferrer"
            className="text-uranium hover:underline inline-flex items-center gap-0.5">
            cameco.com <ExternalLink size={10} />
          </a>
        </p>
        <p>• Historical P/NAV data is approximate and reconstructed from publicly available research. Individual company NAVs vary by analyst assumptions (discount rate, uranium price deck, production timeline). The chart shows sector-weighted averages.</p>
        <p className="text-foreground/40">Last updated: {data.length ? data[data.length - 1].date : 'Q1 2026'}. Update quarterly.</p>
      </div>
    </div>
  );
}
