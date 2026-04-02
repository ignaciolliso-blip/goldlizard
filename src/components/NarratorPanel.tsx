import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronDown, RefreshCw, Sparkles, Save } from 'lucide-react';
import { useAnalysisSnapshots } from '@/hooks/useAnalysisSnapshots';
import AnalysisHistoryTab from '@/components/AnalysisHistoryTab';

export interface NarratorPanelProps {
  asset: string;
  currentPrice: number;
  dashboardData: string;
  dataHash: string;
  accentColor?: string;
}

function buildFallbackBriefing(asset: string, currentPrice: number): string {
  return `The ${asset} market is currently at $${currentPrice.toFixed(0)}. This is an auto-generated summary — regenerate for AI analysis.`;
}

function parsePrediction(text: string): number | null {
  const match = text.match(/^PREDICTION:\s*\$([0-9,]+(?:\.\d+)?)/m);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ''));
}

const STORAGE_KEY = 'narrator_expanded';

const NarratorPanel = ({ asset, currentPrice, dashboardData, dataHash, accentColor = 'primary' }: NarratorPanelProps) => {
  const [expanded, setExpanded] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAI, setIsAI] = useState(true);
  const [lastGenerated, setLastGenerated] = useState('');

  const { snapshots, loadingHistory, saveSnapshot, loadSnapshots } = useAnalysisSnapshots(asset);

  const toggleExpanded = () => {
    setExpanded(prev => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const generateBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('narrator', {
        body: { dashboardData, dataHash, asset },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed');
      setBriefing(data.briefing);
      setIsAI(true);
      const genAt = data.generated_at || new Date().toISOString();
      setLastGenerated(new Date(genAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      console.error('Narrator error:', e);
      setBriefing(buildFallbackBriefing(asset, currentPrice));
      setIsAI(false);
      setLastGenerated(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
      toast.error('AI briefing unavailable — showing template');
    } finally {
      setLoading(false);
    }
  }, [dashboardData, dataHash, asset, currentPrice]);

  const handleUpdateAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('narrator', {
        body: { dashboardData, dataHash, asset },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed');
      const text: string = data.briefing;
      setBriefing(text);
      setIsAI(true);
      const genAt = data.generated_at || new Date().toISOString();
      setLastGenerated(new Date(genAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));

      const predictedPrice = parsePrediction(text);
      await saveSnapshot(text, dashboardData, currentPrice, predictedPrice);
      await loadSnapshots();
      toast.success('Snapshot saved — check back in 1 month to see how it played out');
    } catch (e: any) {
      console.error('Update analysis error:', e);
      toast.error(e.message || 'Failed to save snapshot');
    } finally {
      setLoading(false);
    }
  }, [dashboardData, dataHash, asset, currentPrice, saveSnapshot, loadSnapshots]);

  useEffect(() => { generateBriefing(); }, []);

  const accentText = `text-${accentColor}`;
  const accentBg = `bg-${accentColor}`;
  const accentBorder = `border-${accentColor}`;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card" style={{ borderLeft: `3px solid hsl(var(--${accentColor}))` }}>
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className={accentText} />
          <span className="font-display text-foreground">Market Briefing</span>
          {!isAI && (
            <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Template</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            <button
              onClick={() => setTab('current')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === 'current' ? `${accentBorder} ${accentText}` : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => { setTab('history'); loadSnapshots(); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                tab === 'history' ? `${accentBorder} ${accentText}` : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              History
              {snapshots.length > 0 && (
                <span className={`${accentBg} text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none`}>
                  {snapshots.length}
                </span>
              )}
            </button>
          </div>

          {tab === 'current' ? (
            loading ? (
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => generateBriefing()}
                      className={`flex items-center gap-1.5 text-xs ${accentText} hover:opacity-80 transition-colors`}
                    >
                      <RefreshCw size={12} />
                      Regenerate
                    </button>
                    <button
                      onClick={handleUpdateAnalysis}
                      className={`flex items-center gap-1.5 text-xs ${accentBg} text-white px-2.5 py-1 rounded-md hover:opacity-90 transition-opacity`}
                    >
                      <Save size={12} />
                      Update Analysis
                    </button>
                  </div>
                </div>
              </>
            )
          ) : (
            <AnalysisHistoryTab
              snapshots={snapshots as any}
              loading={loadingHistory}
              onLoad={loadSnapshots}
              accentColor={accentColor}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default NarratorPanel;
