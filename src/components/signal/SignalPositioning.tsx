import type { AnchorResult } from '@/lib/anchorEngine';
import { getZone, getZoneConclusion } from '@/lib/anchorEngine';
import type { GDIResult } from '@/lib/gdiEngine';
import type { LeverageResult } from '@/lib/leverageEngine';
import { projectGDXGoldRatio } from '@/lib/leverageEngine';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';
import { GuideTooltip } from '@/components/GuideMode';

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

function derivePositioning(pctParity: number, gdiSignal: string, minerPercentile: number) {
  const minersUndervalued = minerPercentile < 25;
  const minersFairValue = minerPercentile >= 25 && minerPercentile <= 75;

  if (pctParity < 30 && gdiSignal === 'bullish' && minersUndervalued)
    return { text: 'STRONG BUY MINERS', color: 'bullish', detail: 'Gold cheap relative to M2, forces turning, miners doubly discounted' };
  if (pctParity < 30 && gdiSignal === 'bearish')
    return { text: 'ACCUMULATE ON WEAKNESS', color: 'neutral', detail: 'Gold cheap but headwinds present — be patient' };
  if (pctParity >= 30 && pctParity < 60 && gdiSignal === 'bullish' && minersUndervalued)
    return { text: 'ACCUMULATE MINERS', color: 'bullish', detail: 'Gold fairly priced with bullish forces and miner discount' };
  if (pctParity >= 30 && pctParity < 60 && gdiSignal === 'bullish' && minersFairValue)
    return { text: 'HOLD / ADD GOLD', color: 'primary', detail: 'Forces positive but miner premium already captured' };
  if (pctParity >= 30 && pctParity < 60 && gdiSignal === 'bearish')
    return { text: 'HOLD', color: 'neutral', detail: 'Mixed signals — maintain current allocation' };
  if (pctParity >= 60 && pctParity < 100 && gdiSignal === 'bullish' && minersUndervalued)
    return { text: 'HOLD / ADD SELECTIVELY', color: 'primary', detail: 'Gold elevated but momentum strong and miners still cheap' };
  if (pctParity >= 60 && pctParity < 100 && gdiSignal === 'bearish')
    return { text: 'TAKE PROFITS', color: 'bearish', detail: 'Gold expensive and forces turning — trim positions' };
  if (pctParity >= 100)
    return { text: 'REDUCE', color: 'bearish', detail: 'Gold above investable parity. Historically followed by multi-year corrections.' };
  return { text: 'HOLD', color: 'neutral', detail: 'Mixed signals — maintain current allocation' };
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function SignalPositioning({
  anchorResult, gdiResult, leverageResult, currentGDI, currentGoldPrice, currentGDXPrice, probs, scenarioConfig
}: Props) {
  const pctParity = anchorResult?.pctOfInvestableParity ?? 50;
  const gdiSignal = currentGDI > 0.5 ? 'bullish' : currentGDI < -0.5 ? 'bearish' : 'neutral';
  const minerPercentile = leverageResult?.currentPercentile ?? 50;

  const positioning = derivePositioning(pctParity, gdiSignal, minerPercentile);

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

  const keyDriver = gdiResult?.variableDetails.reduce((best, v) =>
    Math.abs(v.contribution) > Math.abs(best.contribution) ? v : best
  );

  const percentileDesc = minerPercentile < 25 ? 'undervalued' : minerPercentile > 75 ? 'overvalued' : 'fairly valued';
  const zoneInfo = anchorResult ? getZone(pctParity) : null;

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

  const narrative = `Gold at ${pctParity.toFixed(0)}% of investable parity (${zoneInfo?.label || '—'}). The GDI reads ${currentGDI >= 0 ? '+' : ''}${currentGDI.toFixed(1)} / ${gdiSignal.toUpperCase()}, driven primarily by ${keyDriver?.name || 'multiple factors'}. Miners (GDX) at the ${minerPercentile.toFixed(0)}th percentile — ${percentileDesc}. 5-year expected CAGR: ${goldCagr5y} gold, ${gdxCagr5y} GDX.`;

  return (
    <div className={`bg-card border border-border ${borderColorMap[positioning.color]} border-l-4 rounded-xl p-6 sm:p-7 space-y-4`}>
      <div>
        <GuideTooltip id="positioning-call" text="This recommendation comes from the three-lens convergence: gold's position vs investable parity (Anchor), macro force direction (GDI), and miner leverage (GDX/Gold ratio). When all three agree, conviction is highest.">
          <h2 className={`font-display text-2xl ${textColorMap[positioning.color]}`}>
            {positioning.text}
          </h2>
        </GuideTooltip>
        <p className="text-sm text-muted-foreground mt-2">{positioning.detail}</p>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed">
        {narrative}
      </p>
    </div>
  );
}
