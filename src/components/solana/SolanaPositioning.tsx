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

  // Strong fundamentals: ratio < 50×
  if (ratio > 0 && ratio < 50) {
    if (verdict === 'insufficient_data') {
      return {
        action: 'PROMISING FUNDAMENTALS — ACCUMULATING DATA',
        detail: 'Fee revenue strongly supports the current valuation (comparable to mature tech platforms). Need at least 7 days of network data to confirm usage trends. Check back in one week.',
        color: 'neutral',
      };
    }
    if (verdict === 'growing') {
      return {
        action: 'ACCUMULATE',
        detail: `FDV/Fee ratio of ${Math.round(ratio)}× is strong fundamental value — cheaper than Ethereum and in line with mature payment networks. Network activity is growing, confirming fee sustainability.`,
        color: 'bullish',
      };
    }
    if (verdict === 'contracting') {
      return {
        action: 'HOLD CAUTIOUSLY',
        detail: `Fee fundamentals are strong (${Math.round(ratio)}× is cheaper than Ethereum), but network usage is declining. Watch whether fee revenue holds up despite lower activity — if fees persist, this is a buying opportunity.`,
        color: 'neutral',
      };
    }
    // stalling
    return {
      action: 'HOLD — MONITOR CLOSELY',
      detail: `Fee fundamentals are strong at ${Math.round(ratio)}×, but network activity is flat. If usage re-accelerates, this becomes a clear accumulation signal.`,
      color: 'neutral',
    };
  }

  // Moderate premium: 50-500×
  if (ratio >= 50 && ratio <= 500) {
    if (verdict === 'insufficient_data') {
      return {
        action: 'WAIT — ACCUMULATING DATA',
        detail: `FDV/Fee ratio of ${Math.round(ratio)}× implies a growth premium. Need trend data to assess whether the premium is justified. Check back in one week.`,
        color: 'neutral',
      };
    }
    if (verdict === 'growing' && trend === 'compressing') {
      return {
        action: 'ACCUMULATE',
        detail: 'Growth premium with improving fundamentals and compressing valuation. Fees growing faster than price — healthy setup.',
        color: 'bullish',
      };
    }
    if (verdict === 'growing') {
      return {
        action: 'ACCUMULATE ON WEAKNESS',
        detail: 'Moderate growth premium with improving network activity. Patient accumulation on dips makes sense.',
        color: 'bullish',
      };
    }
    if (verdict === 'contracting') {
      return {
        action: 'REDUCE EXPOSURE',
        detail: `Growth premium of ${Math.round(ratio)}× is not supported by current network trends. Activity contracting while valuation assumes growth.`,
        color: 'bearish',
      };
    }
    return {
      action: 'HOLD — MONITOR',
      detail: `Moderate premium with stalling activity. Watch for directional break in usage metrics.`,
      color: 'neutral',
    };
  }

  // Expensive: > 500×
  if (verdict === 'insufficient_data') {
    return {
      action: 'WAIT — HIGH VALUATION, NO TREND DATA',
      detail: `FDV/Fee ratio of ${ratio > 0 ? Math.round(ratio).toLocaleString() + '×' : 'N/A'} reflects significant narrative premium. Need trend data before taking a position. Do not buy blind at this valuation.`,
      color: 'neutral',
    };
  }
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
      detail: 'Fundamentals are growing but the market is pricing in that growth aggressively. The FDV/Fee ratio is expanding, meaning you\'re paying more per dollar of fee revenue than before.',
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
      detail: 'Ratio improving but usage metrics stalling. Watch for fee acceleration before adding.',
      color: 'neutral',
    };
  }
  return {
    action: 'NEUTRAL',
    detail: 'No clear signal from the combination of valuation trend and network activity. Maintain current allocation and monitor weekly.',
    color: 'neutral',
  };
}

