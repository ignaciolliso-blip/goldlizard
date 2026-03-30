import type { AnchorResult } from '@/lib/anchorEngine';
import { projectParity, M2_GROWTH, NET_PARITY_GROWTH } from '@/lib/anchorEngine';
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
  { key: '1y', label: '1Y', years: 1 },
  { key: '3y', label: '3Y', years: 3 },
  { key: '5y', label: '5Y', years: 5 },
] as const;

const SHORT_HORIZONS = [
  { key: '3m', label: '3M', years: 0.25 },
  { key: '6m', label: '6M', years: 0.5 },
  { key: '1y', label: '1Y', years: 1 },
  { key: '3y', label: '3Y', years: 3 },
  { key: '5y', label: '5Y', years: 5 },
] as const;

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function pctFmt(n: number): string {
  return n.toFixed(1) + '%';
}

export default function SignalProjectionTable({ anchorResult, leverageResult, scenarioConfig, currentGoldPrice, currentGDXPrice, probs }: Props) {
  const totalParity = anchorResult?.totalParity ?? 0;
  const investableParity = anchorResult?.investableParity ?? 0;

  const totalParityRow = HORIZONS.map(h => projectParity(totalParity, h.years));
  const invParityRow = HORIZONS.map(h => projectParity(investableParity, h.years));

  const bull = scenarioConfig?.scenarios?.find(s => s.name === 'Bull');
  const base = scenarioConfig?.scenarios?.find(s => s.name === 'Base');
  const bear = scenarioConfig?.scenarios?.find(s => s.name === 'Bear');

  const evRowFull = SHORT_HORIZONS.map(h => {
    if (!bull || !base || !bear) return currentGoldPrice;
    return probs.bull * bull.targets[h.key] + probs.base * base.targets[h.key] + probs.bear * bear.targets[h.key];
  });

  const bankMin = Math.min(...BANK_CONSENSUS.filter(b => b.date.startsWith('2026')).map(b => b.price));
  const bankMax = Math.max(...BANK_CONSENSUS.filter(b => b.date.startsWith('2026')).map(b => b.price));

  const goldCagrRow = HORIZONS.map((h) => {
    const evIdx = SHORT_HORIZONS.findIndex(sh => sh.key === h.key);
    const ev = evRowFull[evIdx];
    return (Math.pow(ev / currentGoldPrice, 1 / h.years) - 1) * 100;
  });

  const gdxRatioRow = SHORT_HORIZONS.map(h => {
    if (!leverageResult) return 0;
    return projectGDXGoldRatio(leverageResult.currentGDXGoldRatio, leverageResult.medianRatio, h.years);
  });

  const gdxProjRow = SHORT_HORIZONS.map((h, i) => evRowFull[i] * gdxRatioRow[i]);

  const gdxCagrRow = SHORT_HORIZONS.map((h, i) => {
    if (h.years < 1) return null;
    return (Math.pow(gdxProjRow[i] / currentGDXPrice, 1 / h.years) - 1) * 100;
  });

  const vsGoldCagrRow = SHORT_HORIZONS.map((h, i) => {
    if (h.years < 1) return null;
    const goldIdx = HORIZONS.findIndex(hh => hh.key === h.key);
    if (goldIdx === -1 || gdxCagrRow[i] === null) return null;
    return gdxCagrRow[i]! - goldCagrRow[goldIdx];
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium w-[200px]" />
              {HORIZONS.map(h => (
                <th key={h.key} className="text-right px-4 py-3 text-sm text-muted-foreground font-medium font-mono">{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-sm text-muted-foreground">
                <GuideTooltip id="proj-total-parity" text="Total parity = M2 money supply ÷ all gold ever mined. The absolute floor — if every ounce of gold (including jewellery) backed the money supply equally.">
                  Total Parity (M2 ÷ all oz)
                </GuideTooltip>
              </td>
              {totalParityRow.map((v, i) => (
                <td key={i} className="text-right px-4 py-3 font-mono text-sm text-bullish whitespace-nowrap">{fmt(v)}</td>
              ))}
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-sm text-muted-foreground">
                <GuideTooltip id="proj-inv-parity" text="Investable parity = M2 ÷ gold available for investment (bars, coins, ETFs + central bank reserves). The structural ceiling.">
                  Investable Parity (M2 ÷ inv. oz)
                </GuideTooltip>
              </td>
              {invParityRow.map((v, i) => (
                <td key={i} className="text-right px-4 py-3 font-mono text-sm text-blue-400 whitespace-nowrap">{fmt(v)}</td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* GDI + Miner section */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium w-[200px]" />
              {SHORT_HORIZONS.map(h => (
                <th key={h.key} className="text-right px-4 py-3 text-sm text-muted-foreground font-medium font-mono">{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="GDI-Weighted EV" values={evRowFull.map(fmt)} colorClass="text-primary" bold />
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-sm text-muted-foreground">Bank Consensus</td>
              {SHORT_HORIZONS.map(h => (
                <td key={h.key} className="text-right px-4 py-3 font-mono text-sm text-foreground whitespace-nowrap">
                  {h.key === '1y' && bankMin > 0 ? `${fmt(bankMin)}–${fmt(bankMax)}` : '—'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-sm text-muted-foreground">
                <GuideTooltip id="proj-gold-cagr" text="Compound annual growth rate — what your investment would earn per year. Bold values exceed gold's long-run average of 7.9%.">
                  Gold Impl. CAGR
                </GuideTooltip>
              </td>
              {SHORT_HORIZONS.map((h, i) => {
                if (h.years < 1) return <td key={h.key} className="text-right px-4 py-3 font-mono text-sm text-muted-foreground">—</td>;
                const goldIdx = HORIZONS.findIndex(hh => hh.key === h.key);
                const v = goldIdx >= 0 ? goldCagrRow[goldIdx] : null;
                return (
                  <td key={h.key} className={`text-right px-4 py-3 font-mono text-sm whitespace-nowrap ${v !== null && v > 7.9 ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {v !== null ? pctFmt(v) : '—'}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td colSpan={6} className="px-4 py-1">
                <div className="border-t border-border" />
              </td>
            </tr>

            <Row label="GDX/Gold Ratio" values={gdxRatioRow.map(v => v.toFixed(4))} colorClass="text-leverage-miner" />
            <Row label="GDX Projected" values={gdxProjRow.map(v => fmt(v))} colorClass="text-leverage-miner" />
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-sm text-muted-foreground">GDX Impl. CAGR</td>
              {gdxCagrRow.map((v, i) => (
                <td key={i} className="text-right px-4 py-3 font-mono text-sm text-leverage-miner whitespace-nowrap">
                  {v !== null ? pctFmt(v) : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                <GuideTooltip id="proj-vs-gold" text="How much extra return miners deliver over gold. The premium comes from gold appreciation plus miner re-rating toward historical norms.">
                  vs. Gold CAGR
                </GuideTooltip>
              </td>
              {vsGoldCagrRow.map((v, i) => (
                <td key={i} className={`text-right px-4 py-3 font-mono text-sm font-semibold whitespace-nowrap ${v !== null ? (v >= 0 ? 'text-bullish' : 'text-bearish') : 'text-muted-foreground'}`}>
                  {v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}pp` : '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground font-mono text-center">
          Gold: {fmt(currentGoldPrice)} | GDX: ${currentGDXPrice.toFixed(2)}
          {leverageResult && ` | GDX/Gold: ${leverageResult.currentGDXGoldRatio.toFixed(4)}`}
          {anchorResult && ` | ${anchorResult.pctOfInvestableParity.toFixed(0)}% of inv. parity`}
          {bankMin > 0 && ` | Bank YE2026: ${fmt(bankMin)}–${fmt(bankMax)}`}
        </p>
        <p className="text-xs text-muted-foreground/60 text-center mt-1">
          Total gold: 216,265t (WGC). Investable: 86,389t. M2 from FRED WM2NS. Parities grow ~4.5%/yr.
        </p>
      </div>
    </div>
  );
}

function Row({ label, values, colorClass, bold }: { label: string; values: string[]; colorClass: string; bold?: boolean }) {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3 text-sm text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`text-right px-4 py-3 font-mono text-sm whitespace-nowrap ${colorClass} ${bold ? 'font-bold' : ''}`}>
          {v}
        </td>
      ))}
    </tr>
  );
}
