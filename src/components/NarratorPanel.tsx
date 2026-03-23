import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { GDIResult } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import type { ScenarioProbabilities, ScenarioConfig } from '@/lib/scenarioEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NarratorPanelProps {
  gdiResult: GDIResult;
  goldSpot: Observation[];
  currentGDI: number;
  probs: ScenarioProbabilities;
  scenarioConfig: ScenarioConfig | null;
  currentGoldPrice: number;
  weightMode: 'fixed' | 'rolling';
}

function computeDataHash(gdiResult: GDIResult, currentGDI: number): string {
  const top3 = gdiResult.variableDetails
    .slice(0, 3)
    .map(v => `${v.id}:${v.contribution.toFixed(2)}`)
    .join('|');
  return `${currentGDI.toFixed(1)}|${top3}`;
}

function buildDashboardDataString(props: NarratorPanelProps): string {
  const { gdiResult, goldSpot, currentGDI, probs, scenarioConfig, currentGoldPrice, weightMode } = props;

  const lastGold = goldSpot.length > 0 ? goldSpot[goldSpot.length - 1].value : 0;
  const gold30dAgo = goldSpot.length > 30 ? goldSpot[goldSpot.length - 31].value : lastGold;
  const ret30d = gold30dAgo > 0 ? ((lastGold - gold30dAgo) / gold30dAgo * 100) : 0;

  const signal = currentGDI > 0.5 ? 'BULLISH' : currentGDI < -0.5 ? 'BEARISH' : 'NEUTRAL';

  const components = gdiResult.variableDetails.map((v, i) => {
    return `${i + 1}. ${v.name}: raw=${v.currentValue.toFixed(2)}, z-score=${v.adjustedZScore.toFixed(2)}, weight=${(v.weight * 100).toFixed(0)}%, contribution=${v.contribution > 0 ? '+' : ''}${v.contribution.toFixed(3)}, 30d change=est`;
  }).join('\n');

  // EV calculations
  const bull = scenarioConfig?.scenarios.find(s => s.name === 'Bull');
  const base = scenarioConfig?.scenarios.find(s => s.name === 'Base');
  const bear = scenarioConfig?.scenarios.find(s => s.name === 'Bear');
  const ev1y = bull && base && bear ? (probs.bull * bull.targets['1y'] + probs.base * base.targets['1y'] + probs.bear * bear.targets['1y']) : 0;
  const ev3y = bull && base && bear ? (probs.bull * bull.targets['3y'] + probs.base * base.targets['3y'] + probs.bear * bear.targets['3y']) : 0;
  const ev5y = bull && base && bear ? (probs.bull * bull.targets['5y'] + probs.base * base.targets['5y'] + probs.bear * bear.targets['5y']) : 0;
  const cagr5y = currentGoldPrice > 0 && ev5y > 0 ? ((Math.pow(ev5y / currentGoldPrice, 1 / 5) - 1) * 100) : 0;

  // Divergence
  let divStatus = 'No divergence — GDI and price are aligned';
  if (currentGDI > 0.5 && ret30d < -5) {
    divStatus = `BULLISH DIVERGENCE: GDI reads +${currentGDI.toFixed(2)} but gold is down ${ret30d.toFixed(1)}%`;
  } else if (currentGDI < -0.5 && ret30d > 5) {
    divStatus = `BEARISH DIVERGENCE: GDI reads ${currentGDI.toFixed(2)} but gold is up +${ret30d.toFixed(1)}%`;
  }

  return `Gold spot: $${lastGold.toLocaleString()} (30d return: ${ret30d > 0 ? '+' : ''}${ret30d.toFixed(1)}%, ATH: $5,595)
GDI composite: ${currentGDI > 0 ? '+' : ''}${currentGDI.toFixed(3)} (${signal})
Active weights: ${weightMode === 'fixed' ? 'Fixed' : 'Rolling'}

Component breakdown (sorted by absolute contribution):
${components}

Scenario probabilities: Bull ${(probs.bull * 100).toFixed(0)}%, Base ${(probs.base * 100).toFixed(0)}%, Bear ${(probs.bear * 100).toFixed(0)}%
Expected values: 1Y=$${Math.round(ev1y).toLocaleString()}, 3Y=$${Math.round(ev3y).toLocaleString()}, 5Y=$${Math.round(ev5y).toLocaleString()}
Implied 5Y CAGR: ${cagr5y.toFixed(1)}%

Divergence status: ${divStatus}`;
}

