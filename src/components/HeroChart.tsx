import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, CartesianGrid, Scatter
} from 'recharts';
import type { GDIResult } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import type { ForecastPoint, BankConsensus, ScenarioProbabilities } from '@/lib/scenarioEngine';
import { BANK_CONSENSUS } from '@/lib/scenarioEngine';
import HeroChartTooltip from './HeroChartTooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { GuideTooltip } from './GuideMode';

interface HeroChartProps {
  gdiResult: GDIResult;
  goldSpot: Observation[];
  goldFutures: Observation[];
  forecastPoints: ForecastPoint[];
  probs: ScenarioProbabilities;
  showFutures: boolean;
  onToggleFutures: () => void;
  showBankConsensus: boolean;
  onToggleBankConsensus: () => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

interface ChartDataPoint {
  date: string;
  dateTs: number;
  goldSpot?: number;
  goldFutures?: number;
  gdi?: number;
  bullForecast?: number;
  baseForecast?: number;
  bearForecast?: number;
  evForecast?: number;
  isForecast: boolean;
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

function computeDivergences(
  dates: string[],
  gdiValues: number[],
  goldMap: Map<string, number>
): { bullishDivergences: [string, string][]; bearishDivergences: [string, string][] } {
  const bullishDivergences: [string, string][] = [];
  const bearishDivergences: [string, string][] = [];

  for (let i = 30; i < dates.length; i++) {
    const gdi = gdiValues[i];
    const currentPrice = goldMap.get(dates[i]);
    const pastPrice = goldMap.get(dates[i - 30]);

    if (!currentPrice || !pastPrice || pastPrice === 0) continue;
    const ret30d = (currentPrice - pastPrice) / pastPrice;

    if (gdi > 0.5 && ret30d < -0.05) {
      if (bullishDivergences.length === 0 || bullishDivergences[bullishDivergences.length - 1][1] !== dates[i - 1]) {
        bullishDivergences.push([dates[i], dates[i]]);
      } else {
        bullishDivergences[bullishDivergences.length - 1][1] = dates[i];
      }
    }
    if (gdi < -0.5 && ret30d > 0.05) {
      if (bearishDivergences.length === 0 || bearishDivergences[bearishDivergences.length - 1][1] !== dates[i - 1]) {
        bearishDivergences.push([dates[i], dates[i]]);
      } else {
        bearishDivergences[bearishDivergences.length - 1][1] = dates[i];
      }
    }
  }

  return { bullishDivergences, bearishDivergences };
}

const TIME_RANGES = ['1Y', '3Y', '5Y', '10Y', 'Max'];

const HeroChart = ({
  gdiResult, goldSpot, goldFutures, forecastPoints, probs,
  showFutures, onToggleFutures, showBankConsensus, onToggleBankConsensus,
  timeRange, onTimeRangeChange
}: HeroChartProps) => {
  const today = new Date().toISOString().split('T')[0];
  const isMobile = useIsMobile();

  const { chartData, goldYDomain, gdiYDomain, bullishDivs, bearishDivs } = useMemo(() => {
    const startDate = getStartDate(timeRange);
    const goldSpotMap = new Map<string, number>();
    goldSpot.forEach(o => goldSpotMap.set(o.date, o.value));
    const goldFuturesMap = new Map<string, number>();
    goldFutures.forEach(o => goldFuturesMap.set(o.date, o.value));

    const filteredIndices: number[] = [];
    gdiResult.dates.forEach((d, i) => {
      if (d >= startDate) filteredIndices.push(i);
    });

    const sampleRate = Math.max(1, Math.floor(filteredIndices.length / 500));
    const data: ChartDataPoint[] = [];
    let minGold = Infinity, maxGold = -Infinity;
    let minGdi = Infinity, maxGdi = -Infinity;

    filteredIndices.forEach((idx, i) => {
      if (i % sampleRate !== 0 && i !== filteredIndices.length - 1) return;
      const date = gdiResult.dates[idx];
      const gdi = gdiResult.gdiValues[idx];
      const spot = goldSpotMap.get(date);
      const futures = goldFuturesMap.get(date);
      const goldPrice = spot ?? futures;
      if (goldPrice !== undefined) { minGold = Math.min(minGold, goldPrice); maxGold = Math.max(maxGold, goldPrice); }
      minGdi = Math.min(minGdi, gdi); maxGdi = Math.max(maxGdi, gdi);
      data.push({ date, dateTs: new Date(date).getTime(), goldSpot: spot ?? futures, goldFutures: futures, gdi, isForecast: false });
    });

    forecastPoints.forEach(fp => {
      maxGold = Math.max(maxGold, fp.bull, fp.ev);
      minGold = Math.min(minGold, fp.bear);
      data.push({ date: fp.date, dateTs: new Date(fp.date).getTime(), bullForecast: fp.bull, baseForecast: fp.base, bearForecast: fp.bear, evForecast: fp.ev, isForecast: true });
    });

    const { bullishDivergences, bearishDivergences } = computeDivergences(
      gdiResult.dates, gdiResult.gdiValues, goldSpotMap.size > 0 ? goldSpotMap : goldFuturesMap
    );

    const goldPad = (maxGold - minGold) * 0.08;
    const gdiPad = (maxGdi - minGdi) * 0.15;

    return {
      chartData: data,
      goldYDomain: [Math.max(0, minGold - goldPad), maxGold + goldPad],
      gdiYDomain: [minGdi - gdiPad, maxGdi + gdiPad],
      bullishDivs: bullishDivergences.filter(([s]) => s >= startDate),
      bearishDivs: bearishDivergences.filter(([s]) => s >= startDate),
    };
  }, [gdiResult, goldSpot, goldFutures, forecastPoints, timeRange]);

  const todayTs = new Date(today).getTime();

  const bankPoints = useMemo(() => {
    if (!showBankConsensus) return [];
    return BANK_CONSENSUS.map(b => ({ dateTs: new Date(b.date).getTime(), goldSpot: b.price, bank: b.bank }));
  }, [showBankConsensus]);

  const formatXTick = (ts: number) => {
    const d = new Date(ts);
    const m = d.toLocaleString('en', { month: 'short' });
    const y = d.getFullYear().toString().slice(2);
    return `${m} '${y}`;
  };

  const chartHeight = isMobile ? 300 : 500;

  return (
    <div className="w-full">
      {/* Chart controls */}
      <div className="flex flex-wrap items-center justify-between mb-3 px-1 gap-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <label className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showFutures} onChange={onToggleFutures} className="rounded border-card-border bg-card accent-futures-purple w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-futures-purple">London Fix</span>
          </label>
          <label className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showBankConsensus} onChange={onToggleBankConsensus} className="rounded border-card-border bg-card accent-gold w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Bank Consensus
          </label>
        </div>
        <div className="flex items-center gap-3 text-[9px] sm:text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gold inline-block rounded" /> Gold</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-index-blue inline-block rounded" /> GDI</span>
        </div>
      </div>

      {/* Main chart */}
      <div className={`rounded-lg border border-card-border bg-card overflow-hidden ${isMobile ? 'overflow-x-auto' : ''}`}>
        <div style={{ minWidth: isMobile ? 600 : undefined }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={chartData} margin={{ top: 20, right: isMobile ? 40 : 60, bottom: 20, left: isMobile ? 10 : 20 }}>
              <defs>
                <linearGradient id="forecastBg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#12141A" stopOpacity={0} />
                  <stop offset="5%" stopColor="#12141A" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#12141A" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2230" strokeOpacity={0.5} />
              <XAxis dataKey="dateTs" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatXTick} stroke="#8A8D96" tick={{ fontSize: isMobile ? 8 : 10, fill: '#8A8D96' }} axisLine={{ stroke: '#1E2230' }} tickLine={{ stroke: '#1E2230' }} />
              <YAxis yAxisId="gold" orientation="left" domain={goldYDomain as [number, number]} tickFormatter={(v: number) => `$${v.toLocaleString()}`} stroke="#8A8D96" tick={{ fontSize: isMobile ? 8 : 10, fill: '#8A8D96' }} axisLine={{ stroke: '#1E2230' }} tickLine={{ stroke: '#1E2230' }} width={isMobile ? 55 : 70} />
              <YAxis yAxisId="gdi" orientation="right" domain={gdiYDomain as [number, number]} tickFormatter={(v: number) => v.toFixed(1)} stroke="#5C9CE6" tick={{ fontSize: isMobile ? 8 : 10, fill: '#5C9CE6' }} axisLine={{ stroke: '#1E2230' }} tickLine={{ stroke: '#1E2230' }} width={isMobile ? 35 : 45} />

              {bullishDivs.map(([start, end], i) => (
                <ReferenceArea key={`bull-div-${i}`} x1={new Date(start).getTime()} x2={new Date(end).getTime()} yAxisId="gold" fill="rgba(61,220,132,0.08)" fillOpacity={1} />
              ))}
              {bearishDivs.map(([start, end], i) => (
                <ReferenceArea key={`bear-div-${i}`} x1={new Date(start).getTime()} x2={new Date(end).getTime()} yAxisId="gold" fill="rgba(255,82,82,0.08)" fillOpacity={1} />
              ))}

              <ReferenceLine x={todayTs} yAxisId="gold" stroke="#C9A84C" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Today', position: 'top', fill: '#C9A84C', fontSize: 10 }} />

              <Area yAxisId="gold" dataKey="bullForecast" stroke="none" fill="rgba(61,220,132,0.06)" fillOpacity={1} connectNulls={false} isAnimationActive={false} />
              <Area yAxisId="gold" dataKey="bearForecast" stroke="none" fill="rgba(255,82,82,0.04)" fillOpacity={1} connectNulls={false} isAnimationActive={false} />

              <Line yAxisId="gold" dataKey="goldSpot" stroke="#C9A84C" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
              {showFutures && <Line yAxisId="gold" dataKey="goldFutures" stroke="#A78BFA" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls isAnimationActive={false} />}
              <Line yAxisId="gdi" dataKey="gdi" stroke="#5C9CE6" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />

              <Line yAxisId="gold" dataKey="bullForecast" stroke="#3DDC84" strokeWidth={Math.max(1, probs.bull * 4)} dot={{ r: 4, fill: '#3DDC84', stroke: '#0D0F12', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
              <Line yAxisId="gold" dataKey="baseForecast" stroke="#C9A84C" strokeWidth={Math.max(1, probs.base * 4)} dot={{ r: 4, fill: '#C9A84C', stroke: '#0D0F12', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
              <Line yAxisId="gold" dataKey="bearForecast" stroke="#FF5252" strokeWidth={Math.max(1, probs.bear * 4)} dot={{ r: 4, fill: '#FF5252', stroke: '#0D0F12', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
              <Line yAxisId="gold" dataKey="evForecast" stroke="#C9A84C" strokeWidth={2} strokeDasharray="8 4" dot={{ r: 5, fill: '#C9A84C', stroke: '#0D0F12', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />

              {showBankConsensus && <Scatter yAxisId="gold" data={bankPoints} shape="diamond" fill="#E8D48B" isAnimationActive={false} />}
              <Tooltip content={<HeroChartTooltip probs={probs} showBankConsensus={showBankConsensus} todayTs={todayTs} />} cursor={{ stroke: '#C9A84C', strokeOpacity: 0.2, strokeDasharray: '4 4' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time range selector */}
      <div className="flex items-center justify-center gap-0.5 sm:gap-1 mt-3">
        {TIME_RANGES.map(range => (
          <button
            key={range}
            onClick={() => onTimeRangeChange(range)}
            className={`px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-medium rounded transition-colors ${
              timeRange === range ? 'bg-gold/20 text-gold' : 'text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HeroChart;
