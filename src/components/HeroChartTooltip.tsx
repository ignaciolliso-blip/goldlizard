import type { ScenarioProbabilities } from '@/lib/scenarioEngine';
import { BANK_CONSENSUS } from '@/lib/scenarioEngine';

interface HeroChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
  probs: ScenarioProbabilities;
  showBankConsensus: boolean;
  todayTs: number;
}

const HeroChartTooltip = ({ active, payload, label, probs, showBankConsensus, todayTs }: HeroChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const dateTs = label as number;
  const d = new Date(dateTs);
  const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const isForecast = dateTs > todayTs;

  const getValue = (key: string) => {
    const item = payload.find((p: any) => p.dataKey === key);
    return item?.value as number | undefined;
  };

  if (isForecast) {
    const bull = getValue('bullForecast');
    const base = getValue('baseForecast');
    const bear = getValue('bearForecast');
    const ev = getValue('evForecast');

    // Find matching bank consensus
    const banks = showBankConsensus
      ? BANK_CONSENSUS.filter(b => {
          const bTs = new Date(b.date).getTime();
          return Math.abs(bTs - dateTs) < 30 * 24 * 60 * 60 * 1000;
        })
      : [];

    return (
      <div className="bg-card border border-card-border rounded-lg px-3 py-2 shadow-xl text-xs">
        <p className="text-muted-foreground mb-1.5">{dateStr}</p>
        {bull !== undefined && (
          <p className="text-bullish">
            Bull: ${bull.toLocaleString()} <span className="text-muted-foreground">({(probs.bull * 100).toFixed(0)}%)</span>
          </p>
        )}
        {base !== undefined && (
          <p className="text-gold">
            Base: ${base.toLocaleString()} <span className="text-muted-foreground">({(probs.base * 100).toFixed(0)}%)</span>
          </p>
        )}
        {bear !== undefined && (
          <p className="text-bearish">
            Bear: ${bear.toLocaleString()} <span className="text-muted-foreground">({(probs.bear * 100).toFixed(0)}%)</span>
          </p>
        )}
        {ev !== undefined && (
          <p className="text-gold-light font-semibold mt-1 border-t border-card-border pt-1">
            EV: ${ev.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )}
        {banks.map(b => (
          <p key={b.bank} className="text-gold-light mt-0.5">
            ◆ {b.bank}: ${b.price.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }

  // Historical tooltip
  const goldSpot = getValue('goldSpot');
  const goldFutures = getValue('goldFutures');
  const gdi = getValue('gdi');

  return (
    <div className="bg-card border border-card-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1.5">{dateStr}</p>
      {goldSpot !== undefined && (
        <p className="text-gold">Gold: ${goldSpot.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      )}
      {goldFutures !== undefined && (
        <p className="text-futures-purple">London Fix: ${goldFutures.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      )}
      {gdi !== undefined && (
        <p className="text-index-blue">GDI: {gdi.toFixed(3)}</p>
      )}
    </div>
  );
};

export default HeroChartTooltip;
