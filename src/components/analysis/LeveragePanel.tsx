import { useMemo } from 'react';
import type { LeverageResult, GoldMinerValuation } from '@/lib/leverageEngine';
import { projectGoldPNAV, deriveLeverageConclusion, HISTORICAL_AVG_PNAV, HISTORICAL_PEAK_PNAV, HISTORICAL_TROUGH_PNAV } from '@/lib/leverageEngine';
import type { Observation } from '@/lib/dataFetcher';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';
import { GuideTooltip } from '@/components/GuideMode';

interface Props {
  leverageResult: LeverageResult;
  goldSpot: Observation[];
  currentGoldPrice: number;
  currentGDXPrice: number;
  scenarioConfig: ScenarioConfig | null;
  probs: ScenarioProbabilities;
}

function pnavColor(pnav: number): string {
  if (pnav < 0.8) return 'text-bullish';
  if (pnav <= 1.5) return 'text-neutral';
  return 'text-bearish';
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function LeveragePanel({
  leverageResult, goldSpot, currentGoldPrice, currentGDXPrice, scenarioConfig, probs,
}: Props) {
  const { sectorPNAV, miners } = leverageResult;
  const conclusion = deriveLeverageConclusion(sectorPNAV);

  // Projected P/NAV
  const projected = useMemo(() => {
    const horizons = [
      { key: '1y', years: 1 },
      { key: '3y', years: 3 },
      { key: '5y', years: 5 },
    ];
    return horizons.map(h => ({
      ...h,
      pnav: projectGoldPNAV(sectorPNAV, HISTORICAL_AVG_PNAV, h.years),
    }));
  }, [sectorPNAV]);

  // Projected GDX prices
  const projectedGDX = useMemo(() => {
    if (!scenarioConfig?.scenarios?.length) return {};
    const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
    const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
    const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');
    if (!bull || !base || !bear) return {};

    const result: Record<string, number> = {};
    for (const p of projected) {
      const goldEV = probs.bull * bull.targets[p.key as keyof typeof bull.targets]
        + probs.base * base.targets[p.key as keyof typeof base.targets]
        + probs.bear * bear.targets[p.key as keyof typeof bear.targets];
      result[p.key] = currentGDXPrice * (goldEV / currentGoldPrice) * (p.pnav / sectorPNAV);
    }
    return result;
  }, [scenarioConfig, probs, projected, sectorPNAV, currentGDXPrice, currentGoldPrice]);

  const gdxCagr5y = projectedGDX['5y'] ? (Math.pow(projectedGDX['5y'] / currentGDXPrice, 1 / 5) - 1) * 100 : 0;

  // P/NAV gauge position
  const gaugeMin = 0.3;
  const gaugeMax = 2.5;
  const clampPct = (v: number) => Math.max(0, Math.min(100, ((v - gaugeMin) / (gaugeMax - gaugeMin)) * 100));

  // Sort miners: producers first (by p_nav), then royalty/streaming
  const sortedMiners = useMemo(() =>
    [...miners].sort((a, b) => {
      const aIsRoyalty = a.stage.includes('Royalty') || a.stage.includes('Stream');
      const bIsRoyalty = b.stage.includes('Royalty') || b.stage.includes('Stream');
      if (aIsRoyalty !== bIsRoyalty) return aIsRoyalty ? 1 : -1;
      return b.nav_usd_bn - a.nav_usd_bn;
    }),
  [miners]);

  const avgAISC = useMemo(() => {
    const producers = miners.filter(m => m.aisc_per_oz > 0);
    if (!producers.length) return 1400;
    return producers.reduce((s, m) => s + m.aisc_per_oz, 0) / producers.length;
  }, [miners]);

  const margin = currentGoldPrice - avgAISC;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">THE LEVERAGE</h2>
        <p className="text-[15px] text-muted-foreground/70 italic mt-1">
          Are gold miners cheap or expensive based on the value of their gold in the ground?
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-5">
        {/* Calculation explanation */}
        <div className="text-[15px] text-muted-foreground space-y-2">
          <p className="text-xs tracking-widest uppercase text-muted-foreground/80 font-semibold">How This Is Calculated</p>
          <div className="font-mono text-xs leading-relaxed bg-muted/30 rounded-lg p-3 space-y-1">
            <p><span className="text-foreground">P/NAV</span> = Share Price ÷ Net Asset Value per share</p>
            <p><span className="text-foreground">NAV</span> = present value of gold reserves at forward prices,</p>
            <p className="ml-4">minus extraction costs (AISC), discounted at 5–8%.</p>
            <p className="mt-2">A P/NAV of <span className="text-foreground">1.0×</span> means you're paying exactly what the gold in the ground is worth.</p>
            <p>Below 1.0× = buying gold reserves <span className="text-bullish">at a discount</span>.</p>
            <p>Above 1.0× = paying a <span className="text-bearish">premium</span> for growth or quality.</p>
          </div>
        </div>

        {/* Miner valuations table */}
        <div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">
            GDX Top Holdings — Valuation vs Net Asset Value
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Company</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">P/NAV</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">AISC/oz</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Jurisdiction</th>
                </tr>
              </thead>
              <tbody>
                {sortedMiners.map((m) => {
                  const isRoyalty = m.stage.includes('Royalty') || m.stage.includes('Stream');
                  return (
                    <tr key={m.ticker} className="border-b border-border">
                      <td className="px-3 py-2">
                        <span className="text-foreground font-mono">{m.company}</span>
                        <span className="text-muted-foreground/60 ml-1.5 text-xs">({m.ticker})</span>
                      </td>
                      <td className={`text-right px-3 py-2 font-mono font-semibold ${pnavColor(m.p_nav)}`}>
                        {m.p_nav.toFixed(1)}×
                      </td>
                      <td className="text-right px-3 py-2 font-mono text-muted-foreground">
                        {isRoyalty ? 'N/A' : `$${m.aisc_per_oz.toLocaleString()}`}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{m.jurisdiction}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-2 italic">
            Note: Royalty/streaming cos (FNV, WPM) always trade at higher P/NAV — no operating costs, no capex.
            A 2.0–2.5× P/NAV for them is "fair." Producer P/NAVs tell you if the sector is cheap or expensive.
          </p>
        </div>

        {/* P/NAV Gauge */}
        <div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">Sector P/NAV Gauge</p>
          <div className="relative h-4 rounded-full overflow-hidden bg-gradient-to-r from-bullish/30 via-neutral/20 to-bearish/30">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary border-2 border-background shadow-[0_0_8px_hsl(var(--primary)/0.5)] z-10"
              style={{ left: `${clampPct(sectorPNAV)}%`, transform: 'translate(-50%, -50%)' }}
            />
            {/* Historical avg marker */}
            <div
              className="absolute top-0 bottom-0 w-px bg-muted-foreground/40"
              style={{ left: `${clampPct(HISTORICAL_AVG_PNAV)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono">
            <span>0.3×</span>
            <span>0.8×</span>
            <span>1.0×</span>
            <span>1.3× avg</span>
            <span>2.5×</span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-1.5 text-sm font-mono text-muted-foreground">
          <p>
            Sector P/NAV: <span className={`font-semibold ${pnavColor(sectorPNAV)}`}>{sectorPNAV.toFixed(2)}×</span>
            {' · '}Hist. avg: <span className="text-foreground">{HISTORICAL_AVG_PNAV}×</span>
            {' · '}Margin: <span className="text-foreground">{fmt(margin)}/oz</span>
          </p>
          <p>
            GDX: <span className="text-foreground">${currentGDXPrice.toFixed(2)}</span>
            {' · '}Gold: <span className="text-foreground">{fmt(currentGoldPrice)}</span>
            {' · '}Avg AISC: <span className="text-foreground">{fmt(avgAISC)}</span>
          </p>
          {projectedGDX['5y'] && (
            <p>
              Proj GDX 5Y: <span className="text-foreground">${(projectedGDX['5y']).toFixed(0)}</span>
              {' · '}CAGR: <span className={gdxCagr5y >= 0 ? 'text-bullish' : 'text-bearish'}>
                {gdxCagr5y >= 0 ? '+' : ''}{gdxCagr5y.toFixed(1)}%
              </span>
            </p>
          )}
        </div>

        {/* Conclusion */}
        <div className="border-t border-border pt-4">
          <p className={`text-sm font-semibold ${conclusion.color}`}>{conclusion.text}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{conclusion.detail}</p>
        </div>
      </div>
    </div>
  );
}
