import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, MapPin, AlertTriangle, Info } from "lucide-react";
import type { CopperJurisdiction, CopperMarketData } from "@/lib/copperDataFetcher";

interface Props {
  jurisdictions: CopperJurisdiction[];
  marketData: CopperMarketData | null;
}

function riskBadge(tag: string, color: string | null) {
  const emoji = tag === "LOW" ? "🟢" : tag === "MOD" ? "🟡" : tag === "HIGH" ? "🟠" : "🔴";
  return (
    <Badge
      variant="outline"
      className="font-mono text-[10px] px-2"
      style={{ borderColor: color || undefined, color: color || undefined }}
    >
      {emoji} {tag}
    </Badge>
  );
}

function positionCap(tag: string): string {
  if (tag === "LOW") return "100%";
  if (tag === "MOD") return "75%";
  if (tag === "HIGH") return "50%";
  return "25%";
}

export default function CopperJurisdictionTable({ jurisdictions, marketData }: Props) {
  const [expandedNarrative, setExpandedNarrative] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-copper" />
            <CardTitle className="text-base">Jurisdiction Risk Matrix</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Fraser Institute Annual Survey {marketData?.fraser_survey_year || "2025"} + operational risk overlay
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Country</TableHead>
                <TableHead className="text-xs">Fraser Rank</TableHead>
                <TableHead className="text-xs">Key Risk Vector</TableHead>
                <TableHead className="text-xs text-center">Risk</TableHead>
                <TableHead className="text-xs text-center">Position Cap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jurisdictions.map(j => (
                <TableRow
                  key={j.id}
                  className={j.narrative ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => j.narrative && setExpandedNarrative(expandedNarrative === j.id ? null : j.id)}
                >
                  <TableCell className="font-medium text-xs py-2">{j.country}</TableCell>
                  <TableCell className="text-xs py-2 text-muted-foreground">{j.fraser_rank_text || "—"}</TableCell>
                  <TableCell className="text-xs py-2 text-muted-foreground max-w-[200px]">{j.key_risk_vector || "—"}</TableCell>
                  <TableCell className="text-center py-2">{riskBadge(j.risk_tag, j.risk_color)}</TableCell>
                  <TableCell className="text-center py-2 font-mono text-xs">{positionCap(j.risk_tag)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expanded Narrative */}
      {expandedNarrative && (() => {
        const j = jurisdictions.find(x => x.id === expandedNarrative);
        if (!j?.narrative) return null;
        return (
          <Card className="border-copper/20 bg-copper/5">
            <CardContent className="py-3">
              <p className="text-xs font-semibold text-copper mb-1">{j.country}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{j.narrative}</p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Disclaimer */}
      <div className="flex gap-2 px-1">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Jurisdiction risk affects position sizing, not thesis validity. A 🔴 jurisdiction with a world-class asset is not uninvestable — it requires a different risk budget.
        </p>
      </div>
    </div>
  );
}
