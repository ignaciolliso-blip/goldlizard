import { type SolanaForcesResult, formatUSD, formatNumber } from '@/lib/solanaEngine';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface Props {
  result: SolanaForcesResult;
}

function SignalIcon({ signal }: { signal: 'up' | 'down' | 'flat' }) {
  if (signal === 'up') return <ArrowUp size={12} className="text-bullish" />;
  if (signal === 'down') return <ArrowDown size={12} className="text-bearish" />;
  return <Minus size={12} className="text-muted-foreground" />;
}

function formatValue(v: number | string): string {
  if (typeof v === 'string') return v;
  if (v === 0) return '—';
  if (v >= 1e9) return formatUSD(v);
  if (v >= 1e6) return formatUSD(v);
  if (v >= 1e3) return formatNumber(v);
  return v.toFixed(0);
}

const tierLabels: Record<number, { name: string; color: string }> = {
  1: { name: 'AGENTIC ECONOMY', color: 'text-solana-cyan' },
  2: { name: 'ECOSYSTEM HEALTH', color: 'text-solana-green' },
  3: { name: 'MARKET CONDITIONS', color: 'text-solana' },
};

export default function SolanaForcesCard({ result }: Props) {
  const verdictColor = result.overallVerdict === 'growing' ? 'text-bullish' :
    result.overallVerdict === 'contracting' ? 'text-bearish' :
    result.overallVerdict === 'insufficient_data' ? 'text-muted-foreground' : 'text-neutral';

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6 space-y-5">
      <div>
        <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">The Forces</p>
        <p className="text-sm text-muted-foreground italic mt-1">Is network usage growing or shrinking — and who's using it?</p>
      </div>

      {/* Metrics by tier */}
      {[1, 2, 3].map(tier => {
        const tierInfo = tierLabels[tier];
        const tierMetrics = result.metrics.filter(m => m.tier === tier);
        const score = tier === 1 ? result.tier1Score : tier === 2 ? result.tier2Score : result.tier3Score;

        return (
          <div key={tier} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={cn('text-[10px] font-mono tracking-wider', tierInfo.color)}>
                TIER {tier}: {tierInfo.name}
              </p>
              <span className={cn('text-[10px] font-mono',
                score.verdict === 'GROWING' ? 'text-bullish' :
                score.verdict === 'CONTRACTING' ? 'text-bearish' : 'text-neutral'
              )}>
                {score.improving}/{score.total} → {score.verdict}
              </span>
            </div>
            <div className="space-y-1">
              {tierMetrics.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-secondary/20">
                  <span className="text-muted-foreground text-xs">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground text-xs">{formatValue(m.value)}</span>
                    <SignalIcon signal={m.signal} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Overall verdict */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">NET SIGNAL</span>
          <span className={cn('font-mono font-bold text-sm uppercase', verdictColor)}>
            {result.overallVerdict === 'insufficient_data' ? 'INSUFFICIENT DATA' : result.overallVerdict}
          </span>
        </div>
        {result.overallVerdict === 'contracting' && (
          <p className="text-xs text-bearish mt-2">
            Network activity is contracting. This is not a buying signal.
          </p>
        )}
        {result.overallVerdict === 'insufficient_data' && (
          <p className="text-xs text-muted-foreground mt-2">
            Need at least 7 daily snapshots to determine trends. Data is accumulating automatically.
          </p>
        )}
      </div>
    </div>
  );
}
