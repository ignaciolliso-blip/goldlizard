import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, HardHat, Search, Layers, Info, AlertTriangle, HelpCircle, RefreshCw, Loader2 } from "lucide-react";
import { LBS_PER_TONNE } from "@/lib/copperEngine";
import CopperJurisdictionTable from "./CopperJurisdictionTable";
import { computeValuation, type ValuationResult } from "@/lib/copperValuationEngine";
import type { CopperEquityName, CopperMarketData, CopperJurisdiction, CopperForce, CopperEquityFinancial } from "@/lib/copperDataFetcher";
import type { CopperAnchorResult } from "@/lib/copperEngine";
import { computeForcesVerdict } from "./CopperForcesCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  equities: CopperEquityName[];
  marketData: CopperMarketData;
  anchorResult: CopperAnchorResult;
  forces: CopperForce[];
  jurisdictions: CopperJurisdiction[];
  financials: CopperEquityFinancial[];
  onFinancialsUpdated?: () => void;
}

function riskTagColor(tag: string): string {
  if (tag === "LOW") return "border-emerald-500/50 text-emerald-500";
  if (tag === "MOD") return "border-yellow-500/50 text-yellow-500";
  if (tag === "HIGH") return "border-orange-500/50 text-orange-500";
  if (tag === "VERY_HIGH") return "border-red-500/50 text-red-500";
  return "border-muted-foreground/50 text-muted-foreground";
}

function jurisdictionScore(jurs: { country: string; risk_tag: string }[] | null): number {
  if (!jurs || jurs.length === 0) return 0;
  return jurs.reduce((w, j) => {
    const s = j.risk_tag === "VERY_HIGH" ? -1.5 : j.risk_tag === "HIGH" ? -1 : j.risk_tag === "MOD" ? -0.5 : 0;
    return Math.min(w, s);
  }, 0);
}

function compositeSignal(score: number, redFlags: ValuationResult["redFlags"]): { text: string; color: string } {
  const caps = redFlags.filter(f => f.cap).map(f => f.cap!);
  let result: { text: string; color: string };
  if (score >= 4) result = { text: "STRONG BUY", color: "bg-emerald-600 text-white" };
  else if (score >= 2.5) result = { text: "BUY", color: "bg-emerald-500 text-white" };
  else if (score >= 1) result = { text: "ACCUMULATE ON WEAKNESS", color: "bg-yellow-500 text-black" };
  else if (score >= -0.5) result = { text: "HOLD / WATCH", color: "bg-muted text-muted-foreground" };
  else result = { text: "REDUCE / AVOID", color: "bg-red-500 text-white" };

  const signalRank = (s: string) => {
    if (s === "REDUCE / AVOID") return 0;
    if (s === "HOLD / WATCH") return 1;
    if (s === "ACCUMULATE ON WEAKNESS") return 2;
    if (s === "BUY") return 3;
    if (s === "STRONG BUY") return 4;
    return 1;
  };
  for (const cap of caps) {
    if (signalRank(result.text) > signalRank(cap)) {
      if (cap === "HOLD / WATCH") result = { text: "HOLD / WATCH", color: "bg-muted text-muted-foreground" };
      else if (cap === "ACCUMULATE ON WEAKNESS") result = { text: "ACCUMULATE ON WEAKNESS", color: "bg-yellow-500 text-black" };
    }
  }
  return result;
}

function catalystBadge(status: string | null) {
  if (status === "on_track") return <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-500 animate-pulse">CATALYST APPROACHING</Badge>;
  if (status === "delayed") return <Badge variant="outline" className="text-[9px] border-yellow-500/50 text-yellow-500">DELAYED</Badge>;
  if (status === "at_risk") return <Badge variant="outline" className="text-[9px] border-red-500/50 text-red-500">AT RISK</Badge>;
  if (status === "completed") return <Badge variant="outline" className="text-[9px] border-blue-500/50 text-blue-500">COMPLETED</Badge>;
  return null;
}

