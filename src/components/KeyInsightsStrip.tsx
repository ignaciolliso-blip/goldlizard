import { Crosshair, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import type { GDIResult } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import { GuideTooltip } from './GuideMode';

interface KeyInsightsStripProps {
  gdiResult: GDIResult;
  goldSpot: Observation[];
  currentGDI: number;
}

const KeyInsightsStrip = ({ gdiResult, goldSpot, currentGDI }: KeyInsightsStripProps) => {
  const variables = gdiResult.variableDetails;
  const dates = gdiResult.dates;

  // Card 1: Key Driver — highest absolute contribution
  const keyDriver = variables.reduce((best, v) =>
    Math.abs(v.contribution) > Math.abs(best.contribution) ? v : best, variables[0]);
  const driverDirection = keyDriver.contribution > 0 ? 'bullish' : 'bearish';

  // Card 2: Biggest Shift — largest absolute z-score change over 30d
  // We approximate by looking at value changes and the z-score relationship
  let biggestShift = variables[0];
  let biggestShiftMag = 0;
  if (dates.length >= 31) {
    for (const v of variables) {
      const series = gdiResult.alignedData.get(v.id);
      if (!series) continue;
      // Get values at 30d intervals and compute approximate z-change
      const vals: number[] = [];
      for (let i = Math.max(0, dates.length - 31); i < dates.length; i++) {
        const val = series.get(dates[i]);
        if (val !== undefined) vals.push(val);
      }
      if (vals.length >= 2) {
        const change = Math.abs(vals[vals.length - 1] - vals[0]);
        // Normalize by the range to get relative magnitude
        const range = Math.max(...vals) - Math.min(...vals);
        const relChange = range > 0 ? change / range : 0;
        if (relChange > biggestShiftMag) {
          biggestShiftMag = relChange;
          biggestShift = v;
        }
      }
    }
  }
  // Compute approximate z-score shift for display
  const shiftSeries = gdiResult.alignedData.get(biggestShift.id);
  let zShiftDisplay = 0;
  if (shiftSeries && dates.length >= 31) {
    const curr = shiftSeries.get(dates[dates.length - 1]);
    const past = shiftSeries.get(dates[Math.max(0, dates.length - 31)]);
    if (curr !== undefined && past !== undefined) {
      // Very rough z-score delta estimate
      const allVals: number[] = [];
      for (let i = Math.max(0, dates.length - 2520); i < dates.length; i++) {
        const v = shiftSeries.get(dates[i]);
        if (v !== undefined) allVals.push(v);
      }
      const mean = allVals.reduce((a, b) => a + b, 0) / allVals.length;
      const std = Math.sqrt(allVals.reduce((a, b) => a + (b - mean) ** 2, 0) / allVals.length) || 1;
      zShiftDisplay = (curr - past) / std;
    }
  }

  // Card 3: Divergence Status
  let goldReturn30d = 0;
  if (goldSpot.length >= 2) {
    const currentPrice = goldSpot[goldSpot.length - 1].value;
    // Find price ~30 days ago
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 30);
    const targetStr = targetDate.toISOString().split('T')[0];
    let pastPrice = goldSpot[0].value;
    for (const o of goldSpot) {
      if (o.date <= targetStr) pastPrice = o.value;
    }
    goldReturn30d = pastPrice > 0 ? ((currentPrice - pastPrice) / pastPrice) * 100 : 0;
  }

  const isBullishDiv = currentGDI > 0.5 && goldReturn30d < -5;
  const isBearishDiv = currentGDI < -0.5 && goldReturn30d > 5;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-foreground px-1">Key Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Key Driver */}
        <div className="rounded-lg border border-card-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gold/10">
              <Crosshair className="w-4 h-4 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <GuideTooltip id="key-driver" text="The single variable contributing the most to the GDI right now — positive or negative. When this changes, it usually signals a regime shift." position="top">
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Key Driver Right Now</h4>
              </GuideTooltip>
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold">{keyDriver.name}</span> is the dominant{' '}
                <span className={driverDirection === 'bullish' ? 'text-bullish' : 'text-bearish'}>
                  {driverDirection}
                </span>{' '}
                force (<span className="font-mono">{keyDriver.contribution > 0 ? '+' : ''}{keyDriver.contribution.toFixed(3)}</span> contribution)
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Biggest Shift */}
        <div className="rounded-lg border border-card-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-index-blue/10">
              <TrendingUp className="w-4 h-4 text-index-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <GuideTooltip id="biggest-shift" text="The variable that moved the most in the last 30 days. Rapid shifts here are early warning signals of changing macro conditions." position="top">
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Biggest Shift This Month</h4>
              </GuideTooltip>
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold">{biggestShift.name}</span> z-score shifted{' '}
                <span className={`font-mono ${zShiftDisplay > 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {zShiftDisplay > 0 ? '+' : ''}{zShiftDisplay.toFixed(2)}
                </span>{' '}
                in the last 30 days
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Divergence Status */}
        <div className="rounded-lg border border-card-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isBullishDiv || isBearishDiv ? 'bg-gold/10' : 'bg-bullish/10'}`}>
              {isBullishDiv || isBearishDiv ? (
                <Zap className="w-4 h-4 text-gold" />
              ) : (
                <CheckCircle className="w-4 h-4 text-bullish" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Divergence Status</h4>
              <p className="text-sm text-foreground leading-relaxed">
                {isBullishDiv && (
                  <>
                    ⚡ <span className="text-bullish font-semibold">BULLISH DIVERGENCE</span>: GDI reads{' '}
                    <span className="font-mono">+{currentGDI.toFixed(1)}</span> but gold is down{' '}
                    <span className="font-mono">{Math.abs(goldReturn30d).toFixed(1)}%</span> — macro supports higher prices
                  </>
                )}
                {isBearishDiv && (
                  <>
                    ⚠️ <span className="text-bearish font-semibold">BEARISH DIVERGENCE</span>: GDI reads{' '}
                    <span className="font-mono">{currentGDI.toFixed(1)}</span> but gold is up{' '}
                    <span className="font-mono">{goldReturn30d.toFixed(1)}%</span> — caution warranted
                  </>
                )}
                {!isBullishDiv && !isBearishDiv && (
                  <>
                    ✓ <span className="text-bullish">No divergence</span> — GDI and price are aligned
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyInsightsStrip;
