import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ProjectionRow } from '@/lib/constants';
import { VARIABLE_CONFIG } from '@/lib/constants';
import type { ScenarioProbabilities } from '@/lib/scenarioEngine';
import { computeScenarioProbabilities } from '@/lib/scenarioEngine';

interface ProjectionAssumptionsProps {
  projections: ProjectionRow[];
  onProjectionsChange: (projections: ProjectionRow[]) => void;
  forwardGDI: Record<string, number>;
  horizonProbs: Record<string, ScenarioProbabilities>;
}

const HORIZONS = ['3m', '6m', '1y', '3y', '5y'] as const;

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

const ProjectionAssumptions = ({ projections, onProjectionsChange, forwardGDI, horizonProbs }: ProjectionAssumptionsProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleValueChange = (varIdx: number, horizon: typeof HORIZONS[number], value: string) => {
    const updated = [...projections];
    updated[varIdx] = { ...updated[varIdx], [horizon]: parseFloat(value) || 0 };
    onProjectionsChange(updated);
  };

  return (
    <div className="rounded-lg border border-card-border overflow-hidden bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/10 transition-colors ${expanded ? 'border-b border-card-border bg-gold/5' : ''}`}
      >
        <h3 className="text-sm font-semibold text-foreground">Projection Assumptions</h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-3 sm:p-4 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="text-left px-2 py-1.5 font-medium min-w-[120px]">Variable</th>
                  <th className="text-right px-2 py-1.5 font-medium">Current</th>
                  {HORIZONS.map(h => (
                    <th key={h} className="text-right px-2 py-1.5 font-medium">{h}</th>
                  ))}
                  <th className="text-left px-2 py-1.5 font-medium min-w-[160px]">Method</th>
                  <th className="text-center px-2 py-1.5 font-medium">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((proj, idx) => {
                  const config = VARIABLE_CONFIG.find(v => v.id === proj.variableId);
                  return (
                    <tr key={proj.variableId} className="border-b border-card-border/30 hover:bg-secondary/10">
                      <td className="px-2 py-1.5 font-medium text-foreground text-[10px]">{config?.name || proj.variableId}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-foreground">
                        {typeof proj.current === 'number' ? proj.current.toFixed(1) : '—'}
                      </td>
                      {HORIZONS.map(h => (
                        <td key={h} className="px-1 py-1">
                          <input
                            type="number"
                            step="0.1"
                            value={proj[h]}
                            onChange={e => handleValueChange(idx, h, e.target.value)}
                            className="w-14 sm:w-16 bg-secondary/30 border border-card-border/50 rounded px-1 py-0.5 text-[10px] sm:text-xs font-mono text-foreground text-right focus:border-gold/50 focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-[9px] text-muted-foreground max-w-[180px] truncate" title={proj.method}>
                        {proj.method}
                      </td>
                      <td className="px-2 py-1.5 text-center text-[10px] text-gold" title={`${proj.confidence}/5 confidence`}>
                        {stars(proj.confidence)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Forward GDI summary */}
          {Object.keys(forwardGDI).length > 0 && (
            <div className="rounded border border-card-border/50 p-3 bg-secondary/5">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Projected GDI & Probabilities</h4>
              <div className="grid grid-cols-5 gap-2 text-center">
                {HORIZONS.map(h => {
                  const gdi = forwardGDI[h] ?? 0;
                  const hp = horizonProbs[h];
                  const gdiColor = gdi > 0.5 ? 'text-bullish' : gdi < -0.5 ? 'text-bearish' : 'text-gold';
                  return (
                    <div key={h}>
                      <p className="text-[9px] text-muted-foreground uppercase">{h}</p>
                      <p className={`font-mono text-sm font-bold ${gdiColor}`}>
                        {gdi > 0 ? '+' : ''}{gdi.toFixed(2)}
                      </p>
                      {hp && (
                        <div className="text-[8px] font-mono mt-0.5">
                          <span className="text-bullish">{(hp.bull * 100).toFixed(0)}%</span>
                          <span className="text-muted-foreground mx-0.5">/</span>
                          <span className="text-gold">{(hp.base * 100).toFixed(0)}%</span>
                          <span className="text-muted-foreground mx-0.5">/</span>
                          <span className="text-bearish">{(hp.bear * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[9px] text-muted-foreground/60 italic">
            All projection cells are editable. Changes flow through to recalculated forward GDI, probabilities, and gold price projections.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectionAssumptions;