function positionCapFromJurisdictions(jurs: { country: string; risk_tag: string }[] | null): string {
  if (!jurs || jurs.length === 0) return "100%";
  if (jurs.some(j => j.risk_tag === "VERY_HIGH")) return "25%";
  if (jurs.some(j => j.risk_tag === "HIGH")) return "50%";
  if (jurs.some(j => j.risk_tag === "MOD")) return "75%";
  return "100%";
}

function metricColor(flag: "cheap" | "fair" | "expensive"): string {
  if (flag === "cheap") return "text-emerald-400";
  if (flag === "expensive") return "text-red-400";
  return "text-muted-foreground";
}

function metricLabel(flag: "cheap" | "fair" | "expensive"): string {
  if (flag === "cheap") return "CHEAP";
  if (flag === "expensive") return "EXPENSIVE";
  return "FAIR";
}

function dataTierIcon(tier: string | null, updatedAt: string | null): { icon: string; tooltip: string } {
  if (tier === "yahoo_auto") {
    const daysSince = updatedAt ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000) : 999;
    if (daysSince > 14) return { icon: "⚠️", tooltip: `Auto-fetched — stale (${daysSince}d ago)` };
    return { icon: "🔄", tooltip: `Auto-fetched from Yahoo (${updatedAt?.split("T")[0]})` };
  }
  if (tier === "claude_research") {
    const daysSince = updatedAt ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000) : 999;
    if (daysSince > 120) return { icon: "⚠️", tooltip: `AI-researched — stale (${daysSince}d ago)` };
    return { icon: "🔍", tooltip: `AI-researched (${updatedAt?.split("T")[0]})` };
  }
  return { icon: "⚠️", tooltip: "Missing or manual entry" };
}

