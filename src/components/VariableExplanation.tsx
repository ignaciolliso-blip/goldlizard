import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';
import type { GDIResult } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import { VARIABLE_METADATA } from '@/lib/variableMetadata';

interface VariableExplanationProps {
  variable: { id: string; name: string; adjustedZScore: number; contribution: number; weight: number };
  gdiResult: GDIResult;
  goldSpot: Observation[];
  stats: { mean: number; std: number; percentile: number } | null;
}

function computeVarHash(variable: VariableExplanationProps['variable']): string {
  return `${variable.adjustedZScore.toFixed(3)}|${variable.contribution.toFixed(3)}|${variable.id}`;
}

function buildPromptData(
  variable: VariableExplanationProps['variable'],
  gdiResult: GDIResult,
  goldSpot: Observation[],
  stats: VariableExplanationProps['stats']
): string {
  const meta = VARIABLE_METADATA[variable.id];
  const sorted = [...gdiResult.variableDetails].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const rank = sorted.findIndex(v => v.id === variable.id) + 1;
  const top3 = sorted.slice(0, 3).map(v => `${v.name} (${v.contribution.toFixed(3)})`).join(', ');

  const goldPrice = goldSpot.length > 0 ? goldSpot[goldSpot.length - 1].value : 0;
  const gold30d = goldSpot.length >= 22
    ? ((goldSpot[goldSpot.length - 1].value / goldSpot[goldSpot.length - 22].value - 1) * 100).toFixed(1)
    : 'N/A';

  let text = `Variable: ${variable.name} (${variable.id})
Z-score: ${variable.adjustedZScore.toFixed(2)}
Contribution to GDI: ${variable.contribution.toFixed(3)} (rank ${rank} of ${sorted.length})
Weight: ${(variable.weight * 100).toFixed(1)}%
Contribution sign: ${variable.contribution > 0 ? 'positive (bullish)' : 'negative (bearish)'}
Top 3 contributors: ${top3}
Gold price: $${goldPrice.toFixed(0)} (30d return: ${gold30d}%)
GDI: ${gdiResult.gdiValues[gdiResult.gdiValues.length - 1]?.toFixed(2) || 'N/A'}`;

  if (meta) {
    text += `\nUnit: ${meta.unit || 'index'}`;
  }
  if (stats) {
    text += `\nMean: ${stats.mean.toFixed(2)}, Std: ${stats.std.toFixed(2)}, Percentile: ${stats.percentile.toFixed(0)}%`;
  }

  return text;
}

const VariableExplanation = ({ variable, gdiResult, goldSpot, stats }: VariableExplanationProps) => {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState('');

  const dataHash = computeVarHash(variable);

  const generate = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const variableData = buildPromptData(variable, gdiResult, goldSpot, stats);

      // Edge function handles cache check + generation + cache write (all server-side)
      const { data, error } = await supabase.functions.invoke('variable-explain', {
        body: {
          variableData,
          variableId: variable.id,
          dataHash,
          checkCacheOnly: !force ? false : undefined,
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      const text = data.explanation;
      if (!text) {
        setExplanation('');
        setLoading(false);
        return;
      }

      setExplanation(text);
      const genAt = data.generated_at || new Date().toISOString();
      setLastGenerated(new Date(genAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));
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
    <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border">
      {loading ? (
        <div className="space-y-1.5">
          <div className="h-3 bg-muted/50 rounded animate-pulse w-full" />
          <div className="h-3 bg-muted/50 rounded animate-pulse w-4/5" />
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-sm leading-relaxed">{explanation}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-muted-foreground text-[11px]">
              {lastGenerated && `Generated ${lastGenerated}`}
            </span>
            <button
              onClick={() => generate(true)}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
            >
              <RefreshCw size={10} />
              Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VariableExplanation;
