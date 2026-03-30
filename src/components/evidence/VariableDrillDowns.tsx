import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { GDIResult, VariableDetail } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import type { AnchorResult } from '@/lib/anchorEngine';
import type { LeverageResult } from '@/lib/leverageEngine';
import { VARIABLE_CONFIG } from '@/lib/constants';
import { VARIABLE_METADATA } from '@/lib/variableMetadata';
import DrillDownPanel from '@/components/DrillDownPanel';

interface Props {
  gdiResult: GDIResult;
  goldSpot: Observation[];
  anchorResult: AnchorResult | null;
  leverageResult: LeverageResult | null;
  initialVarId?: string;
}

// All variable categories for the Evidence page
const VARIABLE_CATEGORIES = [
  {
    label: 'ANCHOR METRICS',
    description: 'Standalone valuation lenses — not part of GDI',
    variables: [
      { id: 'GOLD_CPI_RATIO', name: 'Gold / CPI Ratio', isGDI: false },
      { id: 'GOLD_M2_RATIO', name: 'Gold / M2 Ratio', isGDI: false },
    ],
  },
  {
    label: 'STRUCTURAL DEBASEMENT',
    description: 'Tier 1 — 30% of GDI weight',
    variables: VARIABLE_CONFIG.filter(v => v.tier === 'structural').map(v => ({ id: v.id, name: v.name, isGDI: true })),
  },
  {
    label: 'DEMAND FLOWS',
    description: 'Tier 2 — 35% of GDI weight',
    variables: VARIABLE_CONFIG.filter(v => v.tier === 'demand').map(v => ({ id: v.id, name: v.name, isGDI: true })),
  },
  {
    label: 'MARKET CONDITIONS',
    description: 'Tier 3 — 35% of GDI weight',
    variables: VARIABLE_CONFIG.filter(v => v.tier === 'conditions').map(v => ({ id: v.id, name: v.name, isGDI: true })),
  },
  {
    label: 'LEVERAGE',
    description: 'Miner relative value',
    variables: [
      { id: 'GDX_GOLD_RATIO', name: 'GDX / Gold Ratio', isGDI: false },
    ],
  },
];

function getHeatmapColor(adjZ: number): string {
  if (adjZ > 0.5) return 'text-bullish';
  if (adjZ < -0.5) return 'text-destructive';
  return 'text-muted-foreground';
}

export default function VariableDrillDowns({ gdiResult, goldSpot, anchorResult, leverageResult, initialVarId }: Props) {
  const [expandedVar, setExpandedVar] = useState<string | null>(initialVarId || null);
  const [timeRange, setTimeRange] = useState('10Y');

  useEffect(() => {
    if (initialVarId) setExpandedVar(initialVarId);
  }, [initialVarId]);

  const getVariableDetail = (varId: string): VariableDetail | null => {
    // GDI variables
    const detail = gdiResult.variableDetails.find(v => v.id === varId);
    if (detail) return detail;

    // Anchor ratios
    if (varId === 'GOLD_CPI_RATIO' && anchorResult) {
      return {
        id: 'GOLD_CPI_RATIO', name: 'Gold / CPI Ratio', tier: 'structural',
        currentValue: 0, zScore: 0, adjustedZScore: 0, weight: 0, contribution: 0,
      };
    }
    if (varId === 'GOLD_M2_RATIO' && anchorResult) {
      return {
        id: 'GOLD_M2_RATIO', name: 'M2 / Gold Ratio', tier: 'structural',
        currentValue: anchorResult.m2GoldRatio, zScore: 0, adjustedZScore: 0, weight: 0, contribution: 0,
      };
    }
    if (varId === 'GDX_GOLD_RATIO' && leverageResult) {
      return {
        id: 'GDX_GOLD_RATIO', name: 'GDX / Gold Ratio', tier: 'conditions',
        currentValue: leverageResult.currentGDXGoldRatio, zScore: 0, adjustedZScore: 0, weight: 0, contribution: 0,
      };
    }
    return null;
  };

  // For anchor/leverage we need to provide synthetic aligned data
  const getAugmentedGdiResult = (varId: string): GDIResult => {
    if (varId === 'GOLD_CPI_RATIO' && anchorResult) {
      const alignedData = new Map(gdiResult.alignedData);
      const seriesMap = new Map<string, number>();
      anchorResult.ratioSeries.forEach(o => seriesMap.set(o.date, o.value));
      alignedData.set('GOLD_CPI_RATIO', seriesMap);
      return { ...gdiResult, alignedData };
    }
    if (varId === 'GOLD_M2_RATIO' && anchorResult) {
      const alignedData = new Map(gdiResult.alignedData);
      const seriesMap = new Map<string, number>();
      anchorResult.ratioSeries.forEach(o => seriesMap.set(o.date, o.value));
      alignedData.set('GOLD_M2_RATIO', seriesMap);
      return { ...gdiResult, alignedData };
    }
    if (varId === 'GDX_GOLD_RATIO' && leverageResult) {
      const alignedData = new Map(gdiResult.alignedData);
      const seriesMap = new Map<string, number>();
      leverageResult.ratioSeries.forEach(o => seriesMap.set(o.date, o.value));
      alignedData.set('GDX_GOLD_RATIO', seriesMap);
      return { ...gdiResult, alignedData };
    }
    return gdiResult;
  };

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Time range:</span>
        {['1Y', '3Y', '5Y', '10Y', 'Max'].map(r => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              timeRange === r ? 'bg-primary/20 text-primary' : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {VARIABLE_CATEGORIES.map(cat => (
        <div key={cat.label} className="space-y-1">
          <div className="flex items-baseline gap-3 mb-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground tracking-widest">{cat.label}</h3>
            <span className="text-[9px] text-muted-foreground/60">{cat.description}</span>
          </div>

          {cat.variables.map(v => {
            const detail = getVariableDetail(v.id);
            const isExpanded = expandedVar === v.id;
            const meta = VARIABLE_METADATA[v.id];

            return (
              <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-card">
                <button
                  onClick={() => setExpandedVar(isExpanded ? null : v.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/10 transition-colors ${isExpanded ? 'border-b border-border bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{v.name}</span>
                    {detail && v.isGDI && (
                      <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
                        <span className="text-muted-foreground">
                          {detail.currentValue.toFixed(detail.currentValue > 100 ? 0 : 2)}
                        </span>
                        <span className={getHeatmapColor(detail.adjustedZScore)}>
                          z: {detail.adjustedZScore > 0 ? '+' : ''}{detail.adjustedZScore.toFixed(2)}
                          {detail.adjustedZScore > 0 ? ' ↑' : detail.adjustedZScore < 0 ? ' ↓' : ''}
                        </span>
                        <span className={`${detail.contribution > 0 ? 'text-bullish' : detail.contribution < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          c: {detail.contribution > 0 ? '+' : ''}{detail.contribution.toFixed(3)}
                        </span>
                      </div>
                    )}
                    {detail && !v.isGDI && (
                      <span className="hidden sm:inline text-xs font-mono text-muted-foreground">
                        {detail.currentValue.toFixed(4)}
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>

                {isExpanded && detail && (
                  <DrillDownPanel
                    variable={detail}
                    gdiResult={getAugmentedGdiResult(v.id)}
                    goldSpot={goldSpot}
                    timeRange={timeRange}
                    onClose={() => setExpandedVar(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
