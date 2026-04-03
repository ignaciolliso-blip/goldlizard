import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeMinerValuations,
  type MinerUniverse,
  type MinerFinancials,
  type MinerValuationResult,
  type Signal,
} from '@/lib/uraniumMinerValuationEngine';
import { ChevronDown, ChevronRight, RefreshCw, ExternalLink, AlertTriangle, Pickaxe, HardHat, Search, Crown, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, d = 1): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtUsd(n: number, d = 1): string { return '$' + fmt(n, d); }

const JURISDICTION_FLAGS: Record<string, string> = {
  Canada: '🇨🇦', USA: '🇺🇸', Kazakhstan: '🇰🇿', Australia: '🇦🇺',
  Namibia: '🇳🇦', Malawi: '🇲🇼', Global: '🌍',
};

function jurisdictionFlag(ops: string): string {
  const first = ops.split('/')[0].trim();
  return JURISDICTION_FLAGS[first] || '🌍';
}

function signalColor(s: Signal): string {
  if (s === 'BUY') return 'text-green-400 bg-green-400/10 border-green-400/30';
  if (s === 'AVOID') return 'text-red-400 bg-red-400/10 border-red-400/30';
  return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
}

function metricColor(flag: 'cheap' | 'fair' | 'expensive' | undefined): string {
  if (flag === 'cheap') return 'text-green-400';
  if (flag === 'expensive') return 'text-red-400';
  return 'text-yellow-400';
}

function stageBadge(stage: string) {
  const colors: Record<string, string> = {
    Producer: 'bg-uranium/10 text-uranium border-uranium/30',
    Developer: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
    Explorer: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
    Royalty: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  };
  return (
    <span className={`text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border ${colors[stage] || 'bg-secondary text-muted-foreground border-border'}`}>
      {stage}
    </span>
  );
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  Producer: <Pickaxe className="w-4 h-4" />,
  Developer: <HardHat className="w-4 h-4" />,
  Explorer: <Search className="w-4 h-4" />,
  Royalty: <Crown className="w-4 h-4" />,
};

// ── Extended universe type with source fields ────────────────────────────────

interface UniverseRow extends MinerUniverse {
  resources_source_url: string | null;
  resources_source_date: string | null;
  resources_approved: boolean;
  production_source_url: string | null;
  capex_source_url: string | null;
  optionality_narrative: string | null;
  optionality_source_url: string | null;
  last_ai_extraction: string | null;
}

// ── Detail Card ──────────────────────────────────────────────────────────────

