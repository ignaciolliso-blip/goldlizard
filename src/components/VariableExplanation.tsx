import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { GDIResult, VariableDetail } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';

interface VariableExplanationProps {
  variable: VariableDetail;
  gdiResult: GDIResult;
  goldSpot: Observation[];
  stats: { mean: number; std: number; percentile: number } | null;
}

function computeVarHash(variable: VariableDetail): string {
  return `${variable.adjustedZScore.toFixed(1)}|${variable.contribution.toFixed(2)}|${variable.id}`;
}

function buildPromptData(
  variable: VariableDetail,
  gdiResult: GDIResult,
  goldSpot: Observation[],
  stats: { mean: number; std: number; percentile: number } | null
): string {
  const meta = variable;
  const isInverted = variable.zScore !== 0 && Math.sign(variable.zScore) !== Math.sign(variable.adjustedZScore);
  const direction = isInverted
    ? 'inverted — higher is bearish for gold'
    : 'direct — higher is bullish for gold';

  const rank = gdiResult.variableDetails
    .slice()
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .findIndex(v => v.id === variable.id) + 1;

  const top3 = gdiResult.variableDetails
    .slice()
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .filter(v => v.id !== variable.id);

  const lastGold = goldSpot.length > 0 ? goldSpot[goldSpot.length - 1].value : 0;
  const gold30dAgo = goldSpot.length > 30 ? goldSpot[goldSpot.length - 31].value : lastGold;
  const ret30d = gold30dAgo > 0 ? ((lastGold - gold30dAgo) / gold30dAgo * 100) : 0;

  const gdi = gdiResult.compositeGDI;
  const signal = gdi > 0.5 ? 'BULLISH' : gdi < -0.5 ? 'BEARISH' : 'NEUTRAL';

  const unit = variable.id === 'central_bank_gold' ? 't/qtr' :
    ['DFII10', 'T10YIE', 'DFF', 'T10Y2Y'].includes(variable.id) ? '%' :
    variable.id === 'DCOILBRENTEU' ? '$/bbl' : 'index';

  return `Variable: ${variable.name}
Current value: ${variable.currentValue.toFixed(2)} (${unit})
Z-score (adjusted): ${variable.adjustedZScore > 0 ? '+' : ''}${variable.adjustedZScore.toFixed(3)} (before adjustment: ${variable.zScore > 0 ? '+' : ''}${variable.zScore.toFixed(3)})
Direction: ${direction}
10-year mean: ${stats?.mean.toFixed(2) ?? 'N/A'}
10-year std dev: ${stats?.std.toFixed(2) ?? 'N/A'}
Percentile (10yr): ${stats?.percentile.toFixed(0) ?? 'N/A'}th
Weight in GDI: ${(variable.weight * 100).toFixed(0)}%
Contribution to GDI: ${variable.contribution > 0 ? '+' : ''}${variable.contribution.toFixed(3)}
Rank by contribution: #${rank} of 8

For context, here are the other top contributors to the GDI right now:
${top3.map(v => `- ${v.name}: contribution ${v.contribution > 0 ? '+' : ''}${v.contribution.toFixed(3)}, z-score ${v.adjustedZScore > 0 ? '+' : ''}${v.adjustedZScore.toFixed(2)}`).join('\n')}

GDI composite: ${gdi > 0 ? '+' : ''}${gdi.toFixed(3)} (${signal})
Gold spot: $${lastGold.toLocaleString()} (30d return: ${ret30d > 0 ? '+' : ''}${ret30d.toFixed(1)}%)`;
}

const VariableExplanation = ({ variable, gdiResult, goldSpot, stats }: VariableExplanationProps) => {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState('');

  const dataHash = computeVarHash(variable);

  const generate = useCallback(async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const { data: cached } = await supabase
          .from('variable_explanations')
          .select('*')
          .eq('variable_id', variable.id)
          .single();

        if (cached && cached.data_hash === dataHash && cached.explanation_text) {
          setExplanation(cached.explanation_text);
          setLastGenerated(new Date(cached.generated_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }));
          setLoading(false);
          return;
        }
      }

      const variableData = buildPromptData(variable, gdiResult, goldSpot, stats);
      const { data, error } = await supabase.functions.invoke('variable-explain', {
        body: { variableData },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      const text = data.explanation;
      setExplanation(text);
      const now = new Date();
      setLastGenerated(now.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));

      // Upsert cache
      const { data: existing } = await supabase
        .from('variable_explanations')
        .select('variable_id')
        .eq('variable_id', variable.id)
        .single();

      if (existing) {
        await supabase
          .from('variable_explanations')
          .update({ explanation_text: text, data_hash: dataHash, generated_at: now.toISOString() })
          .eq('variable_id', variable.id);
      } else {
        await supabase
          .from('variable_explanations')
          .insert({ variable_id: variable.id, explanation_text: text, data_hash: dataHash, generated_at: now.toISOString() });
      }
    } catch (e: any) {
      console.error('Variable explanation error:', e);
      setExplanation('');
    } finally {
      setLoading(false);
    }
  }, [variable.id, dataHash, gdiResult, goldSpot, stats]);

  useEffect(() => {
    generate(false);
  }, [variable.id]);

  if (!explanation && !loading) return null;

  return (
    <div className="mt-4 pt-3 border-t border-card-border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-gold" />
          Current Situation
        </h4>
        <button
          onClick={() => generate(true)}
          disabled={loading}
          className="flex items-center gap-1 text-[9px] sm:text-[10px] text-gold hover:text-gold/80 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {loading && !explanation ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 rounded animate-pulse" style={{ backgroundColor: '#2A2E3A', width: `${100 - i * 15}%` }} />
          ))}
        </div>
      ) : (
        <div className="border-l-2 border-gold/40 pl-3">
          {explanation.split('\n\n').filter(Boolean).map((p, i) => (
            <p key={i} className="text-[11px] sm:text-xs leading-[1.7] mb-2" style={{ color: '#E8E6E1' }}>
              {p}
            </p>
          ))}
          {lastGenerated && (
            <p className="text-[9px] text-muted-foreground/50 mt-1">
              ✨ AI-generated · {lastGenerated}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VariableExplanation;
