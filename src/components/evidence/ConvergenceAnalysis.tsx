import { useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Bar,
} from 'recharts';
import type { AnchorResult } from '@/lib/anchorEngine';
import { getZone } from '@/lib/anchorEngine';
import type { GDIResult } from '@/lib/gdiEngine';
import type { LeverageResult } from '@/lib/leverageEngine';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';
import { computeScenarioProbabilities } from '@/lib/scenarioEngine';
import type { ProjectionRow } from '@/lib/constants';

interface Props {
  anchorResult: AnchorResult | null;
  gdiResult: GDIResult | null;
  leverageResult: LeverageResult | null;
  currentGDI: number;
  currentGoldPrice: number;
  currentGDXPrice: number;
  scenarioConfig: ScenarioConfig | null;
  probs: ScenarioProbabilities;
  forwardGDI: Record<string, number>;
  horizonProbs: Record<string, ScenarioProbabilities>;
  projections: ProjectionRow[];
}

function derivePositioning(pctParity: number, gdiSignal: string, minerPercentile: number) {
  const minersUndervalued = minerPercentile < 25;
  const minersFairValue = minerPercentile >= 25 && minerPercentile <= 75;

  if (pctParity < 30 && gdiSignal === 'bullish' && minersUndervalued)
    return { text: 'STRONG BUY MINERS', color: 'bullish' };
  if (pctParity < 30 && gdiSignal === 'bearish')
    return { text: 'ACCUMULATE ON WEAKNESS', color: 'neutral' };
  if (pctParity >= 30 && pctParity < 60 && gdiSignal === 'bullish' && minersUndervalued)
    return { text: 'ACCUMULATE MINERS', color: 'bullish' };
  if (pctParity >= 30 && pctParity < 60 && gdiSignal === 'bullish' && minersFairValue)
    return { text: 'HOLD / ADD GOLD', color: 'primary' };
  if (pctParity >= 30 && pctParity < 60 && gdiSignal === 'bearish')
    return { text: 'HOLD', color: 'neutral' };
  if (pctParity >= 60 && pctParity < 100 && gdiSignal === 'bullish' && minersUndervalued)
    return { text: 'HOLD / ADD SELECTIVELY', color: 'primary' };
  if (pctParity >= 60 && pctParity < 100 && gdiSignal === 'bearish')
    return { text: 'TAKE PROFITS', color: 'destructive' };
  if (pctParity >= 100)
    return { text: 'REDUCE', color: 'destructive' };
  return { text: 'HOLD', color: 'neutral' };
}

const MATRIX_ROWS = [
  { pctMin: 100, pctMax: 999, label: 'Above Parity (>100%)' },
  { pctMin: 60, pctMax: 100, label: 'Elevated (60-100%)' },
  { pctMin: 30, pctMax: 60, label: 'Transition (30-60%)' },
  { pctMin: 10, pctMax: 30, label: 'Undervalued (10-30%)' },
  { pctMin: 0, pctMax: 10, label: 'Extreme (<10%)' },
];
const MATRIX_COLS = ['bullish', 'neutral', 'bearish'];
const MINER_STATES = [
  { label: 'Under (<25th)', pctile: 10 },
  { label: 'Fair (25-75th)', pctile: 50 },
  { label: 'Over (>75th)', pctile: 90 },
];

