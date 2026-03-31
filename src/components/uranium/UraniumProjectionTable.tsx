import type { UraniumAnchorResult, UraniumForcesResult, UraniumLeverageResult } from '@/lib/uraniumEngine';
import { URANIUM_PROJECTIONS } from '@/lib/uraniumEngine';
import { ExternalLink } from 'lucide-react';

interface Props {
  anchorResult: UraniumAnchorResult | null;
  forcesResult: UraniumForcesResult | null;
  leverageResult: UraniumLeverageResult | null;
}

function fmt(n: number) { return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }

export default function UraniumProjectionTable({ anchorResult, forcesResult, leverageResult }: Props) {
  if (!anchorResult) return null;

  const spot = anchorResult.spotPrice;
  const lt = anchorResult.ltContractPrice;
  const proj = URANIUM_PROJECTIONS;

  const horizons = [
    { key: '1y', label: '1 Yr', years: 1 },
    { key: '3y', label: '3 Yr', years: 3 },
    { key: '5y', label: '5 Yr', years: 5 },
    { key: '10y', label: '10 Yr', years: 10 },
  ] as const;

  const greenfieldMidpoint = (proj.currentGreenfieldLow + proj.currentGreenfieldHigh) / 2;

  const currentPNAV = leverageResult?.sectorPNAV ?? 1.5;
  const urnmPrice = leverageResult?.currentURNMPrice ?? 60;
  const u3o8Price = leverageResult?.currentU3O8Price ?? 22;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URANIUM</th>
              <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Today</th>
              {horizons.map(h => (
                <th key={h.key} className="text-right p-4 text-xs font-semibold text-muted-foreground">{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Greenfield Cost */}
            <tr className="border-b border-border/50">
              <td className="p-4 text-muted-foreground">Greenfield Cost<br/><span className="text-xs">(rises w/ inflation)</span></td>
              <td className="p-4 text-right font-mono">${greenfieldMidpoint.toFixed(0)}</td>
              {horizons.map(h => {
                const val = greenfieldMidpoint * Math.pow(1 + proj.greenfieldInflation, h.years);
                return <td key={h.key} className="p-4 text-right font-mono">{fmt(Math.round(val))}</td>;
              })}
            </tr>
            {/* Goldman target */}
            <tr className="border-b border-border/50">
              <td className="p-4 text-muted-foreground">Goldman Sachs target</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              <td className="p-4 text-right font-mono">{fmt(proj.goldmanTarget1Y)}</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
            </tr>
            {/* Supply-Gap EV */}
            <tr className="border-b border-border/50 bg-uranium/5">
              <td className="p-4 font-semibold text-foreground">Supply-Gap EV</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              {horizons.map(h => (
                <td key={h.key} className="p-4 text-right font-mono font-semibold text-uranium">
                  {fmt(proj.supplyGapEV[h.key as keyof typeof proj.supplyGapEV])}
                </td>
              ))}
            </tr>
            {/* Implied CAGR */}
            <tr className="border-b border-border">
              <td className="p-4 font-semibold text-foreground">U Spot Impl. CAGR</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              {horizons.map(h => {
                const ev = proj.supplyGapEV[h.key as keyof typeof proj.supplyGapEV];
                const cagr = (Math.pow(ev / spot, 1 / h.years) - 1) * 100;
                return (
                  <td key={h.key} className={`p-4 text-right font-mono font-bold ${cagr > 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {cagr > 0 ? '+' : ''}{cagr.toFixed(1)}%
                  </td>
                );
              })}
            </tr>
          </tbody>
          {/* Miners section */}
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">MINERS (U3O8 ETF)</th>
              <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Today</th>
              {horizons.map(h => (
                <th key={h.key} className="text-right p-4 text-xs font-semibold text-muted-foreground">{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Sector P/NAV */}
            <tr className="border-b border-border/50">
              <td className="p-4 text-muted-foreground">Sector P/NAV (proj)</td>
              <td className="p-4 text-right font-mono">{currentPNAV.toFixed(1)}×</td>
              {horizons.map(h => (
                <td key={h.key} className="p-4 text-right font-mono">
                  {proj.pnavProjected[h.key as keyof typeof proj.pnavProjected].toFixed(1)}×
                </td>
              ))}
            </tr>
            {/* Miner ETF projected */}
            <tr className="border-b border-border/50">
              <td className="p-4 text-muted-foreground">Miner ETF Projected</td>
              <td className="p-4 text-right font-mono">${urnmPrice.toFixed(0)}</td>
              {horizons.map(h => {
                const ev = proj.supplyGapEV[h.key as keyof typeof proj.supplyGapEV];
                const projPNAV = proj.pnavProjected[h.key as keyof typeof proj.pnavProjected];
                // ETF_future = ETF_now × (U_future / U_now) × (P/NAV_future / P/NAV_now)
                const val = urnmPrice * (ev / spot) * (projPNAV / currentPNAV);
                return <td key={h.key} className="p-4 text-right font-mono text-leverage-miner">${val.toFixed(0)}</td>;
              })}
            </tr>
            {/* Miner implied CAGR */}
            <tr className="border-b border-border/50">
              <td className="p-4 font-semibold text-foreground">Miner Impl. CAGR</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              {horizons.map(h => {
                const ev = proj.supplyGapEV[h.key as keyof typeof proj.supplyGapEV];
                const projPNAV = proj.pnavProjected[h.key as keyof typeof proj.pnavProjected];
                const val = urnmPrice * (ev / spot) * (projPNAV / currentPNAV);
                const cagr = (Math.pow(val / urnmPrice, 1 / h.years) - 1) * 100;
                return (
                  <td key={h.key} className={`p-4 text-right font-mono font-bold ${cagr > 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {cagr > 0 ? '+' : ''}{cagr.toFixed(1)}%
                  </td>
                );
              })}
            </tr>
            {/* vs Uranium CAGR */}
            <tr>
              <td className="p-4 font-semibold text-foreground">vs. Uranium CAGR</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              {horizons.map(h => {
                const ev = proj.supplyGapEV[h.key as keyof typeof proj.supplyGapEV];
                const projPNAV = proj.pnavProjected[h.key as keyof typeof proj.pnavProjected];
                const minerVal = urnmPrice * (ev / spot) * (projPNAV / currentPNAV);
                const minerCagr = (Math.pow(minerVal / urnmPrice, 1 / h.years) - 1) * 100;
                const uCagr = (Math.pow(ev / spot, 1 / h.years) - 1) * 100;
                const diff = minerCagr - uCagr;
                return (
                  <td key={h.key} className={`p-4 text-right font-mono font-semibold ${diff >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(0)}pp
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 justify-center flex-wrap">
          <span>U Spot: {fmt(spot)}/lb | LT Contract: {fmt(lt)}/lb</span>
          <a
            href="https://www.cameco.com/invest/markets/uranium-price"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-uranium-contract hover:underline"
          >
            <ExternalLink size={10} /> Source
          </a>
          <span>| URNM: ${urnmPrice.toFixed(2)}</span>
          {u3o8Price > 0 && <span>| U3O8 ETF: ${u3o8Price.toFixed(2)}</span>}
          <span>| Sector P/NAV: {currentPNAV.toFixed(1)}×</span>
        </div>
        <p className="text-center mt-1 text-muted-foreground/60">
          P/NAV mean reversion: sector premium compresses toward historical avg (~1.2×) as production comes online.
        </p>
      </div>
    </div>
  );
}
