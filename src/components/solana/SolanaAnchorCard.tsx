import { type SolanaAnchorResult, formatUSD } from '@/lib/solanaEngine';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface Props {
  result: SolanaAnchorResult;
}

const GAUGE_ZONES = [
  { label: 'EXTREME PREMIUM', ratio: 50000, y: 0 },
  { label: 'Most L1 chains', ratio: 10000, y: 14 },
  { label: '', ratio: 5000, y: 28 },
  { label: '', ratio: 1000, y: 55 },
  { label: '', ratio: 500, y: 69 },
  { label: 'ETHEREUM (~300×)', ratio: 300, y: 80 },
  { label: 'Mature tech', ratio: 100, y: 90 },
  { label: 'VALUE', ratio: 50, y: 100 },
];

function getRatioY(ratio: number): number {
  if (ratio <= 0) return 100;
  for (let i = 0; i < GAUGE_ZONES.length - 1; i++) {
    const top = GAUGE_ZONES[i];
    const bot = GAUGE_ZONES[i + 1];
    if (ratio >= bot.ratio && ratio <= top.ratio) {
      const pct = Math.log(ratio / bot.ratio) / Math.log(top.ratio / bot.ratio);
      return bot.y + (top.y - bot.y) * (1 - pct);
    }
  }
  return ratio > 50000 ? 0 : 100;
}

const colorMap: Record<string, string> = {
  bearish: 'text-bearish',
  bullish: 'text-bullish',
  neutral: 'text-neutral',
  muted: 'text-muted-foreground',
};

export default function SolanaAnchorCard({ result }: Props) {
  const trendIcon = result.ratioTrend6m === 'compressing' ? <TrendingDown size={16} /> :
    result.ratioTrend6m === 'expanding' ? <TrendingUp size={16} /> : <Minus size={16} />;
  const trendColor = result.ratioTrend6m === 'compressing' ? 'text-bullish' :
    result.ratioTrend6m === 'expanding' ? 'text-bearish' : 'text-muted-foreground';
  const trendLabel = result.ratioTrend6m === 'compressing' ? 'COMPRESSING ↓' :
    result.ratioTrend6m === 'expanding' ? 'EXPANDING ↑' : 'FLAT';

  const solY = getRatioY(result.fdvFeeRatio);

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6 space-y-5">
      <div>
        <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">The Anchor</p>
        <p className="text-sm text-muted-foreground italic mt-1">Is Solana cheap or expensive relative to what the network earns?</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">FDV</p>
          <p className="font-mono text-foreground text-base">{formatUSD(result.fdv)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Daily Fee Revenue</p>
          <p className="font-mono text-foreground text-base">{result.dailyFees > 0 ? formatUSD(result.dailyFees) : '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Annualised</p>
          <p className="font-mono text-foreground text-base">{result.annualisedFees > 0 ? formatUSD(result.annualisedFees) : '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">FDV / Ann. Fee Rev</p>
          <p className="font-mono text-foreground text-lg font-bold">
            {result.fdvFeeRatio > 0 ? `${Math.round(result.fdvFeeRatio).toLocaleString()}×` : '—'}
          </p>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-secondary/30">
        <span className="text-xs text-muted-foreground">6-Month Trend:</span>
        <span className={cn('flex items-center gap-1 font-mono text-sm font-semibold', trendColor)}>
          {trendIcon} {trendLabel}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">vs ETH: ~{Math.round(result.ethFdvFeeRatio)}×</span>
      </div>

      {/* Vertical gauge */}
      {result.fdvFeeRatio > 0 && (
        <div className="relative h-48 ml-28 mr-4">
          {GAUGE_ZONES.map((z, i) => (
            <div key={i} className="absolute left-0 right-0 flex items-center" style={{ top: `${z.y}%` }}>
              <span className="absolute -left-28 w-24 text-right text-[10px] font-mono text-muted-foreground">
                {z.ratio >= 1000 ? `${(z.ratio / 1000).toFixed(0)}K×` : `${z.ratio}×`}
              </span>
              <div className="w-full h-px bg-border/40" />
              {z.label && (
                <span className="absolute left-2 text-[10px] text-muted-foreground/70 whitespace-nowrap">{z.label}</span>
              )}
            </div>
          ))}
          {/* Solana position */}
          <div
            className="absolute left-0 flex items-center gap-2 z-10"
            style={{ top: `${solY}%`, transform: 'translateY(-50%)' }}
          >
            <div className="w-3 h-3 rounded-full bg-solana shadow-[0_0_8px_hsl(var(--solana)/0.6)]" />
            <span className="text-xs font-mono font-bold text-solana">SOLANA</span>
          </div>
        </div>
      )}

      {/* Conclusion */}
      <div className={cn('border-l-2 pl-4 py-2', 
        result.conclusion.color === 'bearish' ? 'border-bearish' :
        result.conclusion.color === 'bullish' ? 'border-bullish' :
        result.conclusion.color === 'neutral' ? 'border-neutral' : 'border-muted-foreground'
      )}>
        <p className={cn('font-mono text-sm font-bold', colorMap[result.conclusion.color] || 'text-foreground')}>
          {result.conclusion.text}
        </p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{result.conclusion.detail}</p>
      </div>
    </div>
  );
}
