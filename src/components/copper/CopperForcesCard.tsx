import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap } from "lucide-react";
import type { CopperForce } from "@/lib/copperDataFetcher";

interface Props {
  forces: CopperForce[];
}

function directionIcon(d: string | null) {
  if (d === "improving") return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (d === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function directionLabel(d: string | null) {
  if (d === "improving") return "⬆ Improving";
  if (d === "declining") return "⬇ Declining";
  return "➡ Stable";
}

export function computeForcesVerdict(forces: CopperForce[]): { text: string; score: number; color: string } {
  const improving = forces.filter(f => f.direction === "improving").length;
  if (improving >= 8) return { text: "STRONG TAILWIND", score: 2, color: "text-emerald-400" };
  if (improving >= 6) return { text: "TAILWIND", score: 1, color: "text-emerald-500" };
  if (improving >= 4) return { text: "MIXED", score: 0, color: "text-yellow-500" };
  return { text: "HEADWIND", score: -1, color: "text-red-500" };
}

export default function CopperForcesCard({ forces }: Props) {
  const verdict = useMemo(() => computeForcesVerdict(forces), [forces]);
  const demandForces = forces.filter(f => f.category === "demand");
  const supplyForces = forces.filter(f => f.category === "supply");

  return (
    <div className="space-y-4">
      {/* Verdict Banner */}
      <Card className="border-copper/30 bg-copper/5">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-copper" />
            <span className="text-sm font-medium text-muted-foreground">Forces Verdict</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-display text-lg font-bold ${verdict.color}`}>{verdict.text}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {forces.filter(f => f.direction === "improving").length}/{forces.length} improving
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Demand Grid */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Demand Drivers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {demandForces.map(f => (
            <ForceCard key={f.id} force={f} />
          ))}
        </div>
      </div>

      {/* Supply Grid */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Supply Dynamics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {supplyForces.map(f => (
            <ForceCard key={f.id} force={f} />
          ))}
        </div>
      </div>

      {/* Honesty Note */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-yellow-500">D4 (China demand growth halving)</strong> is the most important near-term risk. China consumes over 55% of global copper. If China enters a sustained construction downturn, near-term prices face pressure — even if the structural thesis remains valid.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ForceCard({ force }: { force: CopperForce }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold leading-tight">{force.metric_name}</span>
          {directionIcon(force.direction)}
        </div>
        <p className="text-sm font-mono text-foreground">{force.current_value}</p>
        {force.prior_value && (
          <p className="text-xs text-muted-foreground">Prior: {force.prior_value}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/70">{force.source}</span>
          <span className={`text-[10px] font-medium ${
            force.direction === "improving" ? "text-emerald-500" :
            force.direction === "declining" ? "text-red-500" : "text-muted-foreground"
          }`}>
            {directionLabel(force.direction)}
          </span>
        </div>
        {force.notes && (
          <p className="text-[10px] text-muted-foreground/60 italic leading-tight">{force.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