function buildFallbackBriefing(props: NarratorPanelProps): string {
  const { gdiResult, currentGDI, currentGoldPrice, probs, scenarioConfig } = props;
  const signal = currentGDI > 0.5 ? 'BULLISH' : currentGDI < -0.5 ? 'BEARISH' : 'NEUTRAL';
  const topVar = gdiResult.variableDetails[0];
  const bull = scenarioConfig?.scenarios.find(s => s.name === 'Bull');
  const base = scenarioConfig?.scenarios.find(s => s.name === 'Base');
  const bear = scenarioConfig?.scenarios.find(s => s.name === 'Bear');
  const ev5y = bull && base && bear ? (probs.bull * bull.targets['5y'] + probs.base * base.targets['5y'] + probs.bear * bear.targets['5y']) : 0;
  const cagr5y = currentGoldPrice > 0 && ev5y > 0 ? ((Math.pow(ev5y / currentGoldPrice, 1 / 5) - 1) * 100) : 0;

  return `GDI reads ${currentGDI > 0 ? '+' : ''}${currentGDI.toFixed(2)} (${signal}). Top driver: ${topVar?.name || 'N/A'} contributing ${topVar ? (topVar.contribution > 0 ? '+' : '') + topVar.contribution.toFixed(3) : 'N/A'}. Current 5Y implied CAGR: ${cagr5y.toFixed(1)}%.`;
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
      // Check cache first
      if (!force) {
        const { data: cached } = await supabase
          .from('narrator_cache')
          .select('*')
          .eq('id', 1)
          .single();

        if (cached && cached.data_hash === dataHash && cached.briefing_text) {
          setBriefing(cached.briefing_text);
          setLastGenerated(new Date(cached.generated_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }));
          setIsAI(true);
          setLoading(false);
          return;
        }
      }

      const dashboardData = buildDashboardDataString(props);
      const { data, error } = await supabase.functions.invoke('narrator', {
        body: { dashboardData },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to generate briefing');
      }

      const text = data.briefing;
      setBriefing(text);
      setIsAI(true);
      const now = new Date();
      setLastGenerated(now.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));

      // Save to cache
      await supabase
        .from('narrator_cache')
        .update({
          briefing_text: text,
          data_hash: dataHash,
          generated_at: now.toISOString(),
        })
        .eq('id', 1);
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
    <div className="rounded-lg border border-card-border overflow-hidden" style={{ backgroundColor: '#1A1E28', borderLeft: '3px solid hsl(var(--gold))' }}>
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h2 className="font-display text-sm sm:text-base text-foreground">Market Briefing</h2>
          {!isAI && briefing && (
            <span className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded">Template</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Last generated: {lastGenerated}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => generateBriefing(true)}
              disabled={loading}
              className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gold hover:text-gold/80 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>

          {loading && !briefing ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 rounded animate-pulse" style={{ backgroundColor: '#2A2E3A', width: `${100 - i * 10}%` }} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {briefing.split('\n\n').filter(Boolean).map((paragraph, i) => (
                <p key={i} className="text-sm leading-[1.7]" style={{ color: '#E8E6E1' }}>
                  {paragraph}
                </p>
              ))}
              {!isAI && (
                <p className="text-[10px] text-muted-foreground/60 italic mt-2">
                  AI briefing unavailable — showing template summary
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NarratorPanel;