export default function ConvergenceAnalysis({
  anchorResult, gdiResult, leverageResult, currentGDI, currentGoldPrice, currentGDXPrice,
  scenarioConfig, probs, forwardGDI, horizonProbs,
}: Props) {
  const pctParity = anchorResult?.pctOfInvestableParity ?? 50;

  const gdiSignal = currentGDI > 0.5 ? 'bullish' : currentGDI < -0.5 ? 'bearish' : 'neutral';
  const minerPctile = leverageResult?.currentPercentile ?? 50;
  const currentPositioning = derivePositioning(pctParity, gdiSignal, minerPctile);

  const ratioChartData = useMemo(() => {
    if (!leverageResult) return [];
    const { ratioSeries, medianRatio } = leverageResult;
    const values = ratioSeries.map(r => r.value).sort((a, b) => a - b);
    const p25 = values[Math.floor(values.length * 0.25)] || 0;
    const p75 = values[Math.floor(values.length * 0.75)] || 0;
    return ratioSeries.map(r => ({
      date: r.date, ts: new Date(r.date).getTime(),
      ratio: r.value, p25, p75, median: medianRatio,
    }));
  }, [leverageResult]);

  const forwardGDIData = useMemo(() => {
    const horizons = [
      { key: 'now', label: 'Now', months: 0 },
      { key: '3m', label: '3M', months: 3 },
      { key: '6m', label: '6M', months: 6 },
      { key: '1y', label: '1Y', months: 12 },
      { key: '3y', label: '3Y', months: 36 },
      { key: '5y', label: '5Y', months: 60 },
    ];
    const now = new Date();
    return horizons.map(h => {
      const d = new Date(now);
      d.setMonth(d.getMonth() + h.months);
      const gdi = h.key === 'now' ? currentGDI : (forwardGDI[h.key] ?? 0);
      const hp = h.key === 'now' ? probs : (horizonProbs[h.key] ?? probs);
      return { label: h.label, ts: d.getTime(), gdi, bull: hp.bull * 100, base: hp.base * 100, bear: hp.bear * 100 };
    });
  }, [currentGDI, forwardGDI, horizonProbs, probs]);

  const colorMap: Record<string, string> = {
    bullish: 'text-bullish bg-bullish/10 border-bullish/30',
    primary: 'text-primary bg-primary/10 border-primary/30',
    neutral: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    destructive: 'text-destructive bg-destructive/10 border-destructive/30',
  };

  return (
    <div className="space-y-6">
      {/* Three-Lens Agreement Matrix */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Three-Lens Agreement Matrix</h3>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-secondary/20 rounded-lg p-3 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">The Anchor</p>
            <p className={`text-sm font-semibold ${pctParity >= 60 ? 'text-destructive' : pctParity < 30 ? 'text-bullish' : 'text-primary'}`}>
              {getZone(pctParity).label.split(' — ')[0]}
              {anchorResult && ` (${pctParity.toFixed(0)}%)`}
            </p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-3 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">The Forces</p>
            <p className={`text-sm font-semibold ${gdiSignal === 'bullish' ? 'text-bullish' : gdiSignal === 'bearish' ? 'text-destructive' : 'text-amber-400'}`}>
              {gdiSignal.charAt(0).toUpperCase() + gdiSignal.slice(1)} ({currentGDI > 0 ? '+' : ''}{currentGDI.toFixed(1)})
            </p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-3 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">The Leverage</p>
            <p className={`text-sm font-semibold ${minerPctile < 25 ? 'text-bullish' : minerPctile > 75 ? 'text-destructive' : 'text-amber-400'}`}>
              {minerPctile < 25 ? 'Undervalued' : minerPctile > 75 ? 'Overvalued' : 'Fair value'} ({Math.round(minerPctile)}th)
            </p>
          </div>
          <div className={`rounded-lg p-3 text-center border ${colorMap[currentPositioning.color]}`}>
            <p className="text-[9px] uppercase tracking-wider mb-1 opacity-70">Positioning</p>
            <p className="text-sm font-bold">{currentPositioning.text}</p>
          </div>
        </div>

        {/* Full matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Anchor \ Forces</th>
                {MATRIX_COLS.map(c => (
                  <th key={c} className="text-center px-2 py-1.5 text-muted-foreground font-medium capitalize" colSpan={3}>
                    {c}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <th />
                {MATRIX_COLS.map(c => MINER_STATES.map(ms => (
                  <th key={`${c}-${ms.label}`} className="text-center px-1 py-1 text-[8px] text-muted-foreground/60 font-normal">
                    {ms.label}
                  </th>
                )))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map(row => {
                // Use midpoint of the row's range for positioning lookup
                const rowPct = (row.pctMin + Math.min(row.pctMax, 150)) / 2;
                const isCurrentRow = pctParity >= row.pctMin && pctParity < row.pctMax;
                return (
                <tr key={row.label} className="border-b border-border/30">
                  <td className="px-2 py-2 text-muted-foreground font-medium">{row.label}</td>
                  {MATRIX_COLS.map(col => MINER_STATES.map(ms => {
                    const pos = derivePositioning(rowPct, col, ms.pctile);
                    const isCurrent = isCurrentRow && col === gdiSignal &&
                      ((minerPctile < 25 && ms.pctile < 25) || (minerPctile >= 25 && minerPctile <= 75 && ms.pctile === 50) || (minerPctile > 75 && ms.pctile > 75));
                    return (
                      <td key={`${row.label}-${col}-${ms.pctile}`} className="px-1 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          isCurrent ? `${colorMap[pos.color]} ring-1 ring-offset-1 ring-offset-card` : 'text-muted-foreground/60'
                        }`}>
                          {pos.text}
                          {isCurrent && ' ●'}
                        </span>
                      </td>
                    );
                  }))}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GDX/Gold Ratio Deep Dive */}
      {leverageResult && ratioChartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">GDX / Gold Ratio — 10-Year Deep Dive</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Historical ratio with median and 25th/75th percentile band</p>

          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={ratioChartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(ts) => new Date(ts).getFullYear().toString()} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(3)} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
                    <p className="text-muted-foreground">{d?.date}</p>
                    <p className="text-purple-400 font-mono">Ratio: {d?.ratio?.toFixed(4)}</p>
                  </div>
                );
              }} />
              <Area dataKey="p75" stroke="none" fill="hsl(270 95% 75%)" fillOpacity={0.06} />
              <Area dataKey="p25" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />
              <ReferenceLine y={leverageResult.medianRatio} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" opacity={0.5} label={{ value: 'Median', fill: 'hsl(var(--muted-foreground))', fontSize: 9, position: 'right' }} />
              <Line dataKey="ratio" stroke="hsl(270 95% 75%)" strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Forward GDI Projection */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">Forward GDI Projection</h3>
        <p className="text-[10px] text-muted-foreground mb-3">Projected GDI at each horizon with scenario probability distribution</p>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={forwardGDIData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
            <YAxis yAxisId="gdi" stroke="hsl(var(--primary))" fontSize={10} tickLine={false} axisLine={false} domain={[-2, 2]} />
            <YAxis yAxisId="prob" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
                  <p className="text-foreground font-semibold mb-1">{d?.label}</p>
                  <p className="text-primary font-mono">GDI: {d?.gdi > 0 ? '+' : ''}{d?.gdi?.toFixed(2)}</p>
                  <p className="text-bullish font-mono">Bull: {d?.bull?.toFixed(0)}%</p>
                  <p className="text-primary font-mono">Base: {d?.base?.toFixed(0)}%</p>
                  <p className="text-destructive font-mono">Bear: {d?.bear?.toFixed(0)}%</p>
                </div>
              );
            }} />
            <Line yAxisId="gdi" dataKey="gdi" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
            <Bar yAxisId="prob" dataKey="bull" fill="hsl(var(--bullish))" fillOpacity={0.4} stackId="probs" barSize={24} />
            <Bar yAxisId="prob" dataKey="base" fill="hsl(var(--primary))" fillOpacity={0.4} stackId="probs" barSize={24} />
            <Bar yAxisId="prob" dataKey="bear" fill="hsl(var(--destructive))" fillOpacity={0.4} stackId="probs" barSize={24} />
            <ReferenceLine yAxisId="gdi" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.3} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
