import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { GDIResult, TierContribution, VariableDetail } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import { TIER_LABELS, VARIABLE_CONFIG, type TierName } from '@/lib/constants';

interface Props {
  gdiResult: GDIResult;
  goldSpot: Observation[];
  currentGDI: number;
}

function GDITimeSeriesChart({ gdiResult, goldSpot }: { gdiResult: GDIResult; goldSpot: Observation[] }) {
  const chartData = useMemo(() => {
    const goldMap = new Map<string, number>();
    goldSpot.forEach(o => goldMap.set(o.date, o.value));

    const sampled: { date: string; gold?: number; gdi: number }[] = [];
    for (let i = 0; i < gdiResult.dates.length; i += 5) {
      const d = gdiResult.dates[i];
      sampled.push({ date: d, gold: goldMap.get(d), gdi: gdiResult.gdiValues[i] });
    }
    const lastIdx = gdiResult.dates.length - 1;
    if (lastIdx % 5 !== 0) {
      sampled.push({ date: gdiResult.dates[lastIdx], gold: goldMap.get(gdiResult.dates[lastIdx]), gdi: gdiResult.gdiValues[lastIdx] });
    }
    return sampled;
  }, [gdiResult, goldSpot]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => new Date(d).getFullYear().toString()}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="gold" orientation="left"
          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
          stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
        />
        <YAxis
          yAxisId="gdi" orientation="right"
          stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
          domain={[-2, 2]}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-card border border-border rounded-xl p-3 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <p className="text-muted-foreground">{d.date}</p>
                {d.gold && <p className="text-primary font-mono">Gold: ${d.gold.toLocaleString()}</p>}
                <p className="font-mono" style={{ color: 'hsl(var(--gold))' }}>GDI: {d.gdi.toFixed(3)}</p>
              </div>
            );
          }}
        />
        <Area yAxisId="gdi" dataKey="gdi" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.05} />
        <Line yAxisId="gold" dataKey="gold" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls />
        <Line yAxisId="gdi" dataKey="gdi" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function TierBars({ tierContributions }: { tierContributions: TierContribution }) {
  const navigate = useNavigate();
  const tiers: { key: TierName; label: string }[] = [
    { key: 'structural', label: 'Structural' },
    { key: 'demand', label: 'Demand' },
    { key: 'conditions', label: 'Conditions' },
  ];

  const maxAbs = Math.max(0.01, ...tiers.map(t => Math.abs(tierContributions[t.key])));

  return (
    <div className="space-y-3">
      {tiers.map(t => {
        const val = tierContributions[t.key];
        const pct = Math.min(100, (Math.abs(val) / maxAbs) * 100);
        const positive = val >= 0;
        return (
          <button key={t.key} onClick={() => navigate('/evidence')} className="w-full text-left group">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">{t.label}</span>
              <span className={`font-mono font-medium ${positive ? 'text-bullish' : 'text-bearish'}`}>
                {positive ? '+' : ''}{val.toFixed(2)}
              </span>
            </div>
            <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${positive ? 'bg-bullish/70' : 'bg-bearish/70'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
      <div className="border-t border-border pt-2 flex justify-between text-sm font-mono">
        <span className="text-muted-foreground">GDI Total</span>
        <span className={`font-medium ${
          tierContributions.structural + tierContributions.demand + tierContributions.conditions >= 0
            ? 'text-bullish' : 'text-bearish'
        }`}>
          {(tierContributions.structural + tierContributions.demand + tierContributions.conditions) >= 0 ? '+' : ''}
          {(tierContributions.structural + tierContributions.demand + tierContributions.conditions).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function ComponentCards({ variables }: { variables: VariableDetail[] }) {
  const navigate = useNavigate();
  const tierOrder: TierName[] = ['structural', 'demand', 'conditions'];

  const grouped = useMemo(() => {
    const g: Record<TierName, VariableDetail[]> = { structural: [], demand: [], conditions: [] };
    for (const v of variables) {
      if (VARIABLE_CONFIG.find(c => c.id === v.id)?.showCard !== false) {
        g[v.tier].push(v);
      }
    }
    return g;
  }, [variables]);

  function heatBg(z: number): string {
    if (z > 1) return 'bg-bullish/10 border-bullish/20';
    if (z > 0.3) return 'bg-bullish/5 border-bullish/10';
    if (z < -1) return 'bg-bearish/10 border-bearish/20';
    if (z < -0.3) return 'bg-bearish/5 border-bearish/10';
    return 'bg-secondary/20 border-border';
  }

  return (
    <div className="space-y-3">
      {tierOrder.map(tier => (
        <div key={tier}>
          <p className="text-xs text-muted-foreground tracking-widest mb-1.5">{TIER_LABELS[tier]}</p>
          <div className="flex gap-2 flex-wrap">
            {grouped[tier].map(v => (
              <button
                key={v.id}
                onClick={() => navigate('/evidence')}
                className={`flex-1 min-w-[90px] max-w-[130px] p-2.5 rounded-lg border text-left transition-colors hover:border-primary/30 ${heatBg(v.adjustedZScore)}`}
              >
                <p className="text-xs text-muted-foreground truncate">{v.name}</p>
                <p className="text-sm font-mono font-medium text-foreground">
                  {v.currentValue.toFixed(v.currentValue >= 100 ? 0 : 2)}
                </p>
                <p className={`text-xs font-mono ${v.adjustedZScore >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {v.adjustedZScore >= 0 ? '↑' : '↓'}{v.adjustedZScore.toFixed(2)}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ForcesPanel({ gdiResult, goldSpot, currentGDI }: Props) {
  const signal = currentGDI > 0.5 ? 'BULLISH' : currentGDI < -0.5 ? 'BEARISH' : 'NEUTRAL';
  const signalColor = currentGDI > 0.5 ? 'text-bullish' : currentGDI < -0.5 ? 'text-bearish' : 'text-neutral';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">The Forces</h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-semibold text-primary">
            {currentGDI >= 0 ? '+' : ''}{currentGDI.toFixed(2)}
          </span>
          <span className={`text-sm font-semibold ${signalColor}`}>{signal}</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-5">
        <GDITimeSeriesChart gdiResult={gdiResult} goldSpot={goldSpot} />
        <TierBars tierContributions={gdiResult.tierContributions} />
        <ComponentCards variables={gdiResult.variableDetails} />
      </div>
    </div>
  );
}
