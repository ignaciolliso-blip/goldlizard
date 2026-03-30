import { useState } from 'react';
import type { GDIResult } from '@/lib/gdiEngine';
import type { AnchorResult } from '@/lib/anchorEngine';
import type { LeverageResult } from '@/lib/leverageEngine';
import type { Observation, CentralBankEntry, EtfFlowEntry, MinerPrice } from '@/lib/dataFetcher';
import { FRED_SERIES } from '@/lib/constants';

interface DebugTableProps {
  rawData: {
    fredResults: Record<string, Observation[]>;
    goldSpot: Observation[];
    physicalDemand: CentralBankEntry[];
    etfFlows: EtfFlowEntry[];
    minerPrices: MinerPrice[];
    errors: string[];
  } | null;
  gdiResult: GDIResult | null;
  anchorResult: AnchorResult | null;
  leverageResult: LeverageResult | null;
  currentGDI: number;
}

const DebugTable = ({ rawData, gdiResult, anchorResult, leverageResult, currentGDI }: DebugTableProps) => {
  const [open, setOpen] = useState(false);

  if (!rawData) return null;

  const fredStatus = FRED_SERIES.map(s => ({
    id: s.id,
    name: s.name,
    count: rawData.fredResults[s.id]?.length ?? 0,
    error: rawData.errors.includes(s.id),
    latest: rawData.fredResults[s.id]?.length
      ? rawData.fredResults[s.id][rawData.fredResults[s.id].length - 1]
      : null,
  }));

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
      >
        <span className="text-xs font-mono text-muted-foreground">
          🔧 Pipeline Debug — {fredStatus.filter(f => !f.error).length}/{FRED_SERIES.length} FRED series loaded
          {rawData.minerPrices.length > 0 && ` · ${rawData.minerPrices.length} GDX prices`}
          {anchorResult && ` · Anchor ✓`}
          {leverageResult && ` · Leverage ✓`}
        </span>
        <span className="text-xs text-muted-foreground">{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* FRED Series Status */}
          <div>
            <h3 className="text-xs font-mono text-gold mb-2">FRED Series</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-1 pr-4">Series</th>
                    <th className="text-left py-1 pr-4">Name</th>
                    <th className="text-right py-1 pr-4">Observations</th>
                    <th className="text-right py-1 pr-4">Latest Date</th>
                    <th className="text-right py-1 pr-4">Latest Value</th>
                    <th className="text-center py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fredStatus.map(f => (
                    <tr key={f.id} className="border-b border-border/50">
                      <td className="py-1 pr-4 text-foreground">{f.id}</td>
                      <td className="py-1 pr-4 text-muted-foreground">{f.name}</td>
                      <td className="py-1 pr-4 text-right">{f.count}</td>
                      <td className="py-1 pr-4 text-right">{f.latest?.date || '—'}</td>
                      <td className="py-1 pr-4 text-right">{f.latest?.value?.toFixed(2) || '—'}</td>
                      <td className="py-1 text-center">
                        {f.error ? <span className="text-bearish">✗</span> : <span className="text-bullish">✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Data Sources */}
          <div>
            <h3 className="text-xs font-mono text-gold mb-2">Additional Data</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded border border-border p-2">
                <div className="text-muted-foreground text-[10px]">Gold Spot</div>
                <div className="text-foreground font-mono">{rawData.goldSpot.length} obs</div>
                {rawData.goldSpot.length > 0 && (
                  <div className="text-gold text-[10px]">
                    ${rawData.goldSpot[rawData.goldSpot.length - 1].value.toFixed(0)}
                  </div>
                )}
              </div>
              <div className="rounded border border-border p-2">
                <div className="text-muted-foreground text-[10px]">Physical Demand</div>
                <div className="text-foreground font-mono">{rawData.physicalDemand.length} quarters</div>
              </div>
              <div className="rounded border border-border p-2">
                <div className="text-muted-foreground text-[10px]">ETF Flows</div>
                <div className="text-foreground font-mono">{rawData.etfFlows.length} months</div>
              </div>
              <div className="rounded border border-border p-2">
                <div className="text-muted-foreground text-[10px]">GDX Prices</div>
                <div className="text-foreground font-mono">{rawData.minerPrices.length} entries</div>
                {rawData.minerPrices.length > 0 && (
                  <div className="text-leverage-miner text-[10px]">
                    ${rawData.minerPrices[rawData.minerPrices.length - 1].close_price}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GDI */}
          <div>
            <h3 className="text-xs font-mono text-gold mb-2">GDI Composite</h3>
            <div className="font-mono text-lg">
              <span className={currentGDI > 0.5 ? 'text-bullish' : currentGDI < -0.5 ? 'text-bearish' : 'text-neutral'}>
                {currentGDI.toFixed(4)}
              </span>
            </div>
            {gdiResult && (
              <div className="text-xs text-muted-foreground mt-1">
                T1: {gdiResult.tierContributions.structural.toFixed(3)} ·
                T2: {gdiResult.tierContributions.demand.toFixed(3)} ·
                T3: {gdiResult.tierContributions.conditions.toFixed(3)}
              </div>
            )}
          </div>

          {/* Anchor Metrics */}
          {anchorResult && (
            <div>
              <h3 className="text-xs font-mono text-gold mb-2">Lens 1: The Anchor — Investable Parity</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="rounded border border-border p-2">
                  <div className="text-muted-foreground text-[10px]">% of Inv. Parity</div>
                  <div className="text-primary">{anchorResult.pctOfInvestableParity.toFixed(0)}%</div>
                </div>
                <div className="rounded border border-border p-2">
                  <div className="text-muted-foreground text-[10px]">Zone</div>
                  <div className="text-foreground">{anchorResult.zoneLabel}</div>
                </div>
                <div className="rounded border border-border p-2">
                  <div className="text-muted-foreground text-[10px]">Gold</div>
                  <div className="text-foreground">${anchorResult.currentGoldPrice.toFixed(0)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Leverage Metrics */}
          {leverageResult && (
            <div>
              <h3 className="text-xs font-mono text-gold mb-2">Lens 3: The Leverage — GDX/Gold Ratio</h3>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="rounded border border-border p-2">
                  <div className="text-muted-foreground text-[10px]">GDX/Gold Ratio</div>
                  <div className="text-leverage-miner">{(leverageResult.currentGDXGoldRatio * 100).toFixed(3)}%</div>
                </div>
                <div className="rounded border border-border p-2">
                  <div className="text-muted-foreground text-[10px]">Median (10yr)</div>
                  <div className="text-foreground">{(leverageResult.medianRatio * 100).toFixed(3)}%</div>
                </div>
                <div className="rounded border border-border p-2">
                  <div className="text-muted-foreground text-[10px]">Percentile</div>
                  <div className="text-foreground">{leverageResult.currentPercentile.toFixed(0)}th</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugTable;
