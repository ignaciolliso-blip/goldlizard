import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceArea,
} from 'recharts';
import { ExternalLink, X } from 'lucide-react';
import type { GDIResult, VariableDetail } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import { VARIABLE_METADATA } from '@/lib/variableMetadata';

interface DrillDownPanelProps {
  variable: VariableDetail;
  gdiResult: GDIResult;
  goldSpot: Observation[];
  timeRange: string;
  onClose: () => void;
}

function getStartDate(range: string): string {
  const now = new Date();
  switch (range) {
    case '1Y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    case '3Y': return new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    case '5Y': return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    case '10Y': return new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    default: return '2005-01-01';
  }
}

function getHeatmapColor(adjZ: number): string {
  if (adjZ > 0.5) return '#3DDC84';
  if (adjZ < -0.5) return '#FF5252';
  return '#8A8D96';
}

function pearsonCorr(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 10) return 0;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i]; sy += y[i]; sxy += x[i] * y[i];
    sx2 += x[i] * x[i]; sy2 += y[i] * y[i];
  }
  const d = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
  return d === 0 ? 0 : (n * sxy - sx * sy) / d;
}

const DrillDownPanel = ({ variable, gdiResult, goldSpot, timeRange, onClose }: DrillDownPanelProps) => {
  const [showGoldOverlay, setShowGoldOverlay] = useState(true);
  const meta = VARIABLE_METADATA[variable.id];
  const lineColor = getHeatmapColor(variable.adjustedZScore);

  const { chartData, varDomain, goldDomain, stats } = useMemo(() => {
    const startDate = getStartDate(timeRange);
    const series = gdiResult.alignedData.get(variable.id);
    if (!series) return { chartData: [], varDomain: [0, 1], goldDomain: [0, 1], stats: null };

    const goldMap = new Map<string, number>();
    goldSpot.forEach(o => goldMap.set(o.date, o.value));

    const filteredDates = gdiResult.dates.filter(d => d >= startDate);
    const sampleRate = Math.max(1, Math.floor(filteredDates.length / 400));

    const data: { dateTs: number; date: string; value?: number; gold?: number }[] = [];
    let minV = Infinity, maxV = -Infinity;
    let minG = Infinity, maxG = -Infinity;

    // For stats
    const allValues: number[] = [];
    const recentValues: number[] = []; // last 260 trading days (~52w)
    const recentGold: number[] = [];
    const allDatesCount = gdiResult.dates.filter(d => d >= startDate).length;

    gdiResult.dates.forEach((d, i) => {
      if (d < startDate) return;
      const v = series.get(d);
      if (v !== undefined) allValues.push(v);

      // last 260 days
      if (i >= gdiResult.dates.length - 260) {
        if (v !== undefined) recentValues.push(v);
        const g = goldMap.get(d);
        if (g !== undefined) recentGold.push(g);
      }
    });

    filteredDates.forEach((d, i) => {
      if (i % sampleRate !== 0 && i !== filteredDates.length - 1) return;
      const v = series.get(d);
      const g = goldMap.get(d);
      if (v !== undefined) { minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
      if (g !== undefined) { minG = Math.min(minG, g); maxG = Math.max(maxG, g); }
      data.push({ dateTs: new Date(d).getTime(), date: d, value: v, gold: g });
    });

    const vPad = (maxV - minV) * 0.1 || 1;
    const gPad = (maxG - minG) * 0.08 || 100;

    // Compute stats
    const mean = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
    const std = allValues.length > 1
      ? Math.sqrt(allValues.reduce((a, b) => a + (b - mean) ** 2, 0) / allValues.length)
      : 0;
    const sorted = [...allValues].sort((a, b) => a - b);
    const high52 = recentValues.length > 0 ? Math.max(...recentValues) : 0;
    const low52 = recentValues.length > 0 ? Math.min(...recentValues) : 0;
    const rank = sorted.findIndex(v => v >= variable.currentValue);
    const percentile = sorted.length > 0 ? ((rank >= 0 ? rank : sorted.length) / sorted.length) * 100 : 50;

    // Weekly returns for correlation
    const weeklyVar: number[] = [];
    const weeklyGold: number[] = [];
    for (let i = 5; i < recentValues.length; i += 5) {
      if (recentValues[i - 5] !== 0) weeklyVar.push((recentValues[i] - recentValues[i - 5]) / Math.abs(recentValues[i - 5]));
    }
    for (let i = 5; i < recentGold.length; i += 5) {
      if (recentGold[i - 5] !== 0) weeklyGold.push((recentGold[i] - recentGold[i - 5]) / recentGold[i - 5]);
    }
    const corr = pearsonCorr(weeklyVar, weeklyGold);

    return {
      chartData: data,
      varDomain: [minV - vPad, maxV + vPad],
      goldDomain: [Math.max(0, minG - gPad), maxG + gPad],
      stats: { mean, std, high52, low52, percentile, corr },
    };
  }, [variable, gdiResult, goldSpot, timeRange]);

  const formatXTick = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleString('en', { month: 'short' })} '${d.getFullYear().toString().slice(2)}`;
  };

  return (
    <div className="rounded-lg border border-gold/30 bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lineColor }} />
          <h3 className="font-display text-base text-foreground">{variable.name}</h3>
          <span className="text-xs text-muted-foreground font-mono">{variable.id}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-card-border">
        {/* Column 1: Chart (50%) */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Historical ({timeRange})</span>
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showGoldOverlay}
                onChange={() => setShowGoldOverlay(v => !v)}
                className="w-3 h-3 rounded"
              />
              <span className="text-gold/60">Gold overlay</span>
            </label>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2230" strokeOpacity={0.5} />
              <XAxis
                dataKey="dateTs"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatXTick}
                stroke="#8A8D96"
                tick={{ fontSize: 9, fill: '#8A8D96' }}
                axisLine={{ stroke: '#1E2230' }}
              />
              <YAxis
                yAxisId="var"
                orientation="left"
                domain={varDomain as [number, number]}
                tickFormatter={(v: number) => v.toFixed(meta?.unit === '%' ? 2 : 0)}
                stroke={lineColor}
                tick={{ fontSize: 9, fill: lineColor }}
                axisLine={{ stroke: '#1E2230' }}
                width={55}
              />
              {showGoldOverlay && (
                <YAxis
                  yAxisId="gold"
                  orientation="right"
                  domain={goldDomain as [number, number]}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                  stroke="#C9A84C"
                  tick={{ fontSize: 9, fill: '#C9A84C' }}
                  axisLine={{ stroke: '#1E2230' }}
                  width={60}
                  strokeOpacity={0.4}
                />
              )}
              {/* Regime bands */}
              {meta?.regimeBands?.map((band, i) => (
                <ReferenceArea
                  key={i}
                  x1={new Date(band.startDate).getTime()}
                  x2={new Date(band.endDate).getTime()}
                  yAxisId="var"
                  fill={band.color === 'bullish' ? 'rgba(61,220,132,0.06)' : 'rgba(255,82,82,0.06)'}
                  fillOpacity={1}
                  label={{ value: band.label, position: 'insideTopLeft', fill: '#8A8D96', fontSize: 8 }}
                />
              ))}
              <Line
                yAxisId="var"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              {showGoldOverlay && (
                <Line
                  yAxisId="gold"
                  dataKey="gold"
                  stroke="#C9A84C"
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: '#151820',
                  border: '1px solid #1E2230',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                formatter={(val: number, name: string) => {
                  if (name === 'gold') return [`$${val.toLocaleString()}`, 'Gold'];
                  return [val.toFixed(2) + (meta?.unit === '%' ? '%' : ''), variable.name];
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Column 2+3 side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-card-border">
          {/* Column 2: Stats */}
          <div className="p-4">
            <h4 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Statistical Breakdown</h4>
            {stats && (
              <div className="space-y-1.5 text-xs">
                <StatRow label="Current value" value={`${variable.currentValue.toFixed(2)}${meta?.unit === '%' ? '%' : meta?.unit === '$/bbl' ? ' $/bbl' : ''}`} />
                <StatRow label="10-year mean" value={stats.mean.toFixed(2)} />
                <StatRow label="10-year std dev" value={stats.std.toFixed(2)} />
                <StatRow label="Z-score (raw)" value={variable.zScore.toFixed(3)} />
                <StatRow label="Z-score (adjusted)" value={variable.adjustedZScore.toFixed(3)} highlight={variable.adjustedZScore > 0 ? 'bullish' : variable.adjustedZScore < 0 ? 'bearish' : undefined} />
                <StatRow label="52-week high" value={stats.high52.toFixed(2)} />
                <StatRow label="52-week low" value={stats.low52.toFixed(2)} />
                <StatRow label="Percentile (10yr)" value={`${stats.percentile.toFixed(0)}th`} />
                <StatRow label="Corr w/ gold (52w)" value={stats.corr.toFixed(2)} />
                <StatRow label="GDI contribution" value={`${variable.contribution > 0 ? '+' : ''}${variable.contribution.toFixed(3)}`} highlight={variable.contribution > 0 ? 'bullish' : variable.contribution < 0 ? 'bearish' : undefined} />
              </div>
            )}

            {meta && (
              <div className="mt-4 pt-3 border-t border-card-border">
                <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">What this means</h4>
                <p className="text-xs text-muted-foreground/80 leading-relaxed">{meta.explanation}</p>
              </div>
            )}
          </div>

          {/* Column 3: Sources */}
          <div className="p-4">
            {meta && (
              <div className="space-y-5">
                {/* Data source */}
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Data Source</h4>
                  <div className="space-y-1 text-xs">
                    {meta.fredUrl && (
                      <a href={meta.fredUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-index-blue hover:text-index-blue/80 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                        {meta.id}
                      </a>
                    )}
                    <p className="text-muted-foreground">{meta.provider}</p>
                    <p className="text-muted-foreground">Frequency: {meta.frequency}</p>
                  </div>
                </div>

                {/* Evidence */}
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Why this matters for gold</h4>
                  <div className="space-y-2">
                    {meta.evidenceSources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <p className="text-xs text-index-blue group-hover:text-index-blue/80 transition-colors flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                          {src.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 ml-4 italic">"{src.quote}"</p>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Context */}
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">What influences this variable</h4>
                  <div className="space-y-1.5">
                    {meta.contextLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-index-blue hover:text-index-blue/80 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        {link.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value, highlight }: { label: string; value: string; highlight?: 'bullish' | 'bearish' }) => (
  <div className="flex items-center justify-between py-1 border-b border-card-border/30">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-mono font-medium ${highlight === 'bullish' ? 'text-bullish' : highlight === 'bearish' ? 'text-bearish' : 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

export default DrillDownPanel;
