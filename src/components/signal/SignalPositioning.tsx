import type { AnchorResult } from '@/lib/anchorEngine';
import type { GDIResult } from '@/lib/gdiEngine';
import type { LeverageResult } from '@/lib/leverageEngine';
import { projectGDXGoldRatio } from '@/lib/leverageEngine';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';

interface Props {
  anchorResult: AnchorResult | null;
  gdiResult: GDIResult | null;
  leverageResult: LeverageResult | null;
  currentGDI: number;
  currentGoldPrice: number;
  currentGDXPrice: number;
  probs: ScenarioProbabilities;
  scenarioConfig: ScenarioConfig | null;
}

function derivePositioning(anchorStatus: string, gdiSignal: string, minerPercentile: number) {
  const minersUndervalued = minerPercentile < 25;
  const minersFairValue = minerPercentile >= 25 && minerPercentile <= 75;

  if (anchorStatus === 'below_both' && gdiSignal === 'bullish' && minersUndervalued)
    return { text: 'STRONG BUY MINERS', color: 'bullish', detail: 'Double discount — gold undervalued and miners cheap relative to gold' };
  if (anchorStatus === 'between' && gdiSignal === 'bullish' && minersUndervalued)
    return { text: 'ACCUMULATE MINERS', color: 'bullish', detail: 'Debasement story in play with miner catch-up potential' };
  if (anchorStatus === 'between' && gdiSignal === 'bullish' && minersFairValue)
    return { text: 'HOLD / ADD GOLD', color: 'primary', detail: 'Miners fairly valued — add exposure via bullion or gold ETF' };
  if (anchorStatus === 'below_both' && gdiSignal === 'bearish')
    return { text: 'TACTICAL PATIENCE', color: 'neutral', detail: 'Undervalued but headwinds present — accumulate on further weakness' };
  if (anchorStatus === 'between' && gdiSignal === 'bearish')
    return { text: 'HOLD', color: 'neutral', detail: 'Fairly valued with fading momentum — watch for trend change' };
  if (anchorStatus === 'above_both' && gdiSignal === 'bearish')
    return { text: 'REDUCE', color: 'bearish', detail: 'Overvalued and forces turning — trim positions' };
  if (anchorStatus === 'above_both' && gdiSignal === 'bullish')
    return { text: 'HOLD CAUTIOUSLY', color: 'neutral', detail: 'Momentum strong but valuation stretched' };
  return { text: 'HOLD', color: 'neutral', detail: 'Mixed signals — maintain current allocation' };
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function SignalPositioning({
  anchorResult, gdiResult, leverageResult, currentGDI, currentGoldPrice, currentGDXPrice, probs, scenarioConfig
}: Props) {
  // Determine anchor status
  let anchorStatus = 'between';
  if (anchorResult) {
    if (currentGoldPrice < anchorResult.cpiFairValue) anchorStatus = 'below_both';
    else if (currentGoldPrice > anchorResult.m2FairValue) anchorStatus = 'above_both';
  }

  const gdiSignal = currentGDI > 0.5 ? 'bullish' : currentGDI < -0.5 ? 'bearish' : 'neutral';
  const minerPercentile = leverageResult?.currentPercentile ?? 50;

  const positioning = derivePositioning(anchorStatus, gdiSignal, minerPercentile);

  const borderColorMap: Record<string, string> = {
    bullish: 'border-l-bullish',
    bearish: 'border-l-bearish',
    neutral: 'border-l-neutral',
    primary: 'border-l-primary',
  };
  const textColorMap: Record<string, string> = {
    bullish: 'text-bullish',
    bearish: 'text-bearish',
    neutral: 'text-neutral',
    primary: 'text-primary',
  };

  // Build narrative
  const keyDriver = gdiResult?.variableDetails.reduce((best, v) =>
    Math.abs(v.contribution) > Math.abs(best.contribution) ? v : best
  );

  const percentileDesc = minerPercentile < 25 ? 'undervalued' : minerPercentile > 75 ? 'overvalued' : 'fairly valued';

  // Compute 5yr CAGRs
  let goldCagr5y = '—';
  let gdxCagr5y = '—';
  if (scenarioConfig?.scenarios?.length) {
    const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
    const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
    const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');
    if (bull && base && bear) {
      const ev5y = probs.bull * bull.targets['5y'] + probs.base * base.targets['5y'] + probs.bear * bear.targets['5y'];
      goldCagr5y = ((Math.pow(ev5y / currentGoldPrice, 1 / 5) - 1) * 100).toFixed(1) + '%';
      if (leverageResult) {
        const projRatio = projectGDXGoldRatio(leverageResult.currentGDXGoldRatio, leverageResult.medianRatio, 5);
        const gdx5y = ev5y * projRatio;
        gdxCagr5y = ((Math.pow(gdx5y / currentGDXPrice, 1 / 5) - 1) * 100).toFixed(1) + '%';
      }
    }
  }

  const narrative = `Gold sits between its CPI fair value (${anchorResult ? fmt(anchorResult.cpiFairValue) : '—'}) and M2 fair value (${anchorResult ? fmt(anchorResult.m2FairValue) : '—'}) — the debasement gap hasn't closed. The GDI reads ${currentGDI >= 0 ? '+' : ''}${currentGDI.toFixed(1)} / ${gdiSignal.toUpperCase()}, driven primarily by ${keyDriver?.name || 'multiple factors'}. Miners (GDX) are at the ${minerPercentile.toFixed(0)}th percentile of their 10-year valuation range vs. gold — ${percentileDesc}. The 5-year expected CAGR is ${goldCagr5y} for gold and ${gdxCagr5y} for GDX.`;

  return (
    <div className={`bg-card border border-border ${borderColorMap[positioning.color]} border-l-4 rounded-xl p-6 space-y-4`}>
      <div>
        <h2 className={`font-display text-2xl ${textColorMap[positioning.color]}`}>
          {positioning.text}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{positioning.detail}</p>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed">
        {narrative}
      </p>
    </div>
  );
}
