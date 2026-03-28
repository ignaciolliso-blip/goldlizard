import { useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { LeverageResult } from '@/lib/leverageEngine';
import { projectGDXGoldRatio } from '@/lib/leverageEngine';
import type { Observation } from '@/lib/dataFetcher';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';

interface Props {
  leverageResult: LeverageResult;
  goldSpot: Observation[];
  currentGoldPrice: number;
  currentGDXPrice: number;
  scenarioConfig: ScenarioConfig | null;
  probs: ScenarioProbabilities;
}

interface RatioPoint {
  date: string;
  ts: number;
  ratio?: number;
  projRatio?: number;
  p25?: number;
  p75?: number;
  median?: number;
}

interface GDXPoint {
  date: string;
  ts: number;
  gdx?: number;
  bull?: number;
  base?: number;
  bear?: number;
}

export default function LeveragePanel({
  leverageResult, goldSpot, currentGoldPrice, currentGDXPrice, scenarioConfig, probs,
}: Props) {
  const { currentGDXGoldRatio, medianRatio, currentPercentile, ratioSeries } = leverageResult;

  // Compute percentile bands
  const bands = useMemo(() => {
    const values = ratioSeries.map(r => r.value).sort((a, b) => a - b);
    const p25 = values[Math.floor(values.length * 0.25)] || 0;
    const p75 = values[Math.floor(values.length * 0.75)] || 0;
    return { p25, p75 };
  }, [ratioSeries]);

  // Ratio chart data
  const ratioChartData = useMemo(() => {
    const now = new Date();
    const tenYearsAgo = new Date(now);
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const cutoff = tenYearsAgo.toISOString().split('T')[0];

    const points: RatioPoint[] = ratioSeries
      .filter(r => r.date >= cutoff)
      .map(r => ({
        date: r.date,
        ts: new Date(r.date).getTime(),
        ratio: r.value,
        p25: bands.p25,
        p75: bands.p75,
        median: medianRatio,
      }));

    // Forward projections
    const horizons = [
      { years: 0.25, label: '3m' },
      { years: 0.5, label: '6m' },
      { years: 1, label: '1y' },
      { years: 3, label: '3y' },
      { years: 5, label: '5y' },
    ];

    for (const h of horizons) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + Math.round(h.years * 12));
      points.push({
        date: d.toISOString().split('T')[0],
        ts: d.getTime(),
        projRatio: projectGDXGoldRatio(currentGDXGoldRatio, medianRatio, h.years),
        p25: bands.p25,
        p75: bands.p75,
        median: medianRatio,
      });
    }

    return points;
  }, [ratioSeries, bands, medianRatio, currentGDXGoldRatio]);

  // GDX price chart
  const gdxChartData = useMemo(() => {
    if (!scenarioConfig?.scenarios?.length) return [];

    const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
    const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
    const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');
    if (!bull || !base || !bear) return [];

    const now = new Date();

    // Historical GDX from ratio × gold
    const goldMap = new Map<string, number>();
    goldSpot.forEach(o => goldMap.set(o.date.substring(0, 7), o.value));

    const tenYearsAgo = new Date(now);
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const cutoff = tenYearsAgo.toISOString().split('T')[0];

    const points: GDXPoint[] = ratioSeries
      .filter(r => r.date >= cutoff)
      .map(r => {
        const month = r.date.substring(0, 7);
        const gp = goldMap.get(month);
        return {
          date: r.date,
          ts: new Date(r.date).getTime(),
          gdx: gp ? r.value * gp : undefined,
        };
      });

    // Forward
    const horizons: { key: keyof typeof bull.targets; years: number }[] = [
      { key: '3m', years: 0.25 },
      { key: '6m', years: 0.5 },
      { key: '1y', years: 1 },
      { key: '3y', years: 3 },
      { key: '5y', years: 5 },
    ];

    for (const h of horizons) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + Math.round(h.years * 12));
      const projRatio = projectGDXGoldRatio(currentGDXGoldRatio, medianRatio, h.years);
      // Use ratio ± spread for bull/bear
      const ratioHigh = projRatio * 1.15;
      const ratioLow = projRatio * 0.85;
      points.push({
        date: d.toISOString().split('T')[0],
        ts: d.getTime(),
        bull: bull.targets[h.key] * ratioHigh,
        base: base.targets[h.key] * projRatio,
        bear: bear.targets[h.key] * ratioLow,
      });
    }

    return points;
  }, [scenarioConfig, ratioSeries, goldSpot, currentGDXGoldRatio, medianRatio]);

  // Projected GDX prices
  const projectedGDX = useMemo(() => {
    if (!scenarioConfig?.scenarios?.length) return {};
    const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
    const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
    const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');
    if (!bull || !base || !bear) return {};

    const result: Record<string, number> = {};
    const horizons: { key: keyof typeof bull.targets; years: number }[] = [
      { key: '1y', years: 1 },
      { key: '3y', years: 3 },
      { key: '5y', years: 5 },
    ];

    for (const h of horizons) {
      const projRatio = projectGDXGoldRatio(currentGDXGoldRatio, medianRatio, h.years);
      const goldEV = probs.bull * bull.targets[h.key] + probs.base * base.targets[h.key] + probs.bear * bear.targets[h.key];
      result[h.key] = goldEV * projRatio;
    }
    return result;
  }, [scenarioConfig, probs, currentGDXGoldRatio, medianRatio]);

  const pctileColor = currentPercentile < 25 ? 'text-bullish' : currentPercentile > 75 ? 'text-bearish' : 'text-amber-400';
  const todayTs = new Date().getTime();

  const gdxCagr5y = projectedGDX['5y'] ? (Math.pow(projectedGDX['5y'] / currentGDXPrice, 1 / 5) - 1) * 100 : 0;
  const goldEV5y = (() => {
    if (!scenarioConfig?.scenarios?.length) return currentGoldPrice;
    const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
    const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
    const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');
    if (!bull || !base || !bear) return currentGoldPrice;
    return probs.bull * bull.targets['5y'] + probs.base * base.targets['5y'] + probs.bear * bear.targets['5y'];
  })();
  const goldCagr5y = (Math.pow(goldEV5y / currentGoldPrice, 1 / 5) - 1) * 100;
  const premium = gdxCagr5y - goldCagr5y;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground">The Leverage</h2>
        <span className={`text-xs font-semibold ${pctileColor}`}>
          {Math.round(currentPercentile)}th percentile
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 space-y-4">
        {/* Ratio chart */}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest mb-1">GDX / GOLD RATIO</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={ratioChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="ts"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.toFixed(3)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as RatioPoint;
                  return (
                    <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
                      <p className="text-muted-foreground">{d.date}</p>
                      {d.ratio != null && <p className="text-purple-400">Ratio: {d.ratio.toFixed(4)}</p>}
                      {d.projRatio != null && <p className="text-purple-400">Proj: {d.projRatio.toFixed(4)}</p>}
                    </div>
                  );
                }}
              />
              <ReferenceLine x={todayTs} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.5} />
              {/* Percentile band */}
              <Area dataKey="p75" stroke="none" fill="hsl(270 95% 75%)" fillOpacity={0.06} />
              <Area dataKey="p25" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />
              {/* Median */}
              <ReferenceLine y={medianRatio} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" opacity={0.5} />
              <Line dataKey="ratio" stroke="hsl(270 95% 75%)" strokeWidth={2} dot={false} connectNulls />
              <Line dataKey="projRatio" stroke="hsl(270 95% 75%)" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: 'hsl(270 95% 75%)' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* GDX price chart */}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest mb-1">GDX PRICE SCENARIOS</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={gdxChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="ts"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v?.toFixed(0) ?? ''}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as GDXPoint;
                  return (
                    <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
                      <p className="text-muted-foreground">{d.date}</p>
                      {d.gdx != null && <p className="text-purple-400">GDX: ${d.gdx.toFixed(2)}</p>}
                      {d.bull != null && <p className="text-bullish">Bull: ${d.bull.toFixed(0)}</p>}
                      {d.base != null && <p className="text-primary">Base: ${d.base.toFixed(0)}</p>}
                      {d.bear != null && <p className="text-bearish">Bear: ${d.bear.toFixed(0)}</p>}
                    </div>
                  );
                }}
              />
              <ReferenceLine x={todayTs} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.5} />
              <Line dataKey="gdx" stroke="hsl(270 95% 75%)" strokeWidth={2} dot={false} connectNulls />
              <Line dataKey="bull" stroke="hsl(var(--bullish))" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} connectNulls />
              <Line dataKey="base" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} connectNulls />
              <Line dataKey="bear" stroke="hsl(var(--bearish))" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="space-y-1 text-xs font-mono text-muted-foreground">
          <p>
            GDX: <span className="text-foreground">${currentGDXPrice.toFixed(2)}</span>
            {' · '}Ratio: <span className="text-foreground">{currentGDXGoldRatio.toFixed(4)}</span>
            {' · '}Pctile: <span className={pctileColor}>{Math.round(currentPercentile)}th</span>
          </p>
          <p>
            Projected GDX — 1Y: <span className="text-foreground">${(projectedGDX['1y'] || 0).toFixed(0)}</span>
            {' · '}3Y: <span className="text-foreground">${(projectedGDX['3y'] || 0).toFixed(0)}</span>
            {' · '}5Y: <span className="text-foreground">${(projectedGDX['5y'] || 0).toFixed(0)}</span>
          </p>
          <p>
            5Y CAGR — GDX: <span className="text-foreground">{gdxCagr5y.toFixed(1)}%</span>
            {' · '}Gold: <span className="text-foreground">{goldCagr5y.toFixed(1)}%</span>
            {' · '}Premium: <span className={premium >= 0 ? 'text-bullish' : 'text-bearish'}>
              {premium >= 0 ? '+' : ''}{premium.toFixed(0)}pp
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
