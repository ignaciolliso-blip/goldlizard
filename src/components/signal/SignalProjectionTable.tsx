import type { AnchorResult } from '@/lib/anchorEngine';
import type { LeverageResult } from '@/lib/leverageEngine';
import { projectGDXGoldRatio } from '@/lib/leverageEngine';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';
import { BANK_CONSENSUS } from '@/lib/scenarioEngine';
import { GuideTooltip } from '@/components/GuideMode';

interface Props {
  anchorResult: AnchorResult | null;
  leverageResult: LeverageResult | null;
  scenarioConfig: ScenarioConfig | null;
  currentGoldPrice: number;
  currentGDXPrice: number;
  currentGDI: number;
  probs: ScenarioProbabilities;
}

const HORIZONS = [
  { key: '3m', label: '3 Mo', years: 0.25 },
  { key: '6m', label: '6 Mo', years: 0.5 },
  { key: '1y', label: '1 Yr', years: 1 },
  { key: '3y', label: '3 Yr', years: 3 },
  { key: '5y', label: '5 Yr', years: 5 },
] as const;

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function pctFmt(n: number): string {
  return n.toFixed(1) + '%';
}

const M2_GROWTH = 0.06;

export default function SignalProjectionTable({ anchorResult, leverageResult, scenarioConfig, currentGoldPrice, currentGDXPrice, probs }: Props) {
  const currentM2 = anchorResult?.currentM2 ?? 0;
  const currentRatio = anchorResult?.m2GoldRatio ?? 5;

  // "Gold stays flat" row — gold price unchanged
  const flatRow = HORIZONS.map(() => currentGoldPrice);

  // "Tracks M2" row — gold grows at M2 rate
  const tracksM2Row = HORIZONS.map(h => currentGoldPrice * Math.pow(1 + M2_GROWTH, h.years));

  // "Reprices to 2011" row — ratio moves toward 3.5
  const reprice2011Row = HORIZONS.map(h => {
    const projectedRatio = currentRatio + (3.5 - currentRatio) * Math.min(1, h.years / 5);
    const projectedM2 = currentM2 * Math.pow(1 + M2_GROWTH, h.years);
    return projectedM2 / projectedRatio;
  });

  // GDI-Weighted EV
  const bull = scenarioConfig?.scenarios?.find(s => s.name === 'Bull');
  const base = scenarioConfig?.scenarios?.find(s => s.name === 'Base');
  const bear = scenarioConfig?.scenarios?.find(s => s.name === 'Bear');

  const evRow = HORIZONS.map(h => {
    if (!bull || !base || !bear) return currentGoldPrice;
    return probs.bull * bull.targets[h.key] + probs.base * base.targets[h.key] + probs.bear * bear.targets[h.key];
  });

  // Bank consensus (only 1y)
  const bankMin = Math.min(...BANK_CONSENSUS.filter(b => b.date.startsWith('2026')).map(b => b.price));
  const bankMax = Math.max(...BANK_CONSENSUS.filter(b => b.date.startsWith('2026')).map(b => b.price));

  // Gold CAGR
  const goldCagrRow = HORIZONS.map((h, i) => {
    if (h.years < 1) return null;
    return (Math.pow(evRow[i] / currentGoldPrice, 1 / h.years) - 1) * 100;
  });

  // GDX projections
  const gdxRatioRow = HORIZONS.map(h => {
    if (!leverageResult) return 0;
    return projectGDXGoldRatio(leverageResult.currentGDXGoldRatio, leverageResult.medianRatio, h.years);
  });

  const gdxProjRow = HORIZONS.map((h, i) => evRow[i] * gdxRatioRow[i]);

  const gdxCagrRow = HORIZONS.map((h, i) => {
    if (h.years < 1) return null;
    return (Math.pow(gdxProjRow[i] / currentGDXPrice, 1 / h.years) - 1) * 100;
  });

  const vsGoldCagrRow = HORIZONS.map((_, i) => {
    if (goldCagrRow[i] === null || gdxCagrRow[i] === null) return null;
    return gdxCagrRow[i]! - goldCagrRow[i]!;
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-[200px]" />
              {HORIZONS.map(h => (
                <th key={h.key} className="text-right px-4 py-3 text-xs text-muted-foreground font-medium font-mono">{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Gold section */}
            <Row label="If gold stays flat" values={flatRow.map(fmt)} colorClass="text-bearish" />
            <Row label="If tracks M2 (ratio ~5)" values={tracksM2Row.map(fmt)} colorClass="text-neutral" />
            <Row label="If reprices to 2011 (3.5)" values={reprice2011Row.map(fmt)} colorClass="text-bullish" />
            <Row label="GDI-Weighted EV" values={evRow.map(fmt)} colorClass="text-primary" bold />
            <tr className="border-b border-border">
              <td className="px-4 py-2 text-xs text-muted-foreground">Bank Consensus</td>
              {HORIZONS.map(h => (
                <td key={h.key} className="text-right px-4 py-2 font-mono text-xs text-foreground">
                  {h.key === '1y' && bankMin > 0 ? `${fmt(bankMin)}–${fmt(bankMax)}` : '—'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-2 text-xs text-muted-foreground">
                <GuideTooltip id="proj-gold-cagr" text="This is the compound annual growth rate — what your investment would earn per year if gold reaches the expected value. Bold values exceed gold's long-run average of 7.9%.">
                  Gold Impl. CAGR
                </GuideTooltip>
              </td>
              {goldCagrRow.map((v, i) => (
                <td key={i} className={`text-right px-4 py-2 font-mono text-xs ${v !== null && v > 7.9 ? 'text-primary font-bold' : 'text-foreground'}`}>
                  {v !== null ? pctFmt(v) : '—'}
                </td>
              ))}
            </tr>

            {/* Divider */}
            <tr>
              <td colSpan={6} className="px-4 py-1">
                <div className="border-t border-border" />
              </td>
            </tr>

            {/* Miner section */}
            <Row label="GDX/Gold Ratio" values={gdxRatioRow.map(v => v.toFixed(4))} colorClass="text-leverage-miner" />
            <Row label="GDX Projected" values={gdxProjRow.map(v => fmt(v))} colorClass="text-leverage-miner" />
            <tr className="border-b border-border">
              <td className="px-4 py-2 text-xs text-muted-foreground">GDX Impl. CAGR</td>
              {gdxCagrRow.map((v, i) => (
                <td key={i} className="text-right px-4 py-2 font-mono text-xs text-leverage-miner">
                  {v !== null ? pctFmt(v) : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                <GuideTooltip id="proj-vs-gold" text="This shows how much extra return miners are expected to deliver over holding gold directly. The premium comes from two sources: gold price appreciation plus miner re-rating toward historical valuation norms.">
                  vs. Gold CAGR
                </GuideTooltip>
              </td>
              {vsGoldCagrRow.map((v, i) => (
                <td key={i} className={`text-right px-4 py-2 font-mono text-xs font-semibold ${v !== null ? (v >= 0 ? 'text-bullish' : 'text-bearish') : 'text-muted-foreground'}`}>
                  {v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}pp` : '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground font-mono text-center">
          Current gold: {fmt(currentGoldPrice)} | Current GDX: ${currentGDXPrice.toFixed(2)}
          {leverageResult && ` | GDX/Gold: ${leverageResult.currentGDXGoldRatio.toFixed(4)}`}
          {anchorResult && ` | M2/Gold: ${anchorResult.m2GoldRatio.toFixed(1)}`}
          {bankMin > 0 && ` | Bank consensus YE2026: ${fmt(bankMin)}–${fmt(bankMax)}`}
        </p>
      </div>
    </div>
  );
}

function Row({ label, values, colorClass, bold }: { label: string; values: string[]; colorClass: string; bold?: boolean }) {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-2 text-xs text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`text-right px-4 py-2 font-mono text-xs ${colorClass} ${bold ? 'font-bold' : ''}`}>
          {v}
        </td>
      ))}
    </tr>
  );
}
