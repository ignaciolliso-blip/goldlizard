import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, HardHat, Search, Layers, Info, AlertTriangle } from "lucide-react";
import { LBS_PER_TONNE } from "@/lib/copperEngine";
import type { CopperEquityName, CopperMarketData, CopperJurisdiction } from "@/lib/copperDataFetcher";
import type { CopperAnchorResult } from "@/lib/copperEngine";
import { computeForcesVerdict } from "./CopperForcesCard";
import type { CopperForce } from "@/lib/copperDataFetcher";

interface Props {
  equities: CopperEquityName[];
  marketData: CopperMarketData;
  anchorResult: CopperAnchorResult;
  forces: CopperForce[];
  jurisdictions: CopperJurisdiction[];
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
  const worst = jurs.reduce((w, j) => {
    const s = j.risk_tag === "VERY_HIGH" ? -1.5 : j.risk_tag === "HIGH" ? -1 : j.risk_tag === "MOD" ? -0.5 : 0;
    return Math.min(w, s);
  }, 0);
  return worst;
}

function compositeSignal(score: number): { text: string; color: string } {
  if (score >= 4) return { text: "STRONG BUY", color: "bg-emerald-600 text-white" };
  if (score >= 2.5) return { text: "BUY", color: "bg-emerald-500 text-white" };
  if (score >= 1) return { text: "ACCUMULATE ON WEAKNESS", color: "bg-yellow-500 text-black" };
  if (score >= -0.5) return { text: "HOLD / WATCH", color: "bg-muted text-muted-foreground" };
  return { text: "REDUCE / AVOID", color: "bg-red-500 text-white" };
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
  const hasVeryHigh = jurs.some(j => j.risk_tag === "VERY_HIGH");
  const hasHigh = jurs.some(j => j.risk_tag === "HIGH");
  const hasMod = jurs.some(j => j.risk_tag === "MOD");
  if (hasVeryHigh) return "25%";
  if (hasHigh) return "50%";
  if (hasMod) return "75%";
  return "100%";
}

export default function CopperEquityTiers({ equities, marketData, anchorResult, forces, jurisdictions }: Props) {
  const spotLb = Number(marketData.spot_price_lb);
  const incentiveLb = Number(marketData.incentive_price_tonne) / LBS_PER_TONNE;
  const forcesVerdict = useMemo(() => computeForcesVerdict(forces), [forces]);

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
      const valScore = 0; // Will come from copper_equity_financials later
      const composite = anchorScore + forcesScore + jurScore + valScore;
      const signal = compositeSignal(composite);
      return { ...eq, anchorScore, forcesScore, jurScore, valScore, composite, signal };
    });
  }, [equities, anchorResult, forcesVerdict]);

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
                <TableHead className="text-xs text-center">Jurisdiction</TableHead>
                <TableHead className="text-xs text-center">Valuation</TableHead>
                <TableHead className="text-xs text-center">Composite</TableHead>
                <TableHead className="text-xs text-center">Signal</TableHead>
                <TableHead className="text-xs text-center">Cap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compositeData.map(cd => (
                <TableRow key={cd.id}>
                  <TableCell className="text-xs py-2 font-medium">{cd.name}</TableCell>
                  <TableCell className="text-xs py-2 font-mono">{cd.ticker}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">{cd.anchorScore > 0 ? "+" : ""}{cd.anchorScore}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">{cd.forcesScore > 0 ? "+" : ""}{cd.forcesScore}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">{cd.jurScore}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono text-muted-foreground">—</TableCell>
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

        {/* Spanish Investor Guidance */}
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
            <ProducerCard key={p.id} equity={p} spotLb={spotLb} incentiveLb={incentiveLb} />
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
            <DeveloperCard key={d.id} equity={d} />
          ))}
        </div>
      </div>

      {/* Explorers */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-orange-500" />
          <h2 className="font-display text-lg text-copper">Tier 3 — Explorers</h2>
        </div>
        <p className="text-xs text-muted-foreground">Pre-resource or early resource. Binary outcomes. Small sizing only. Options on discovery, not investments in cash flows.</p>
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="py-2 flex gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-400">Hard cap: maximum 2% of copper equity sleeve per name, regardless of jurisdiction.</p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {explorers.map(e => (
            <DeveloperCard key={e.id} equity={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProducerCard({ equity, spotLb, incentiveLb }: { equity: CopperEquityName; spotLb: number; incentiveLb: number }) {
  const aisc = equity.aisc_lb;
  const currentMargin = aisc != null ? spotLb - aisc : null;
  const incentiveMargin = aisc != null ? incentiveLb - aisc : null;
  const marginExpansion = currentMargin && incentiveMargin && currentMargin > 0 ? incentiveMargin / currentMargin : null;

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

        {/* Jurisdiction pills */}
        <div className="flex flex-wrap gap-1">
          {equity.jurisdictions?.map((j, i) => (
            <Badge key={i} variant="outline" className={`text-[9px] ${riskTagColor(j.risk_tag)}`}>
              {j.country} {j.risk_tag === "LOW" ? "🟢" : j.risk_tag === "MOD" ? "🟡" : j.risk_tag === "HIGH" ? "🟠" : "🔴"}
            </Badge>
          ))}
        </div>

        {/* AISC + Margin */}
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

        {equity.rationale && <p className="text-[10px] text-muted-foreground leading-relaxed">{equity.rationale}</p>}
      </CardContent>
    </Card>
  );
}

function DeveloperCard({ equity }: { equity: CopperEquityName }) {
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

        {/* Jurisdiction pills */}
        <div className="flex flex-wrap gap-1">
          {equity.jurisdictions?.map((j, i) => (
            <Badge key={i} variant="outline" className={`text-[9px] ${riskTagColor(j.risk_tag)}`}>
              {j.country} {j.risk_tag === "LOW" ? "🟢" : j.risk_tag === "MOD" ? "🟡" : j.risk_tag === "HIGH" ? "🟠" : "🔴"}
            </Badge>
          ))}
        </div>

        {/* Stage + Catalyst */}
        {equity.stage && (
          <p className="text-[10px] text-muted-foreground">Stage: {equity.stage}</p>
        )}
        {equity.key_catalyst && (
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-muted-foreground">Catalyst: {equity.key_catalyst}</p>
            {catalystBadge(equity.catalyst_status)}
          </div>
        )}

        {equity.rationale && <p className="text-[10px] text-muted-foreground leading-relaxed">{equity.rationale}</p>}
      </CardContent>
    </Card>
  );
}
