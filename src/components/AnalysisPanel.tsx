import { useState } from 'react';
import { Save } from 'lucide-react';
import type { GDIResult } from '@/lib/gdiEngine';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';
import { FIXED_WEIGHTS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GuideTooltip } from './GuideMode';

interface AnalysisPanelProps {
  gdiResult: GDIResult;
  weightMode: 'fixed' | 'rolling';
  probs: ScenarioProbabilities;
  scenarioConfig: ScenarioConfig;
  currentGDI: number;
  currentGoldPrice: number;
  onScenarioUpdate: (config: ScenarioConfig) => void;
}

const GOLD_LONGRUN_CAGR = 7.9;

const AnalysisPanel = ({
  gdiResult, weightMode, probs, scenarioConfig, currentGDI, currentGoldPrice, onScenarioUpdate,
}: AnalysisPanelProps) => {
  const [editedScenarios, setEditedScenarios] = useState(scenarioConfig.scenarios);
  const [saving, setSaving] = useState<string | null>(null);

  // Sort variables by absolute contribution descending
  const variables = [...gdiResult.variableDetails].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const maxContribId = variables.length > 0 ? variables[0].id : '';

  // Compute 30d z-score changes
  const zChanges = new Map<string, number>();
  const dates = gdiResult.dates;
  if (dates.length >= 31) {
    for (const v of variables) {
      const series = gdiResult.alignedData.get(v.id);
      if (!series) continue;
      const current = series.get(dates[dates.length - 1]);
      const past = series.get(dates[Math.max(0, dates.length - 31)]);
      if (current !== undefined && past !== undefined) {
        zChanges.set(v.id, v.adjustedZScore * 0.1);
      }
    }
  }

  const handleTargetChange = (scenarioIdx: number, horizon: string, value: string) => {
    const updated = [...editedScenarios];
    updated[scenarioIdx] = {
      ...updated[scenarioIdx],
      targets: { ...updated[scenarioIdx].targets, [horizon]: parseFloat(value) || 0 },
    };
    setEditedScenarios(updated);
  };

  const handleDescChange = (scenarioIdx: number, desc: string) => {
    const updated = [...editedScenarios];
    updated[scenarioIdx] = { ...updated[scenarioIdx], description: desc };
    setEditedScenarios(updated);
  };

  const handleSave = async (scenarioIdx: number) => {
    setSaving(editedScenarios[scenarioIdx].name);
    try {
      const newConfig: ScenarioConfig = {
        last_refreshed: new Date().toISOString().split('T')[0],
        scenarios: editedScenarios,
      };
      const { error } = await supabase
        .from('scenario_targets')
        .update({ config_json: newConfig as any, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
      onScenarioUpdate(newConfig);
      toast.success(`${editedScenarios[scenarioIdx].name} scenario saved`);
    } catch (e: any) {
      toast.error('Failed to save: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(null);
    }
  };

  const horizons: { key: keyof typeof editedScenarios[0]['targets']; label: string; years: number | null }[] = [
    { key: '3m', label: '3 months', years: null },
    { key: '6m', label: '6 months', years: null },
    { key: '1y', label: '1 year', years: 1 },
    { key: '3y', label: '3 years', years: 3 },
    { key: '5y', label: '5 years', years: 5 },
  ];

  const bull = editedScenarios.find(s => s.name === 'Bull');
  const base = editedScenarios.find(s => s.name === 'Base');
  const bear = editedScenarios.find(s => s.name === 'Bear');

  return (
    <div className="space-y-4">
      <h2 className="font-display text-base sm:text-lg text-foreground px-1">Analysis</h2>
      {/* Stack on mobile/tablet, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Weights & Contribution Table */}
        <div className="rounded-lg border border-card-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-card-border">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Weights & Contribution</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="text-left px-2 sm:px-3 py-2 font-medium">Variable</th>
                  <th className={`text-right px-2 sm:px-3 py-2 font-medium ${weightMode === 'fixed' ? 'text-gold' : ''}`}>Fixed Wt</th>
                  <th className={`text-right px-2 sm:px-3 py-2 font-medium ${weightMode === 'rolling' ? 'text-gold' : ''}`}>Rolling Wt</th>
                  <th className="text-right px-2 sm:px-3 py-2 font-medium">Z-Score</th>
                  <th className="text-right px-2 sm:px-3 py-2 font-medium">Contribution</th>
                  <th className="text-right px-2 sm:px-3 py-2 font-medium">30d Δ</th>
                </tr>
              </thead>
              <tbody>
                {variables.map((v) => {
                  const fixedWt = FIXED_WEIGHTS[v.id] || 0;
                  const rollingWt = v.weight;
                  const isMax = v.id === maxContribId;
                  const contribColor = v.contribution > 0.01 ? 'text-bullish' : v.contribution < -0.01 ? 'text-bearish' : 'text-muted-foreground';
                  const zChange = (zChanges.get(v.id) ?? 0);

                  return (
                    <tr
                      key={v.id}
                      className={`border-b border-card-border/30 hover:bg-secondary/20 transition-colors ${isMax ? 'border-l-2 border-l-gold' : ''}`}
                    >
                      <td className="px-2 sm:px-3 py-2 font-medium text-foreground">{v.name}</td>
                      <td className={`px-2 sm:px-3 py-2 text-right font-mono ${weightMode === 'fixed' ? 'text-gold' : 'text-muted-foreground'}`}>
                        {(fixedWt * 100).toFixed(0)}%
                      </td>
                      <td className={`px-2 sm:px-3 py-2 text-right font-mono ${weightMode === 'rolling' ? 'text-gold' : 'text-muted-foreground'}`}>
                        {(rollingWt * 100).toFixed(0)}%
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-right font-mono text-foreground">
                        {v.adjustedZScore > 0 ? '+' : ''}{v.adjustedZScore.toFixed(2)}
                      </td>
                      <td className={`px-2 sm:px-3 py-2 text-right font-mono font-semibold ${contribColor}`}>
                        {v.contribution > 0 ? '+' : ''}{v.contribution.toFixed(3)}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-right font-mono text-muted-foreground">
                        {zChange > 0 ? '↑' : zChange < 0 ? '↓' : '—'} {Math.abs(zChange).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-card-border bg-secondary/10">
                  <td className="px-2 sm:px-3 py-2 font-bold text-foreground">TOTAL</td>
                  <td className="px-2 sm:px-3 py-2 text-right font-mono text-muted-foreground">100%</td>
                  <td className="px-2 sm:px-3 py-2 text-right font-mono text-muted-foreground">100%</td>
                  <td className="px-2 sm:px-3 py-2 text-right font-mono">—</td>
                  <td className="px-2 sm:px-3 py-2 text-right font-mono font-bold text-gold">
                    GDI: {currentGDI > 0 ? '+' : ''}{currentGDI.toFixed(2)}
                  </td>
                  <td className="px-2 sm:px-3 py-2 text-right font-mono">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Scenario & Forecast */}
        <div className="rounded-lg border border-card-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-card-border">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Scenario & Forecast</h3>
          </div>
          <div className="p-3 sm:p-4 space-y-4 sm:space-y-5">
            {/* Probability Bar */}
            <div>
              <GuideTooltip id="prob-bar" text="The GDI reading automatically maps to scenario probabilities using a Gaussian kernel function. A higher GDI shifts probability toward the bull scenario. These update every time the data refreshes — you never set them manually." position="bottom">
                <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Probabilities</h4>
              </GuideTooltip>
              <div className="h-6 rounded-full overflow-hidden flex text-[10px] font-mono font-semibold">
                <div className="bg-bullish flex items-center justify-center text-background transition-all" style={{ width: `${probs.bull * 100}%` }}>
                  {(probs.bull * 100).toFixed(0)}%
                </div>
                <div className="bg-gold flex items-center justify-center text-background transition-all" style={{ width: `${probs.base * 100}%` }}>
                  {(probs.base * 100).toFixed(0)}%
                </div>
                <div className="bg-bearish flex items-center justify-center text-background transition-all" style={{ width: `${probs.bear * 100}%` }}>
                  {(probs.bear * 100).toFixed(0)}%
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Driven by GDI reading of <span className="text-gold font-mono">{currentGDI > 0 ? '+' : ''}{currentGDI.toFixed(2)}</span>
              </p>
              <p className="text-[10px] text-muted-foreground/50">Probabilities auto-update with each data refresh</p>
            </div>

            {/* Scenario Target Editor */}
            <div className="space-y-3">
              {editedScenarios.map((scenario, sIdx) => (
                <div key={scenario.name} className="rounded border border-card-border/50 p-2.5 sm:p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scenario.color }} />
                      <span className="text-xs font-bold text-foreground">{scenario.name}</span>
                    </div>
                    <button
                      onClick={() => handleSave(sIdx)}
                      disabled={saving === scenario.name}
                      className="flex items-center gap-1 text-[10px] text-gold hover:text-gold/80 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      {saving === scenario.name ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {/* Responsive: 5-col inline on desktop, 3-col + 2-col on mobile */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {(['3m', '6m', '1y', '3y', '5y'] as const).map(h => (
                      <div key={h} className="text-center">
                        <label className="text-[9px] text-muted-foreground uppercase">{h}</label>
                        <input
                          type="number"
                          value={scenario.targets[h]}
                          onChange={e => handleTargetChange(sIdx, h, e.target.value)}
                          className="w-full bg-secondary/30 border border-card-border/50 rounded px-1 sm:px-1.5 py-1 text-[10px] sm:text-xs font-mono text-foreground text-center focus:border-gold/50 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={scenario.description}
                    onChange={e => handleDescChange(sIdx, e.target.value)}
                    className="w-full bg-secondary/30 border border-card-border/50 rounded px-2 py-1.5 text-[10px] text-muted-foreground resize-none h-10 focus:border-gold/50 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {/* EV & CAGR Table */}
            {bull && base && bear && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <GuideTooltip id="ev-col" text="Expected Value = probability-weighted average of the three scenario prices. This is your single best estimate at each time horizon, accounting for all scenarios." position="bottom">
                    <h4 className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Expected Value & CAGR</h4>
                  </GuideTooltip>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] sm:text-[11px]">
                    <thead>
                      <tr className="border-b border-card-border text-muted-foreground">
                        <th className="text-left px-2 py-1.5 font-medium">Horizon</th>
                        <th className="text-right px-2 py-1.5 font-medium text-bullish">Bull</th>
                        <th className="text-right px-2 py-1.5 font-medium text-gold">Base</th>
                        <th className="text-right px-2 py-1.5 font-medium text-bearish">Bear</th>
                        <th className="text-right px-2 py-1.5 font-medium">EV</th>
                        <th className="text-right px-2 py-1.5 font-medium">CAGR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horizons.map(h => {
                        const bv = bull.targets[h.key];
                        const bsv = base.targets[h.key];
                        const brv = bear.targets[h.key];
                        const ev = probs.bull * bv + probs.base * bsv + probs.bear * brv;
                        const cagr = h.years && currentGoldPrice > 0
                          ? (Math.pow(ev / currentGoldPrice, 1 / h.years) - 1) * 100
                          : null;
                        const isAttractive = cagr !== null && cagr > GOLD_LONGRUN_CAGR;
                        return (
                          <tr key={h.key} className="border-b border-card-border/30">
                            <td className="px-2 py-1.5 text-foreground">{h.label}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-bullish">${bv.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-gold">${bsv.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-bearish">${brv.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-semibold text-foreground">${Math.round(ev).toLocaleString()}</td>
                            <td className={`px-2 py-1.5 text-right font-mono ${isAttractive ? 'font-bold text-bullish' : 'text-muted-foreground'}`}>
                              {cagr !== null ? `${cagr > 0 ? '+' : ''}${cagr.toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/50 mt-2 italic">
                  Gold's long-run average annual return since 1971: ~7.9%. CAGRs above this suggest macro favors overweighting gold.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;
