import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectionRow } from '@/lib/constants';
import { VARIABLE_CONFIG } from '@/lib/constants';
import type { GDIResult } from '@/lib/gdiEngine';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';
import { computeScenarioProbabilities } from '@/lib/scenarioEngine';

interface Props {
  projections: ProjectionRow[];
  onProjectionsChange: (p: ProjectionRow[]) => void;
  forwardGDI: Record<string, number>;
  horizonProbs: Record<string, ScenarioProbabilities>;
  gdiResult: GDIResult;
  scenarioConfig: ScenarioConfig | null;
  currentGDI: number;
  currentGoldPrice: number;
  onScenarioUpdate: (config: ScenarioConfig) => void;
}

const HORIZONS = ['3m', '6m', '1y', '3y', '5y'] as const;
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function ProjectionAssumptionsTab({
  projections, onProjectionsChange, forwardGDI, horizonProbs,
  gdiResult, scenarioConfig, currentGDI, currentGoldPrice, onScenarioUpdate,
}: Props) {
  const [editedScenarios, setEditedScenarios] = useState<ScenarioConfig | null>(scenarioConfig);
  const [saving, setSaving] = useState(false);

  const handleValueChange = (varIdx: number, horizon: typeof HORIZONS[number], value: string) => {
    const updated = [...projections];
    updated[varIdx] = { ...updated[varIdx], [horizon]: parseFloat(value) || 0 };
    onProjectionsChange(updated);
  };

  const handleScenarioTargetChange = (scenarioIdx: number, horizon: string, value: string) => {
    if (!editedScenarios) return;
    const updated = { ...editedScenarios, scenarios: [...editedScenarios.scenarios] };
    updated.scenarios[scenarioIdx] = {
      ...updated.scenarios[scenarioIdx],
      targets: { ...updated.scenarios[scenarioIdx].targets, [horizon]: parseFloat(value) || 0 },
    };
    setEditedScenarios(updated);
    onScenarioUpdate(updated);
  };

  const saveScenarios = async () => {
    if (!editedScenarios) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('scenario_targets')
        .update({ config_json: editedScenarios as any, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
      toast.success('Scenario targets saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main projection table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Variable Projections</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">All projection cells are editable. Changes recalculate forward GDI, probabilities, and fair values.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium min-w-[160px]">Variable</th>
                <th className="text-right px-3 py-2 font-medium w-20">Current</th>
                {HORIZONS.map(h => (
                  <th key={h} className="text-right px-2 py-2 font-medium w-20">{h}</th>
                ))}
                <th className="text-left px-3 py-2 font-medium min-w-[200px]">Method</th>
                <th className="text-center px-2 py-2 font-medium w-24">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((proj, idx) => {
                const config = VARIABLE_CONFIG.find(v => v.id === proj.variableId);
                return (
                  <tr key={proj.variableId} className="border-b border-border/30 hover:bg-secondary/10">
                    <td className="px-3 py-2 font-medium text-foreground text-xs">{config?.name || proj.variableId}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">
                      {typeof proj.current === 'number' ? proj.current.toFixed(proj.current > 100 ? 0 : 1) : '—'}
                    </td>
                    {HORIZONS.map(h => (
                      <td key={h} className="px-1 py-1.5">
                        <input
                          type="number"
                          step="0.1"
                          value={proj[h]}
                          onChange={e => handleValueChange(idx, h, e.target.value)}
                          className="w-[72px] bg-secondary/30 border border-border/50 rounded px-2 py-1 text-xs font-mono text-foreground text-right focus:border-primary/50 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[220px] truncate" title={proj.method}>
                      {proj.method}
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-primary" title={`${proj.confidence}/5`}>
                      {stars(proj.confidence)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forward GDI summary */}
      {Object.keys(forwardGDI).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Projected GDI & Probabilities</h4>
          <div className="grid grid-cols-5 gap-3 text-center">
            {HORIZONS.map(h => {
              const gdi = forwardGDI[h] ?? 0;
              const hp = horizonProbs[h];
              const gdiColor = gdi > 0.5 ? 'text-bullish' : gdi < -0.5 ? 'text-destructive' : 'text-primary';
              return (
                <div key={h} className="bg-secondary/20 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">{h}</p>
                  <p className={`font-mono text-lg font-bold ${gdiColor}`}>
                    {gdi > 0 ? '+' : ''}{gdi.toFixed(2)}
                  </p>
                  {hp && (
                    <div className="text-[9px] font-mono mt-1 space-x-1">
                      <span className="text-bullish">{(hp.bull * 100).toFixed(0)}%</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-primary">{(hp.base * 100).toFixed(0)}%</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-destructive">{(hp.bear * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scenario targets */}
      {editedScenarios?.scenarios && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Scenario Price Targets</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Bull / Base / Bear gold price targets at each horizon</p>
            </div>
            <button
              onClick={saveScenarios}
              disabled={saving}
              className="px-3 py-1.5 bg-primary/20 text-primary rounded text-xs font-medium hover:bg-primary/30 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Targets'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-3 py-2 font-medium">Scenario</th>
                  {HORIZONS.map(h => (
                    <th key={h} className="text-right px-2 py-2 font-medium">{h}</th>
                  ))}
                  <th className="text-right px-3 py-2 font-medium">Probability</th>
                </tr>
              </thead>
              <tbody>
                {editedScenarios.scenarios.map((s, si) => {
                  const scenarioProbs = computeScenarioProbabilities(currentGDI);
                  const probKey = s.name.toLowerCase() as 'bull' | 'base' | 'bear';
                  const prob = scenarioProbs[probKey] || 0;
                  const color = s.name === 'Bull' ? 'text-bullish' : s.name === 'Bear' ? 'text-destructive' : 'text-primary';
                  return (
                    <tr key={s.name} className="border-b border-border/30 hover:bg-secondary/10">
                      <td className={`px-3 py-2 font-medium ${color}`}>{s.name}</td>
                      {HORIZONS.map(h => (
                        <td key={h} className="px-1 py-1.5">
                          <input
                            type="number"
                            step="50"
                            value={s.targets[h as keyof typeof s.targets]}
                            onChange={e => handleScenarioTargetChange(si, h, e.target.value)}
                            className="w-[72px] bg-secondary/30 border border-border/50 rounded px-2 py-1 text-xs font-mono text-foreground text-right focus:border-primary/50 focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {(prob * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demand saturation gauge */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Demand Saturation Gauge</h4>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">CB Reserve Accumulation</span>
              <span className="text-foreground font-mono">~20% → 25% target</span>
            </div>
            <div className="w-full h-3 bg-secondary/30 rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: '80%' }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">~80% toward 25% reserve target</p>
          </div>
          <p className="text-[10px] text-muted-foreground/80 italic">
            Estimated runway: 3-5 years of elevated demand before normalisation
          </p>
        </div>
      </div>
    </div>
  );
}
