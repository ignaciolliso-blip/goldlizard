import { type SolanaLeverageResult } from '@/lib/solanaEngine';
import { cn } from '@/lib/utils';

interface Props {
  result: SolanaLeverageResult;
}

const exposureOptions = [
  { option: 'SOL directly', vehicle: 'Self-custody wallet (Phantom, Solflare)', risk: 'HIGH', suit: 'Crypto-native investors. Full upside + downside. You manage keys.' },
  { option: 'SOL Spot ETF', vehicle: 'BSOL (Bitwise), FSOL (Fidelity)', risk: 'MED', suit: 'Regulated, custodied. No key management. Accessible via European brokers.' },
  { option: 'Solana staking', vehicle: 'Via wallet or ETF w/ staking', risk: 'MED', suit: 'Earn ~6-7% yield on SOL. Reduces effective cost basis. 2-3 day unstaking cooldown.' },
  { option: 'Ecosystem tokens', vehicle: 'JTO, JUP, BONK, etc.', risk: 'V.HIGH', suit: 'Higher beta. Can outperform or go to zero.' },
  { option: 'Agentic tokens', vehicle: 'ai16z/elizaOS, VIRTUAL, ARC', risk: 'V.HIGH', suit: 'Direct bet on agentic thesis. Extremely volatile. Most will fail.' },
];

export default function SolanaLeverageCard({ result }: Props) {
  const sigColor = result.timingSignal.color === 'bullish' ? 'text-bullish border-bullish' :
    result.timingSignal.color === 'bearish' ? 'text-bearish border-bearish' : 'text-neutral border-neutral';

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6 space-y-5">
      <div>
        <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">The Leverage</p>
        <p className="text-sm text-muted-foreground italic mt-1">What's the best way to get exposure — and is now the right time?</p>
      </div>

      {/* Timing signal */}
      <div className={cn('border-l-2 pl-4 py-3 rounded-r-lg bg-secondary/20', sigColor)}>
        <p className={cn('font-mono text-sm font-bold', sigColor.split(' ')[0])}>
          {result.timingSignal.text}
        </p>
      </div>

      {/* Exposure options */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono tracking-wider text-muted-foreground">EXPOSURE OPTIONS — RANKED BY RISK</p>
        <div className="space-y-1.5">
          {exposureOptions.map((opt, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-3 py-2 px-3 rounded-lg bg-secondary/20 text-xs">
              <div>
                <p className="text-foreground font-medium">{opt.option}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">{opt.vehicle}</p>
                <p className="text-muted-foreground/70 text-[10px] mt-0.5">{opt.suit}</p>
              </div>
              <span className={cn('font-mono text-[10px] self-start mt-0.5',
                opt.risk === 'V.HIGH' ? 'text-bearish' :
                opt.risk === 'HIGH' ? 'text-neutral' : 'text-muted-foreground'
              )}>
                {opt.risk}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