function DetailCard({ result, universe, spotPrice, onApprove }: {
  result: MinerValuationResult;
  universe: UniverseRow;
  spotPrice: number;
  onApprove: (ticker: string) => void;
}) {
  const [approved, setApproved] = useState(universe.resources_approved);

  return (
    <div className="bg-background/50 border border-border rounded-lg p-5 space-y-5 mt-2 mb-1">
      {/* Pending review warning */}
      {!approved && universe.resources_mlb != null && (
        <div className="flex items-start justify-between gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-sm text-yellow-300/90">
              <span className="font-semibold">Resource data pending review</span> — extracted by AI from company filings. Verify before relying on this for investment decisions.
              {universe.resources_source_url && (
                <a href={universe.resources_source_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-uranium underline ml-1.5">
                  View source <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <button
            onClick={() => { onApprove(universe.ticker); setApproved(true); }}
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-lg bg-green-400/10 text-green-400 border border-green-400/20 hover:bg-green-400/20 transition-colors shrink-0 whitespace-nowrap"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Verify & Approve
          </button>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EV/lb */}
        {result.evPerLb && (
          <MetricBlock
            label="EV / lb U3O8"
            value={fmtUsd(result.evPerLb.value) + '/lb'}
            flag={result.evPerLb.flag}
            explanation={result.evPerLb.explanation}
            sourceUrl={universe.resources_source_url}
            sourceDate={universe.resources_source_date}
          />
        )}

        {/* P/NAV Proxy */}
        {result.pNavProxy && (
          <MetricBlock
            label="P/NAV Proxy"
            value={fmt(result.pNavProxy.ratio, 2) + '×'}
            flag={result.pNavProxy.ratio < 0.15 ? 'cheap' : result.pNavProxy.ratio > 0.40 ? 'expensive' : 'fair'}
            explanation={result.pNavProxy.explanation}
          />
        )}

        {/* EV/EBITDA */}
        {result.evEbitda && (
          <MetricBlock
            label="EV / EBITDA"
            value={fmt(result.evEbitda.value) + '×'}
            flag={result.evEbitda.flag}
            explanation={result.evEbitda.explanation}
          />
        )}

        {/* EV/Production */}
        {result.evProduction && (
          <MetricBlock
            label="EV / Annual Production"
            value={fmtUsd(result.evProduction.value) + '/lb'}
            explanation={result.evProduction.explanation}
          />
        )}
      </div>

      {/* P/NAV calculation box */}
      {result.pNavProxy && result.evPerLb && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
            P/NAV PROXY — HOW THIS IS CALCULATED
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            EV/lb ÷ Spot Price = <span className="text-foreground font-mono">{fmtUsd(result.evPerLb.value)}</span>
            {' ÷ '}<span className="text-foreground font-mono">{fmtUsd(spotPrice)}</span>
            {' = '}<span className="text-uranium font-mono font-semibold">{fmt(result.pNavProxy.ratio, 2)}×</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Where EV = <span className="font-mono text-foreground">{result.evBn != null ? fmtUsd(result.evBn, 2) + 'bn' : 'n/a'}</span>,
            Resources = <span className="font-mono text-foreground">{result.resourcesMlb != null ? fmt(result.resourcesMlb) + ' Mlb' : 'n/a'}</span>,
            Spot = <span className="font-mono text-foreground">{fmtUsd(spotPrice)}/lb</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2 italic">{result.pNavProxy.caveat}</p>
        </div>
      )}

      {/* Optionality */}
      {universe.optionality_narrative && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">OPTIONALITY</h4>
          <p className="text-sm text-foreground/90 leading-relaxed">{universe.optionality_narrative}</p>
          {universe.optionality_source_url && (
            <a href={universe.optionality_source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-uranium mt-2 hover:underline">
              Source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Data sources */}
      <div className="border-t border-border pt-3">
        <h4 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">DATA SOURCES</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
          <SourceRow label="Financials" source="Financial Modeling Prep" />
          {universe.resources_source_url && (
            <SourceRow label="Resources" source="Company Filing" url={universe.resources_source_url} date={universe.resources_source_date} />
          )}
          {universe.production_source_url && (
            <SourceRow label="Production" source="Company Filing" url={universe.production_source_url} />
          )}
          {universe.capex_source_url && (
            <SourceRow label="Capex" source="Company Filing" url={universe.capex_source_url} />
          )}
          {universe.last_ai_extraction && (
            <div className="col-span-full text-muted-foreground/60 mt-1">
              AI extraction: {new Date(universe.last_ai_extraction).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, flag, explanation, sourceUrl, sourceDate }: {
  label: string;
  value: string;
  flag?: 'cheap' | 'fair' | 'expensive';
  explanation: string;
  sourceUrl?: string | null;
  sourceDate?: string | null;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</div>
      <div className={`text-xl font-mono font-semibold ${flag ? metricColor(flag) : 'text-foreground'}`}>{value}</div>
      <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-uranium">
          <ExternalLink className="w-3 h-3" />
          {sourceDate ? new Date(sourceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Source'}
        </a>
      )}
    </div>
  );
}

function SourceRow({ label, source, url, date }: {
  label: string; source: string; url?: string; date?: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-foreground/70 font-medium">{label}:</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-uranium">
          {source} <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <span>{source}</span>
      )}
      {date && <span className="text-muted-foreground/50">({new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})</span>}
    </div>
  );
}

// ── Miner Row ────────────────────────────────────────────────────────────────

function MinerRow({ result, universe, spotPrice, onApprove }: {
  result: MinerValuationResult;
  universe: UniverseRow;
  spotPrice: number;
  onApprove: (ticker: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full grid grid-cols-[1fr_auto_auto_auto_auto_auto_28px] items-center gap-3 py-3 px-4 hover:bg-secondary/30 transition-colors text-left rounded-lg"
      >
        {/* Company */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{jurisdictionFlag(result.jurisdictionOperations)}</span>
          <div className="truncate">
            <span className="text-sm font-medium text-foreground">{result.company}</span>
            <span className="text-xs text-muted-foreground ml-1.5">[{result.ticker}]</span>
          </div>
        </div>

        {/* Stage */}
        <div className="hidden sm:block">{stageBadge(result.stage)}</div>

        {/* EV/lb */}
        <div className="text-right min-w-[72px]">
          {result.evPerLb ? (
            <span className={`text-sm font-mono font-medium ${metricColor(result.evPerLb.flag)}`}>
              {fmtUsd(result.evPerLb.value, 0)}/lb
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/50">—</span>
          )}
        </div>

        {/* P/NAV */}
        <div className="text-right min-w-[56px]">
          {result.pNavProxy ? (
            <span className={`text-sm font-mono font-medium ${metricColor(
              result.pNavProxy.ratio < 0.15 ? 'cheap' : result.pNavProxy.ratio > 0.40 ? 'expensive' : 'fair'
            )}`}>
              {fmt(result.pNavProxy.ratio, 2)}×
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/50">—</span>
          )}
        </div>

        {/* EV/EBITDA */}
        <div className="text-right min-w-[56px] hidden md:block">
          {result.evEbitda ? (
            <span className={`text-sm font-mono font-medium ${metricColor(result.evEbitda.flag)}`}>
              {fmt(result.evEbitda.value)}×
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/50">—</span>
          )}
        </div>

        {/* Signal */}
        <div className="text-right min-w-[56px]">
          <span className={`text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${signalColor(result.composite.signal)}`}>
            {result.composite.signal}
          </span>
        </div>

        {/* Chevron */}
        <div className="text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {expanded && <DetailCard result={result} universe={universe} spotPrice={spotPrice} onApprove={onApprove} />}
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

function StageSection({ title, icon, results, universeMap, spotPrice, onApprove }: {
  title: string;
  icon: React.ReactNode;
  results: MinerValuationResult[];
  universeMap: Map<string, UniverseRow>;
  spotPrice: number;
  onApprove: (ticker: string) => void;
}) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="text-uranium/70">{icon}</div>
        <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h4>
        <span className="text-xs text-muted-foreground/50 ml-1">({results.length})</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_28px] items-center gap-3 px-4 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/50 uppercase">
        <div>Company</div>
        <div className="hidden sm:block">Stage</div>
        <div className="text-right min-w-[72px]">EV/lb</div>
        <div className="text-right min-w-[56px]">P/NAV</div>
        <div className="text-right min-w-[56px] hidden md:block">EV/EBITDA</div>
        <div className="text-right min-w-[56px]">Signal</div>
        <div />
      </div>

      <div className="divide-y divide-border/50">
        {results.map(r => (
          <MinerRow key={r.ticker} result={r} universe={universeMap.get(r.ticker)!} spotPrice={spotPrice} onApprove={onApprove} />
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
  uraniumSpotPrice: number;
}

export default function UraniumMinerValuationPanel({ uraniumSpotPrice }: Props) {
  const [universe, setUniverse] = useState<UniverseRow[]>([]);
  const [financials, setFinancials] = useState<MinerFinancials[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ── Data fetch ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [uniRes, finRes] = await Promise.all([
      supabase.from('uranium_miner_universe').select('*'),
      supabase.from('uranium_miner_financials').select('*').order('fetched_at', { ascending: false }),
    ]);

    if (uniRes.data) setUniverse(uniRes.data as unknown as UniverseRow[]);

    // De-dupe financials — keep most recent per ticker
    if (finRes.data) {
      const seen = new Set<string>();
      const deduped: MinerFinancials[] = [];
      for (const row of finRes.data) {
        if (!seen.has(row.ticker)) {
          seen.add(row.ticker);
          deduped.push(row as unknown as MinerFinancials);
        }
      }
      setFinancials(deduped);
      if (finRes.data.length > 0) {
        setLastUpdated(finRes.data[0].fetched_at);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Compute valuations ───────────────────────────────────────────────────
  const valuations = useMemo(() => {
    if (universe.length === 0) return [];
    return computeMinerValuations(universe, financials, uraniumSpotPrice);
  }, [universe, financials, uraniumSpotPrice]);

  const universeMap = useMemo(() => {
    const m = new Map<string, UniverseRow>();
    universe.forEach(u => m.set(u.ticker, u));
    return m;
  }, [universe]);

  const producers = useMemo(() => valuations.filter(v => v.stage === 'Producer'), [valuations]);
  const developers = useMemo(() => valuations.filter(v => v.stage === 'Developer'), [valuations]);
  const others = useMemo(() => valuations.filter(v => v.stage === 'Explorer' || v.stage === 'Royalty'), [valuations]);

  // ── Update handler ───────────────────────────────────────────────────────
  const handleUpdate = async () => {
    setUpdating(true);

    try {
      // Step 1: Fetch financials
      setUpdateStatus('Fetching financials from FMP...');
      const finRes = await supabase.functions.invoke('fetch-miner-financials', { body: {} });
      if (finRes.error) throw new Error(finRes.error.message);

      const finSummary = finRes.data;
      setUpdateStatus(`Financials done — ${finSummary?.succeeded ?? 0}/${finSummary?.total ?? 0} tickers fetched.`);

      // Step 2: Extract resource data
      await new Promise(r => setTimeout(r, 500));

      const needExtraction = universe.filter(u => !u.resources_approved || !u.last_ai_extraction);
      if (needExtraction.length > 0) {
        setUpdateStatus(`Extracting resource data... (${needExtraction.length} need update)`);
        const extRes = await supabase.functions.invoke('extract-miner-data', {
          body: { tickers: needExtraction.map(u => u.ticker) },
        });
        if (extRes.error) throw new Error(extRes.error.message);

        const extSummary = extRes.data;
        setUpdateStatus(`Extraction done — ${extSummary?.succeeded ?? 0}/${extSummary?.total ?? 0} miners processed.`);
      } else {
        setUpdateStatus('All resource data already extracted. Skipping AI extraction.');
      }

      // Step 3: Reload data
      await new Promise(r => setTimeout(r, 500));
      setUpdateStatus('Calculating valuations...');
      await loadData();
      setUpdateStatus('');
    } catch (e) {
      console.error('Update error:', e);
      setUpdateStatus(`Error: ${(e as Error).message}`);
      setTimeout(() => setUpdateStatus(''), 5000);
    } finally {
      setUpdating(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-7 space-y-4 animate-pulse">
        <div className="h-5 w-64 bg-secondary rounded" />
        <div className="h-4 w-48 bg-secondary/60 rounded" />
        <div className="h-64 bg-secondary/40 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-7 pb-4 space-y-1.5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              MINER VALUATION — {universe.length} Companies Across the Uranium Value Chain
            </h3>
            <p className="text-sm italic text-muted-foreground mt-0.5">
              Producers · Developers · Explorers · Royalties
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground/50">
                Updated {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-lg bg-uranium/10 text-uranium border border-uranium/20 hover:bg-uranium/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Updating…' : 'Update Data'}
            </button>
          </div>
        </div>

        {/* Progress */}
        {updateStatus && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-uranium animate-pulse" />
            <span className="text-sm text-uranium/80">{updateStatus}</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <StageSection title="Producers" icon={STAGE_ICONS.Producer} results={producers} universeMap={universeMap} spotPrice={uraniumSpotPrice} />
      <StageSection title="Developers" icon={STAGE_ICONS.Developer} results={developers} universeMap={universeMap} spotPrice={uraniumSpotPrice} />
      <StageSection title="Explorers & Royalties" icon={STAGE_ICONS.Explorer} results={others} universeMap={universeMap} spotPrice={uraniumSpotPrice} />

      {/* Empty state */}
      {valuations.length === 0 && (
        <div className="px-7 py-12 text-center text-muted-foreground">
          No miner data available. Click "Update Data" to fetch financials and resource estimates.
        </div>
      )}

      <div className="h-3" />
    </div>
  );
}
