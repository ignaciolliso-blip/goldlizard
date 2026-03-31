import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronDown, RefreshCw, Sparkles, FileText } from 'lucide-react';
import type { GDIResult } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import type { ScenarioConfig, ScenarioProbabilities } from '@/lib/scenarioEngine';
import type { AnchorResult } from '@/lib/anchorEngine';
import type { LeverageResult } from '@/lib/leverageEngine';

export interface NarratorPanelProps {
  gdiResult: GDIResult;
  goldSpot: Observation[];
  currentGDI: number;
  Probable?: ScenarioProbabilities;
  probs?: ScenarioProbabilities;
  scenarioConfig: ScenarioConfig | null;
  currentGoldPrice: number;
  weightMode: 'fixed' | 'rolling';
  anchorResult?: AnchorResult | null;
  leverageResult?: LeverageResult | null;
  currentGDXPrice?: number;
}

function computeDataHash(gdiResult: GDIResult, currentGDI: number): string {
  const top3 = [...gdiResult.variableDetails]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map(v => `${v.id}:${v.contribution.toFixed(2)}`)
    .join('|');
  return `${top3}|gdi:${currentGDI.toFixed(2)}`;
}

function buildDashboardDataString(props: NarratorPanelProps): string {
  const { gdiResult, goldSpot, currentGDI, currentGoldPrice, weightMode, anchorResult, leverageResult, currentGDXPrice } = props;
  const probs = props.probs || props.Probable;

  const sorted = [...gdiResult.variableDetails].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const varLines = sorted.map(v =>
    `${v.name}: z=${v.adjustedZScore.toFixed(2)}, weight=${(v.weight * 100).toFixed(1)}%, contribution=${v.contribution.toFixed(3)}, direction=${v.direction}`
  ).join('\n');

  const gold30d = goldSpot.length >= 22
    ? ((goldSpot[goldSpot.length - 1].value / goldSpot[goldSpot.length - 22].value - 1) * 100).toFixed(1)
    : 'N/A';

  let text = `Gold: $${currentGoldPrice.toFixed(0)} (30d: ${gold30d}%)\nGDI: ${currentGDI.toFixed(2)} (${weightMode} weights)\n\nComponents:\n${varLines}`;

  if (probs) {
    const ev = probs.scenarios.reduce((sum, s) => sum + s.probability * s.target, 0);
    text += `\n\nScenario EV: $${ev.toFixed(0)}`;
  }

  if (anchorResult) {
    text += `\n\nAnchor: Gold/M2 ratio ${anchorResult.currentRatio.toFixed(4)}, parity $${anchorResult.parityPrice.toFixed(0)}, divergence ${anchorResult.divergencePct.toFixed(1)}%`;
  }

  if (leverageResult && currentGDXPrice) {
    text += `\nLeverage: GDX/Gold ratio ${leverageResult.currentRatio.toFixed(4)}, percentile ${leverageResult.percentile.toFixed(0)}%`;
  }

  return text;
}

function buildFallbackBriefing(props: NarratorPanelProps): string {
  const { currentGDI, currentGoldPrice } = props;
  const signal = currentGDI > 0.3 ? 'bullish' : currentGDI < -0.3 ? 'bearish' : 'neutral';
  return `The GDI currently reads ${currentGDI.toFixed(2)}, signaling a ${signal} macro environment for gold at $${currentGoldPrice.toFixed(0)}. This is an auto-generated summary — regenerate for AI analysis.`;
}

const STORAGE_KEY = 'narrator_expanded';

const NarratorPanel = (props: NarratorPanelProps) => {
  const { gdiResult, currentGDI } = props;
  const [expanded, setExpanded] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [briefing, setBriefing] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isAI, setIsAI] = useState(true);
  const [lastGenerated, setLastGenerated] = useState<string>('');

  const toggleExpanded = () => {
    setExpanded(prev => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const dataHash = computeDataHash(gdiResult, currentGDI);

  const generateBriefing = useCallback(async (force: boolean = false) => {
    setLoading(true);
    try {
      const dashboardData = buildDashboardDataString(props);

      // Edge function handles cache check + generation + cache write (all server-side)
      const { data, error } = await supabase.functions.invoke('narrator', {
        body: {
          dashboardData,
          dataHash,
          checkCacheOnly: !force ? false : undefined,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to generate briefing');
      }

      const text = data.briefing;
      setBriefing(text);
      setIsAI(true);
      const genAt = data.generated_at || new Date().toISOString();
      setLastGenerated(new Date(genAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));
    } catch (e: any) {
      console.error('Narrator error:', e);
      setBriefing(buildFallbackBriefing(props));
      setIsAI(false);
      setLastGenerated(new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));
      toast.error('AI briefing unavailable — showing template');
    } finally {
      setLoading(false);
    }
  }, [dataHash, props]);

  useEffect(() => {
    generateBriefing(false);
  }, []);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card" style={{ borderLeft: '3px solid hsl(var(--primary))' }}>
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="font-display text-foreground">Market Briefing</span>
          {!isAI && (
            <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Template</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted/50 rounded animate-pulse w-full" />
              <div className="h-4 bg-muted/50 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-muted/50 rounded animate-pulse w-4/6" />
            </div>
          ) : (
            <>
              <div className="text-muted-foreground text-[15px] leading-relaxed whitespace-pre-line">
                {briefing}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground text-xs">
                  {lastGenerated && `Generated ${lastGenerated}`}
                </span>
                <button
                  onClick={() => generateBriefing(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <RefreshCw size={12} />
                  Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NarratorPanel;
