import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Briefcase, HardHat, Search, Layers, Info, AlertTriangle, HelpCircle } from "lucide-react";
import { LBS_PER_TONNE } from "@/lib/copperEngine";
import CopperJurisdictionTable from "./CopperJurisdictionTable";
import { computeValuation, type ValuationResult } from "@/lib/copperValuationEngine";
import type { CopperEquityName, CopperMarketData, CopperJurisdiction, CopperForce, CopperEquityFinancial } from "@/lib/copperDataFetcher";
import type { CopperAnchorResult } from "@/lib/copperEngine";
import { computeForcesVerdict } from "./CopperForcesCard";

interface Props {
  equities: CopperEquityName[];
  marketData: CopperMarketData;
  anchorResult: CopperAnchorResult;
  forces: CopperForce[];
  jurisdictions: CopperJurisdiction[];
  financials: CopperEquityFinancial[];
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
  // Apply red flag caps
  const caps = redFlags.filter(f => f.cap).map(f => f.cap!);
  let result: { text: string; color: string };
  if (score >= 4) result = { text: "STRONG BUY", color: "bg-emerald-600 text-white" };
  else if (score >= 2.5) result = { text: "BUY", color: "bg-emerald-500 text-white" };
  else if (score >= 1) result = { text: "ACCUMULATE ON WEAKNESS", color: "bg-yellow-500 text-black" };
  else if (score >= -0.5) result = { text: "HOLD / WATCH", color: "bg-muted text-muted-foreground" };
  else result = { text: "REDUCE / AVOID", color: "bg-red-500 text-white" };

  // Apply caps
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

export default function CopperEquityTiers({ equities, marketData, anchorResult, forces, jurisdictions, financials }: Props) {
  const spotLb = Number(marketData.spot_price_lb);
  const incentiveLb = Number(marketData.incentive_price_tonne) / LBS_PER_TONNE;
  const forcesVerdict = useMemo(() => computeForcesVerdict(forces), [forces]);

  // Build financials map: equity_id → most recent financial
  const financialsMap = useMemo(() => {
    const map = new Map<string, CopperEquityFinancial>();
    // Already sorted desc by as_of_date, so first match per equity_id is most recent
    for (const f of financials) {
      if (!map.has(f.equity_id)) map.set(f.equity_id, f);
    }
    return map;
  }, [financials]);

  // Valuation map
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

  // Composite scores
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
            <DeveloperCard key={d.id} equity={d} financial={financialsMap.get(d.id) ?? null} />
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
            <DeveloperCard key={e.id} equity={e} financial={null} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProducerCard({ equity, spotLb, incentiveLb, financial, valuation }: {
  equity: CopperEquityName; spotLb: number; incentiveLb: number;
  financial: CopperEquityFinancial | null; valuation: ValuationResult | null;
}) {
  const aisc = equity.aisc_lb;
  const currentMargin = aisc != null ? spotLb - aisc : null;
  const incentiveMargin = aisc != null ? incentiveLb - aisc : null;
  const marginExpansion = currentMargin && incentiveMargin && currentMargin > 0 ? incentiveMargin / currentMargin : null;

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
              <p className="text-[10px] text-muted-foreground">
                Margin: <span className="font-mono text-foreground">${currentMargin.toFixed(2)}/lb</span>
                {" → "}At incentive: <span className="font-mono text-emerald-500">${incentiveMargin.toFixed(2)}/lb</span>
                {" → "}<span className="font-mono font-bold text-emerald-400">{marginExpansion.toFixed(1)}× expansion</span>
              </p>
            )}
          </div>
        )}

        {/* Section B: Financials */}
        {financial && valuation ? (
          <div className="space-y-2">
            {/* Valuation metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {valuation.metrics.map(m => (
                <div key={m.label} className="bg-muted/20 rounded p-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">{m.label}</p>
                  <p className="font-mono text-xs font-bold">{m.value}</p>
                  <p className={`text-[8px] font-bold ${metricColor(m.flag)}`}>{metricLabel(m.flag)}</p>
                </div>
              ))}
            </div>

            {/* Operational metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {financial.production_kt != null && (
                <div className="bg-muted/20 rounded p-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">Production</p>
                  <p className="font-mono text-xs">{financial.production_kt} kt/yr</p>
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

            {/* ROIC + Insider */}
            <div className="flex flex-wrap gap-3 text-[10px]">
              {financial.roic_pct != null && (
                <span className="text-muted-foreground">ROIC: <span className="font-mono text-foreground">{financial.roic_pct}%</span></span>
              )}
              {financial.insider_flag && (
                <span className="text-muted-foreground">
                  Insider: <span className={`font-mono ${financial.insider_flag === "BUYING" ? "text-emerald-400" : financial.insider_flag === "SELLING" ? "text-red-400" : "text-muted-foreground"}`}>
                    {financial.insider_flag === "BUYING" ? "NET BUYING ✅" : financial.insider_flag === "SELLING" ? "NET SELLING ⚠️" : "NEUTRAL"}
                  </span>
                  {financial.insider_net_buying_usd_m != null && (
                    <span className="text-muted-foreground/70"> (${Math.abs(financial.insider_net_buying_usd_m)}M, 12mo)</span>
                  )}
                </span>
              )}
            </div>

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
              <p className="text-[9px] text-muted-foreground/50">Source: {financial.source}</p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/50 italic">Financial metrics pending — populate via Data Management after next earnings cycle.</p>
        )}

        {equity.rationale && <p className="text-[10px] text-muted-foreground leading-relaxed">{equity.rationale}</p>}
      </CardContent>
    </Card>
  );
}

function DeveloperCard({ equity, financial }: { equity: CopperEquityName; financial: CopperEquityFinancial | null }) {
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

        {equity.rationale && <p className="text-[10px] text-muted-foreground leading-relaxed">{equity.rationale}</p>}
      </CardContent>
    </Card>
  );
}
