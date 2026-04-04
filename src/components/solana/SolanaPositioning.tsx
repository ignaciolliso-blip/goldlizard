import { cn } from '@/lib/utils';
import type { SolanaAnchorResult, SolanaForcesResult, SolanaLeverageResult } from '@/lib/solanaEngine';
import { formatUSD } from '@/lib/solanaEngine';

interface Props {
  anchor: SolanaAnchorResult;
  forces: SolanaForcesResult;
  leverage: SolanaLeverageResult;
  solPrice: number;
}

function derivePositioning(anchor: SolanaAnchorResult, forces: SolanaForcesResult) {
  const trend = anchor.ratioTrend6m;
  const verdict = forces.overallVerdict;
  const ratio = anchor.fdvFeeRatio;

  if (verdict === 'contracting') {
    return {
      action: 'DO NOT BUY',
      detail: 'Network activity is contracting across multiple tiers. The thesis is not supported by data. Wait for stabilisation before considering any position.',
      color: 'bearish',
    };
  }
  if (trend === 'expanding' && verdict === 'growing') {
    return {
      action: 'HOLD — MONITOR CLOSELY',
      detail: 'Fundamentals are growing but the market is pricing in that growth aggressively. The FDV/Fee ratio is expanding, meaning you\'re paying more per dollar of fee revenue than before. Good fundamentals, but frothy valuation.',
      color: 'neutral',
    };
  }
  if (trend === 'expanding' && verdict === 'stalling') {
    return {
      action: 'REDUCE EXPOSURE',
      detail: 'Valuation expanding while growth stalls is the worst combination for risk/reward. Price is running on narrative, not fundamentals.',
      color: 'bearish',
    };
  }
  if (trend === 'compressing' && verdict === 'growing' && ratio < 2000) {
    return {
      action: 'ACCUMULATE',
      detail: 'Fundamentals improving and valuation becoming more reasonable. The FDV/Fee ratio is compressing — fees are growing faster than price. This is the signal you want to see.',
      color: 'bullish',
    };
  }
  if (trend === 'compressing' && verdict === 'growing') {
    return {
      action: 'ACCUMULATE ON WEAKNESS',
      detail: 'Ratio still elevated but compressing with growing fundamentals. Patient accumulation on dips makes sense here.',
      color: 'bullish',
    };
  }
  if (trend === 'compressing' && verdict === 'stalling') {
    return {
      action: 'HOLD CAUTIOUSLY',
      detail: 'Ratio improving but usage metrics stalling. The ratio compression may be from price decline rather than fee growth. Watch for fee acceleration before adding.',
      color: 'neutral',
    };
  }
  return {
    action: 'NEUTRAL',
    detail: 'No clear signal from the combination of valuation trend and network activity. Maintain current allocation and monitor weekly.',
    color: 'neutral',
  };
}

export default function SolanaPositioning({ anchor, forces, leverage, solPrice }: Props) {
  const pos = derivePositioning(anchor, forces);
  const actionColor = pos.color === 'bullish' ? 'text-bullish' :
    pos.color === 'bearish' ? 'text-bearish' : 'text-neutral';

  // Build narrative
  const narrative = forces.overallVerdict === 'contracting'
    ? `Solana's network activity is contracting. TVL, stablecoin supply, and transaction volume are declining. The FDV/Fee Revenue ratio is ${anchor.fdvFeeRatio > 0 ? `${Math.round(anchor.fdvFeeRatio).toLocaleString()}×` : 'N/A'}, ${anchor.ratioTrend6m === 'expanding' ? 'and expanding — meaning the market is paying MORE per dollar of fee revenue than before. This is the opposite of what you want to see.' : anchor.ratioTrend6m === 'compressing' ? 'though compressing as price adjusts to weaker fundamentals.' : 'and flat.'} SOL at ${formatUSD(solPrice)} reflects narrative premium, not fundamental value. Do not add to positions until metrics stabilise.`
    : `Solana is generating ${anchor.annualisedFees > 0 ? formatUSD(anchor.annualisedFees) : 'N/A'} in annualised fee revenue. The FDV/Fee ratio is ${anchor.fdvFeeRatio > 0 ? `${Math.round(anchor.fdvFeeRatio).toLocaleString()}×` : 'N/A'} (vs Ethereum at ~${Math.round(anchor.ethFdvFeeRatio)}×). The ratio is ${anchor.ratioTrend6m}, which ${anchor.ratioTrend6m === 'compressing' ? 'indicates fees are growing faster than price — a healthy sign' : anchor.ratioTrend6m === 'expanding' ? 'suggests the market is getting ahead of fundamentals' : 'shows no clear direction'}. Network activity is ${forces.overallVerdict}.`;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6 space-y-5">
      <div>
        <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">Positioning</p>
      </div>

      {/* Action */}
      <div className="flex items-start gap-4">
        <div className={cn('font-mono text-xl font-bold', actionColor)}>{pos.action}</div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{pos.detail}</p>

      {/* Matrix summary */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-secondary/30 rounded-lg p-3">
          <p className="text-muted-foreground mb-1">Anchor</p>
          <p className="font-mono text-foreground">{anchor.fdvFeeRatio > 0 ? `${Math.round(anchor.fdvFeeRatio).toLocaleString()}×` : '—'}</p>
          <p className={cn('text-[10px]',
            anchor.ratioTrend6m === 'compressing' ? 'text-bullish' :
            anchor.ratioTrend6m === 'expanding' ? 'text-bearish' : 'text-muted-foreground'
          )}>{anchor.ratioTrend6m}</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3">
          <p className="text-muted-foreground mb-1">Forces</p>
          <p className={cn('font-mono uppercase',
            forces.overallVerdict === 'growing' ? 'text-bullish' :
            forces.overallVerdict === 'contracting' ? 'text-bearish' : 'text-neutral'
          )}>{forces.overallVerdict}</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3">
          <p className="text-muted-foreground mb-1">Timing</p>
          <p className={cn('font-mono text-[11px]',
            leverage.timingSignal.color === 'bullish' ? 'text-bullish' :
            leverage.timingSignal.color === 'bearish' ? 'text-bearish' : 'text-neutral'
          )}>{leverage.timingSignal.text.split('—')[0].trim()}</p>
        </div>
      </div>

      {/* Narrative */}
      <div className="bg-secondary/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{narrative}</p>
      </div>
    </div>
  );
}