function buildNarrative(anchor: SolanaAnchorResult, forces: SolanaForcesResult, solPrice: number): string {
  const ratio = anchor.fdvFeeRatio;
  const verdict = forces.overallVerdict;
  const feesStr = anchor.annualisedFees > 0 ? formatUSD(anchor.annualisedFees) : 'N/A';
  const ratioStr = ratio > 0 ? `${Math.round(ratio).toLocaleString()}×` : 'N/A';
  const ethRatioStr = `~${Math.round(anchor.ethFdvFeeRatio)}×`;

  const activityStatus = verdict === 'insufficient_data'
    ? 'insufficient historical data to determine trends (need 7+ daily snapshots)'
    : verdict;

  // Strong fundamentals narrative (< 50×)
  if (ratio > 0 && ratio < 50) {
    return `Solana's FDV/Fee ratio of ${ratioStr} indicates the network generates significant revenue relative to its valuation — comparable to mature tech platforms and ${Math.round(anchor.ethFdvFeeRatio / ratio)}× cheaper than Ethereum (${ethRatioStr}). Annualised fee revenue is ${feesStr}. However, network activity metrics show ${activityStatus}, which ${verdict === 'growing' ? 'confirms fee sustainability' : verdict === 'insufficient_data' ? 'means trend confirmation is pending' : 'raises questions about whether current fee levels are sustainable'}.`;
  }

  // Moderate premium narrative (50-500×)
  if (ratio > 0 && ratio <= 500) {
    return `Solana is generating ${feesStr} in annualised fee revenue with an FDV/Fee ratio of ${ratioStr} (vs Ethereum at ${ethRatioStr}). This implies a growth premium — the market expects fees to grow ${Math.round(ratio / 100)}-${Math.round(ratio / 30)}× to reach mature valuations. The ratio is ${anchor.ratioTrend6m}. Network activity is ${activityStatus}.`;
  }

  // Expensive narrative (> 500×)
  if (verdict === 'insufficient_data') {
    return `Solana is generating ${feesStr} in annualised fee revenue. The FDV/Fee ratio is ${ratioStr} (vs Ethereum at ${ethRatioStr}), reflecting a significant narrative premium. SOL at ${formatUSD(solPrice)} embeds expectations of substantial fee growth. Trend data is insufficient — need at least 7 daily snapshots to assess direction.`;
  }

  if (verdict === 'contracting') {
    return `Solana's network activity is contracting. TVL, stablecoin supply, and transaction volume are declining. The FDV/Fee ratio is ${ratioStr}, ${anchor.ratioTrend6m === 'expanding' ? 'and expanding — the market is paying MORE per dollar of fee revenue. This is the opposite of what you want to see.' : anchor.ratioTrend6m === 'compressing' ? 'though compressing as price adjusts to weaker fundamentals.' : 'and flat.'} SOL at ${formatUSD(solPrice)} reflects narrative premium, not fundamental value. Do not add to positions until metrics stabilise.`;
  }

  return `Solana is generating ${feesStr} in annualised fee revenue. The FDV/Fee ratio is ${ratioStr} (vs Ethereum at ${ethRatioStr}). The ratio is ${anchor.ratioTrend6m}, which ${anchor.ratioTrend6m === 'compressing' ? 'indicates fees are growing faster than price — a healthy sign' : anchor.ratioTrend6m === 'expanding' ? 'suggests the market is getting ahead of fundamentals' : 'shows no clear direction'}. Network activity is ${verdict}.`;
}

export default function SolanaPositioning({ anchor, forces, leverage, solPrice }: Props) {
  const pos = derivePositioning(anchor, forces);
  const actionColor = pos.color === 'bullish' ? 'text-bullish' :
    pos.color === 'bearish' ? 'text-bearish' : 'text-neutral';

  const narrative = buildNarrative(anchor, forces, solPrice);

  const forcesVerdictDisplay = forces.overallVerdict === 'insufficient_data'
    ? 'NO DATA'
    : forces.overallVerdict;
  const forcesColor = forces.overallVerdict === 'growing' ? 'text-bullish' :
    forces.overallVerdict === 'contracting' ? 'text-bearish' :
    'text-muted-foreground';

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

      {/* Insufficient data warning */}
      {forces.insufficientData && (
        <div className="bg-muted/50 border border-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            ⚠️ <span className="font-medium">Limited data:</span> Fewer than 7 daily snapshots available. Need 7+ days to calculate trends. Forces verdict will update automatically as data accumulates.
          </p>
        </div>
      )}

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
          <p className={cn('font-mono uppercase', forcesColor)}>{forcesVerdictDisplay}</p>
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