export default function CopperEquityTiers({ equities, marketData, anchorResult, forces, jurisdictions, financials, onFinancialsUpdated }: Props) {
  const spotLb = Number(marketData.spot_price_lb);
  const incentiveLb = Number(marketData.incentive_price_tonne) / LBS_PER_TONNE;
  const forcesVerdict = useMemo(() => computeForcesVerdict(forces), [forces]);

  const financialsMap = useMemo(() => {
    const map = new Map<string, CopperEquityFinancial>();
    for (const f of financials) {
      if (!map.has(f.equity_id)) map.set(f.equity_id, f);
    }
    return map;
  }, [financials]);

  const valuationMap = useMemo(() => {
    const map = new Map<string, ValuationResult>();
    for (const eq of equities) {
      const fin = financialsMap.get(eq.id);
      if (fin) map.set(eq.id, computeValuation(fin, eq.tier));
    }
    return map;
  }, [equities, financialsMap]);

  const etfs = equities.filter(e => e.tier === "etf");
  const producers = equities.filter(e => e.tier === "producer");
  const developers = equities.filter(e => e.tier === "developer");
  const explorers = equities.filter(e => e.tier === "explorer");

  const compositeData = useMemo(() => {
    return equities.filter(e => e.tier !== "etf").map(eq => {
      const anchorScore = anchorResult.positioning.score;
      const forcesScore = forcesVerdict.score;
      const jurScore = jurisdictionScore(eq.jurisdictions);
      const val = valuationMap.get(eq.id);
      const valScore = val?.compositeAdjustment ?? 0;
      const composite = anchorScore + forcesScore + jurScore + valScore;
      const redFlags = val?.redFlags ?? [];
      const signal = compositeSignal(composite, redFlags);
      return { ...eq, anchorScore, forcesScore, jurScore, valScore, composite, signal, redFlags, hasFinancials: !!val };
    });
  }, [equities, anchorResult, forcesVerdict, valuationMap]);

  return (
    <div className="space-y-8">
      {/* Composite Signal Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-copper" />
            <CardTitle className="text-base">Composite Signal</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Ticker</TableHead>
                <TableHead className="text-xs text-center">Anchor</TableHead>
                <TableHead className="text-xs text-center">Forces</TableHead>
                <TableHead className="text-xs text-center">Juris.</TableHead>
                <TableHead className="text-xs text-center">Valuation</TableHead>
                <TableHead className="text-xs text-center">Composite</TableHead>
                <TableHead className="text-xs text-center">Signal</TableHead>
                <TableHead className="text-xs text-center">Cap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compositeData.map(cd => (
                <TableRow key={cd.id}>
                  <TableCell className="text-xs py-2 font-medium">
                    {cd.name}
                    {cd.redFlags.length > 0 && <span className="ml-1">⚠️</span>}
                  </TableCell>
                  <TableCell className="text-xs py-2 font-mono">{cd.ticker}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">{cd.anchorScore > 0 ? "+" : ""}{cd.anchorScore}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">{cd.forcesScore > 0 ? "+" : ""}{cd.forcesScore}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">{cd.jurScore}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">
                    {cd.hasFinancials ? (
                      <span>{cd.valScore > 0 ? "+" : ""}{cd.valScore.toFixed(1)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono font-bold">{cd.composite > 0 ? "+" : ""}{cd.composite.toFixed(1)}</TableCell>
                  <TableCell className="text-center py-2">
                    <Badge className={`text-[9px] ${cd.signal.color}`}>{cd.signal.text}</Badge>
                  </TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">{positionCapFromJurisdictions(cd.jurisdictions)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Jurisdiction Risk Table */}
      <div className="space-y-3">
        <h2 className="font-display text-xl text-copper">Jurisdiction Risk</h2>
        <CopperJurisdictionTable jurisdictions={jurisdictions} marketData={marketData} />
      </div>

      {/* ETF Tier */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-copper" />
          <h2 className="font-display text-lg text-copper">ETFs</h2>
        </div>
        <p className="text-xs text-muted-foreground">Core exposure before individual names.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {etfs.map(e => (
            <Card key={e.id} className="border-copper/20">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm">{e.ticker}</span>
                  <span className="text-[10px] text-muted-foreground">{e.exchange}</span>
                </div>
                <p className="text-xs font-medium">{e.name}</p>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  {e.expense_ratio != null && <span>TER: {e.expense_ratio}%</span>}
                  {e.aum_usd != null && <span>AUM: ${(e.aum_usd / 1e9).toFixed(1)}B</span>}
                  {e.is_ucits && <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-500">UCITS</Badge>}
                </div>
                {e.isin && <p className="text-[10px] text-muted-foreground font-mono">ISIN: {e.isin}</p>}
                {e.rationale && <p className="text-[10px] text-muted-foreground leading-relaxed">{e.rationale}</p>}
                {e.notes && <p className="text-[10px] text-muted-foreground/60 italic">{e.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="py-3 flex gap-2">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-blue-400">Spanish investors via MyInvestor:</strong> Use COPX UCITS (ISIN: IE0003Z9E2Y3). Accumulating, UCITS-compliant. COPJ has no UCITS equivalent — requires Interactive Brokers. ETFs do not qualify for <em>traspaso</em> under Spanish tax rules.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Producers */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-copper" />
          <h2 className="font-display text-lg text-copper">Tier 1 — Producers</h2>
        </div>
        <p className="text-xs text-muted-foreground">Producing today. Margin expansion plays. Direct leverage to copper price.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {producers.map(p => (
            <ProducerCard
              key={p.id}
              equity={p}
              spotLb={spotLb}
              incentiveLb={incentiveLb}
              financial={financialsMap.get(p.id) ?? null}
              valuation={valuationMap.get(p.id) ?? null}
              onResearchComplete={onFinancialsUpdated}
            />
          ))}
        </div>
      </div>

      {/* Developers */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-yellow-500" />
          <h2 className="font-display text-lg text-copper">Tier 2 — Developers</h2>
        </div>
        <p className="text-xs text-muted-foreground">Pre-production. Re-rating catalysts ahead.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {developers.map(d => (
            <DeveloperCard
              key={d.id}
              equity={d}
              financial={financialsMap.get(d.id) ?? null}
              onResearchComplete={onFinancialsUpdated}
            />
          ))}
        </div>
      </div>

      {/* Explorers */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-orange-500" />
          <h2 className="font-display text-lg text-copper">Tier 3 — Explorers</h2>
        </div>
        <p className="text-xs text-muted-foreground">Pre-resource or early resource. Binary outcomes. Small sizing only.</p>
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="py-2 flex gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-400">Hard cap: maximum 2% of copper equity sleeve per name, regardless of jurisdiction.</p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {explorers.map(e => (
            <DeveloperCard key={e.id} equity={e} financial={null} showResearch={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Research Confirmation Modal ──────────────────────────────────────

function ResearchModal({ open, onClose, equityName, ticker, data, onConfirm }: {
  open: boolean;
  onClose: () => void;
  equityName: string;
  ticker: string;
  data: Record<string, any>;
  onConfirm: (editedData: Record<string, any>) => void;
}) {
  const [editData, setEditData] = useState<Record<string, any>>(data);

  const updateField = (key: string, value: string) => {
    setEditData(prev => ({ ...prev, [key]: value === "" ? null : isNaN(Number(value)) ? value : Number(value) }));
  };

  const fields = Object.entries(editData).filter(([k]) => k !== "data_date" && k !== "source_url");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">AI Research: {equityName} ({ticker})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Review and edit before saving:</p>
          <div className="grid grid-cols-2 gap-2">
            {fields.map(([key, val]) => (
              <div key={key} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{key}</Label>
                <Input
                  value={val?.toString() ?? ""}
                  onChange={e => updateField(key, e.target.value)}
                  className="text-xs h-7"
                />
              </div>
            ))}
          </div>
          {editData.source_url && (
            <p className="text-[10px] text-muted-foreground">
              Source: <a href={editData.source_url} target="_blank" rel="noopener noreferrer" className="text-copper underline">{editData.source_url}</a>
            </p>
          )}
          {editData.data_date && (
            <p className="text-[10px] text-muted-foreground">Data as of: {editData.data_date}</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:bg-muted">Cancel</button>
          <button onClick={() => onConfirm(editData)} className="px-3 py-1.5 text-xs rounded bg-copper text-white hover:bg-copper/90">Confirm & Save</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Research Button Hook ──────────────────────────────────────

function useResearchEquity(equityId: string, equityName: string, ticker: string, onComplete?: () => void) {
  const [researching, setResearching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [researchData, setResearchData] = useState<Record<string, any> | null>(null);

  const startResearch = async () => {
    setResearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("research-copper-equity", {
        body: { equity_id: equityId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResearchData(data.research);
      setModalOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Research failed");
    } finally {
      setResearching(false);
    }
  };

  const confirmSave = async (editedData: Record<string, any>) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const row: Record<string, any> = {
        equity_id: equityId,
        as_of_date: today,
        data_tier: "claude_research",
        source: "AI Research (Gemini)",
        source_url: editedData.source_url || null,
        guidance_production: editedData.guidance_production || null,
        guidance_aisc: editedData.guidance_aisc || null,
        updated_at: new Date().toISOString(),
      };

      // Map producer fields
      if (editedData.aisc_lb != null) row.production_kt = editedData.production_kt ?? null;
      if (editedData.production_growth_pct != null) row.production_growth_pct = editedData.production_growth_pct;
      if (editedData.reserve_life_years != null) row.reserve_life_years = editedData.reserve_life_years;
      if (editedData.copper_revenue_pct != null) row.copper_revenue_pct = editedData.copper_revenue_pct;
      if (editedData.roic_pct != null) row.roic_pct = editedData.roic_pct;
      if (editedData.p_nav != null) row.p_nav = editedData.p_nav;
      if (editedData.ev_ebitda_forward != null) row.ev_ebitda_forward = editedData.ev_ebitda_forward;
      if (editedData.production_kt != null) row.production_kt = editedData.production_kt;

      // Developer fields mapped to same columns
      if (editedData.annual_production_kt != null) row.production_kt = editedData.annual_production_kt;

      const { error } = await supabase.from("copper_equity_financials").insert(row as any);
      if (error) throw error;

      // Update AISC on equity names if available
      if (editedData.aisc_lb != null) {
        await supabase
          .from("copper_equity_names")
          .update({
            aisc_lb: editedData.aisc_lb,
            aisc_source: editedData.data_date || "AI Research",
          } as any)
          .eq("id", equityId);
      }

      toast.success(`Research data saved for ${ticker}`);
      setModalOpen(false);
      onComplete?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to save research data");
    }
  };

  return { researching, modalOpen, researchData, startResearch, confirmSave, setModalOpen };
}

// ── Data Source Icon Component ──────────────────────────────────────

function DataSourceIcon({ tier, updatedAt }: { tier: string | null; updatedAt: string | null }) {
  const { icon, tooltip } = dataTierIcon(tier, updatedAt);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[9px] cursor-help">{icon}</span>
        </TooltipTrigger>
        <TooltipContent><p className="text-xs">{tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Producer Card ──────────────────────────────────────

function ProducerCard({ equity, spotLb, incentiveLb, financial, valuation, onResearchComplete }: {
  equity: CopperEquityName; spotLb: number; incentiveLb: number;
  financial: CopperEquityFinancial | null; valuation: ValuationResult | null;
  onResearchComplete?: () => void;
}) {
  const aisc = equity.aisc_lb;
  const currentMargin = aisc != null ? spotLb - aisc : null;
  const incentiveMargin = aisc != null ? incentiveLb - aisc : null;
  const marginExpansion = currentMargin && incentiveMargin && currentMargin > 0 ? incentiveMargin / currentMargin : null;
  const { researching, modalOpen, researchData, startResearch, confirmSave, setModalOpen } = useResearchEquity(equity.id, equity.name, equity.ticker, onResearchComplete);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono font-bold text-sm">{equity.ticker}</span>
            <span className="text-xs text-muted-foreground ml-2">{equity.exchange}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Cap: {equity.position_size_pct}%</span>
        </div>
        <p className="text-xs font-medium">{equity.name}</p>

        {/* Jurisdiction pills */}
        <div className="flex flex-wrap gap-1">
          {equity.jurisdictions?.map((j, i) => (
            <Badge key={i} variant="outline" className={`text-[9px] ${riskTagColor(j.risk_tag)}`}>
              {j.country} {j.risk_tag === "LOW" ? "🟢" : j.risk_tag === "MOD" ? "🟡" : j.risk_tag === "HIGH" ? "🟠" : "🔴"}
            </Badge>
          ))}
        </div>

        {/* Section A: Macro Signal — AISC + Margin */}
        {aisc != null && (
          <div className="bg-muted/30 rounded p-2 space-y-1">
            <p className="text-[10px] text-muted-foreground">
              AISC: <span className="font-mono font-medium text-foreground">${aisc.toFixed(2)}/lb</span>
              {equity.aisc_source && <span className="ml-1">({equity.aisc_source})</span>}
            </p>
            {currentMargin != null && incentiveMargin != null && marginExpansion != null && (
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-muted-foreground">
                  Margin: <span className="font-mono text-foreground">${currentMargin.toFixed(2)}/lb</span>
                  {" → "}At incentive: <span className="font-mono text-emerald-500">${incentiveMargin.toFixed(2)}/lb</span>
                  {" → "}<span className="font-mono font-bold text-emerald-400">{marginExpansion.toFixed(1)}× expansion</span>
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground/50 shrink-0 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px]">
                      <p className="text-xs">This shows how many times the miner's profit per pound grows if copper reaches incentive price. A 2.7× expansion means margins nearly triple. Lower AISC = bigger current margin = higher expansion multiple.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )}

        {/* Section B: Financials */}
        {financial && valuation ? (
          <div className="space-y-2">
            {/* Row 1: Valuation metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {valuation.metrics.map(m => (
                <div key={m.label} className="bg-muted/20 rounded p-1.5 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <p className="text-[9px] text-muted-foreground">{m.label}</p>
                    <DataSourceIcon
                      tier={m.label.includes("P/NAV") || m.label.includes("NTM") ? (financial.data_tier === "claude_research" ? "claude_research" : financial.data_tier) : "yahoo_auto"}
                      updatedAt={financial.updated_at}
                    />
                  </div>
                  <p className="font-mono text-xs font-bold">{m.value}</p>
                  <p className={`text-[8px] font-bold ${metricColor(m.flag)}`}>{metricLabel(m.flag)}</p>
                </div>
              ))}
            </div>

            {/* Row 2: Operational metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {financial.production_kt != null && (
                <div className="bg-muted/20 rounded p-1.5 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <p className="text-[9px] text-muted-foreground">Production</p>
                    <DataSourceIcon tier="claude_research" updatedAt={financial.updated_at} />
                  </div>
                  <p className="font-mono text-xs">{financial.production_kt} kt/yr</p>
                  {financial.guidance_production && (
                    <p className="text-[8px] text-muted-foreground/70">Guide: {financial.guidance_production}</p>
                  )}
                </div>
              )}
              {financial.production_growth_pct != null && (
                <div className="bg-muted/20 rounded p-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">Growth</p>
                  <p className="font-mono text-xs">{financial.production_growth_pct > 0 ? "+" : ""}{financial.production_growth_pct}%</p>
                </div>
              )}
              {financial.reserve_life_years != null && (
                <div className="bg-muted/20 rounded p-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">Reserve Life</p>
                  <p className="font-mono text-xs">{financial.reserve_life_years} years</p>
                </div>
              )}
              {financial.copper_revenue_pct != null && (
                <div className="bg-muted/20 rounded p-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">Cu Purity</p>
                  <p className="font-mono text-xs">{financial.copper_revenue_pct}%</p>
                </div>
              )}
            </div>

            {/* Row 3: ROIC + Insider */}
            <div className="flex flex-wrap gap-3 text-[10px]">
              {financial.roic_pct != null && (
                <span className="text-muted-foreground">
                  ROIC: <span className="font-mono text-foreground">{financial.roic_pct}%</span>
                  <DataSourceIcon tier="claude_research" updatedAt={financial.updated_at} />
                </span>
              )}
              {financial.insider_flag && (
                <span className="text-muted-foreground">
                  Insider: <span className={`font-mono ${financial.insider_flag === "BUYING" ? "text-emerald-400" : financial.insider_flag === "SELLING" ? "text-red-400" : "text-muted-foreground"}`}>
                    {financial.insider_flag === "BUYING" ? "NET BUYING ✅" : financial.insider_flag === "SELLING" ? "NET SELLING ⚠️" : "NEUTRAL"}
                  </span>
                  {financial.insider_net_buying_usd_m != null && (
                    <span className="text-muted-foreground/70"> (${Math.abs(financial.insider_net_buying_usd_m)}M, 12mo)</span>
                  )}
                  <DataSourceIcon tier="yahoo_auto" updatedAt={financial.updated_at} />
                </span>
              )}
            </div>

            {/* Guidance strings */}
            {(financial.guidance_aisc) && (
              <p className="text-[9px] text-muted-foreground/70">AISC Guidance: {financial.guidance_aisc}</p>
            )}

            {/* Valuation signal */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[9px] ${
                valuation.signal === "DEEP VALUE" || valuation.signal === "UNDERVALUED" ? "border-emerald-500/50 text-emerald-500" :
                valuation.signal === "OVERVALUED" || valuation.signal === "EXPENSIVE" ? "border-red-500/50 text-red-500" :
                "border-muted-foreground/50 text-muted-foreground"
              }`}>
                {valuation.signal}
              </Badge>
              <span className="text-[9px] text-muted-foreground">as of {financial.as_of_date}</span>
            </div>

            {/* Red flags */}
            {valuation.redFlags.length > 0 && (
              <div className="space-y-1">
                {valuation.redFlags.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span>{f.icon}</span>
                    <span className={f.cap ? "text-red-400 font-semibold" : "text-yellow-500"}>
                      {f.message}
                      {f.cap && ` — capped at ${f.cap}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {financial.source && (
              <p className="text-[9px] text-muted-foreground/50">
                Source: {financial.source}
                {financial.source_url && (
                  <> — <a href={financial.source_url} target="_blank" rel="noopener noreferrer" className="text-copper underline">View</a></>
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground/50 italic">
              {financial ? "Loading... (auto-fetch runs weekly)" : "Click 'Update Mining Data' to research"}
            </p>
          </div>
        )}

        {/* Row 4: Research button */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/30">
          <button
            onClick={startResearch}
            disabled={researching}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded bg-copper/10 text-copper hover:bg-copper/20 disabled:opacity-50 transition-colors"
          >
            {researching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            {researching ? "Researching..." : "Update Mining Data 🔍"}
          </button>
          {financial?.data_tier === "claude_research" && financial.as_of_date && (
            <span className="text-[9px] text-muted-foreground">Last researched: {financial.as_of_date}</span>
          )}
        </div>

        {equity.rationale && <p className="text-[10px] text-muted-foreground leading-relaxed">{equity.rationale}</p>}
      </CardContent>

      {/* Research confirmation modal */}
      {researchData && (
        <ResearchModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          equityName={equity.name}
          ticker={equity.ticker}
          data={researchData}
          onConfirm={confirmSave}
        />
      )}
    </Card>
  );
}

// ── Developer Card ──────────────────────────────────────

function DeveloperCard({ equity, financial, onResearchComplete, showResearch = true }: {
  equity: CopperEquityName; financial: CopperEquityFinancial | null;
  onResearchComplete?: () => void;
  showResearch?: boolean;
}) {
  const { researching, modalOpen, researchData, startResearch, confirmSave, setModalOpen } = useResearchEquity(equity.id, equity.name, equity.ticker, onResearchComplete);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono font-bold text-sm">{equity.ticker}</span>
            <span className="text-xs text-muted-foreground ml-2">{equity.exchange}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Cap: {equity.position_size_pct}%</span>
        </div>
        <p className="text-xs font-medium">{equity.name}</p>

        <div className="flex flex-wrap gap-1">
          {equity.jurisdictions?.map((j, i) => (
            <Badge key={i} variant="outline" className={`text-[9px] ${riskTagColor(j.risk_tag)}`}>
              {j.country} {j.risk_tag === "LOW" ? "🟢" : j.risk_tag === "MOD" ? "🟡" : j.risk_tag === "HIGH" ? "🟠" : "🔴"}
            </Badge>
          ))}
        </div>

        {equity.stage && <p className="text-[10px] text-muted-foreground">Stage: {equity.stage}</p>}
        {equity.key_catalyst && (
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-muted-foreground">Catalyst: {equity.key_catalyst}</p>
            {catalystBadge(equity.catalyst_status)}
          </div>
        )}

        {/* P/NAV if available from financials */}
        {financial?.p_nav != null && (
          <div className="bg-muted/20 rounded p-1.5 inline-block">
            <span className="text-[9px] text-muted-foreground">P/NAV: </span>
            <span className="font-mono text-xs font-bold">{financial.p_nav.toFixed(2)}×</span>
          </div>
        )}

        {/* Research button for developers (not explorers) */}
        {showResearch && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/30">
            <button
              onClick={startResearch}
              disabled={researching}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded bg-copper/10 text-copper hover:bg-copper/20 disabled:opacity-50 transition-colors"
            >
              {researching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              {researching ? "Researching..." : "Update Mining Data 🔍"}
            </button>
          </div>
        )}

        {equity.rationale && <p className="text-[10px] text-muted-foreground leading-relaxed">{equity.rationale}</p>}
      </CardContent>

      {researchData && (
        <ResearchModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          equityName={equity.name}
          ticker={equity.ticker}
          data={researchData}
          onConfirm={confirmSave}
        />
      )}
    </Card>
  );
}
