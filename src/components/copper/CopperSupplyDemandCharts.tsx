import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BarChart3 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label, Legend, Cell,
} from "recharts";
import type { CopperSupplyDemandRow } from "@/lib/copperDataFetcher";

interface Props {
  data: CopperSupplyDemandRow[];
}

// Linear interpolation to fill gaps between anchor years
function interpolateYears(rows: CopperSupplyDemandRow[]): CopperSupplyDemandRow[] {
  if (rows.length < 2) return rows;
  const result: CopperSupplyDemandRow[] = [];
  const numFields: (keyof CopperSupplyDemandRow)[] = [
    "demand_core_mt", "demand_ev_mt", "demand_grid_mt", "demand_renewables_mt",
    "demand_data_centers_mt", "demand_defense_mt", "demand_total_mt",
    "supply_primary_mt", "supply_secondary_mt", "supply_total_mt",
    "annual_balance_mt", "cumulative_deficit_mt",
  ];

  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    result.push(a);
    const gap = b.year - a.year;
    for (let y = 1; y < gap; y++) {
      const t = y / gap;
      const interp: any = { ...a, year: a.year + y, id: `interp-${a.year + y}`, source: "Interpolated" };
      for (const f of numFields) {
        const va = a[f] as number | null;
        const vb = b[f] as number | null;
        if (va != null && vb != null) {
          interp[f] = Math.round((va + (vb - va) * t) * 100) / 100;
        }
      }
      result.push(interp);
    }
  }
  result.push(rows[rows.length - 1]);
  return result;
}

const DEMAND_COLORS: Record<string, string> = {
  demand_core_mt: "hsl(220, 10%, 55%)",
  demand_ev_mt: "hsl(142, 60%, 45%)",
  demand_grid_mt: "hsl(40, 90%, 50%)",
  demand_renewables_mt: "hsl(175, 60%, 45%)",
  demand_data_centers_mt: "hsl(270, 60%, 55%)",
  demand_defense_mt: "hsl(0, 70%, 55%)",
};

const DEMAND_LABELS: Record<string, string> = {
  demand_core_mt: "Core Economic",
  demand_ev_mt: "EVs",
  demand_grid_mt: "Grid / T&D",
  demand_renewables_mt: "Renewables",
  demand_data_centers_mt: "Data Centers",
  demand_defense_mt: "Defense",
};

function SupplyDemandTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs space-y-2 max-w-[220px]">
      <p className="font-bold text-foreground">{label}</p>
      <div>
        <p className="text-muted-foreground font-semibold mb-1">Demand ({row.demand_total_mt?.toFixed(1)} Mt)</p>
        {Object.entries(DEMAND_LABELS).map(([k, label]) => (
          <div key={k} className="flex justify-between gap-3">
            <span style={{ color: DEMAND_COLORS[k] }}>{label}</span>
            <span className="font-mono">{row[k]?.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <div>
        <p className="text-muted-foreground font-semibold mb-1">Supply ({row.supply_total_mt?.toFixed(1)} Mt)</p>
        <div className="flex justify-between gap-3">
          <span className="text-blue-400">Primary</span>
          <span className="font-mono">{row.supply_primary_mt?.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-blue-300">Secondary</span>
          <span className="font-mono">{row.supply_secondary_mt?.toFixed(1)}</span>
        </div>
      </div>
      {row.annual_balance_mt != null && (
        <div className={`font-semibold ${row.annual_balance_mt < 0 ? "text-red-400" : "text-emerald-400"}`}>
          Balance: {row.annual_balance_mt > 0 ? "+" : ""}{row.annual_balance_mt.toFixed(1)} Mt
        </div>
      )}
    </div>
  );
}

function DeficitTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
      <p className="font-bold">{label}</p>
      <p className="font-mono text-red-400">{val?.toFixed(1)} Mt cumulative</p>
    </div>
  );
}

export default function CopperSupplyDemandCharts({ data }: Props) {
  const [scenario, setScenario] = useState("base");

  const chartData = useMemo(() => {
    const filtered = data.filter(d => d.scenario === scenario);
    return interpolateYears(filtered);
  }, [data, scenario]);

  const hasMultipleScenarios = useMemo(() => {
    const scenarios = new Set(data.map(d => d.scenario));
    return scenarios.size > 1;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Honesty Callout */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-yellow-500">Near-term (2025–2026):</strong> The refined copper market may be in modest surplus due to Chinese smelter expansion. ICSG projects +289kt surplus in 2025. This contradicts the deficit thesis in the short term. The structural deficit emerges from 2027 onward as demand growth outpaces new mine capacity. Meridian's thesis is structural (5–15 year), not a near-term trading call.
          </p>
        </CardContent>
      </Card>

      {/* Scenario Toggle */}
      {hasMultipleScenarios && (
        <div className="flex gap-2">
          {["base", "iea_high"].map(s => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                scenario === s
                  ? "bg-copper/20 border-copper text-copper"
                  : "border-border text-muted-foreground hover:border-copper/50"
              }`}
            >
              {s === "base" ? "S&P Global Base Case" : "IEA High Case"}
            </button>
          ))}
        </div>
      )}

      {/* Chart A: Supply vs Demand */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-copper" />
            <CardTitle className="text-base">Supply vs. Demand — {scenario === "base" ? "S&P Global Base Case" : "IEA High Case"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={v => `${v}Mt`}
                domain={[0, "auto"]}
              />
              <Tooltip content={<SupplyDemandTooltip />} />

              {/* Supply areas */}
              <Area
                type="monotone" dataKey="supply_primary_mt" stackId="supply"
                fill="hsl(210, 50%, 40%)" stroke="hsl(210, 50%, 50%)" fillOpacity={0.7}
                name="Primary Supply"
              />
              <Area
                type="monotone" dataKey="supply_secondary_mt" stackId="supply"
                fill="hsl(210, 40%, 60%)" stroke="hsl(210, 40%, 65%)" fillOpacity={0.5}
                name="Secondary Supply"
              />

              {/* Demand line on top */}
              <Area
                type="monotone" dataKey="demand_total_mt"
                fill="hsl(0, 60%, 50%)" stroke="hsl(0, 60%, 55%)" fillOpacity={0.15}
                name="Total Demand" strokeWidth={2} strokeDasharray="5 3"
              />

              <ReferenceLine x={2030} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3">
                <Label value="Supply peak" position="top" fontSize={10} fill="hsl(var(--muted-foreground))" />
              </ReferenceLine>

              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                iconType="rect" iconSize={8}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Demand breakdown legend */}
          <div className="flex flex-wrap gap-3 mt-3 px-2">
            {Object.entries(DEMAND_LABELS).map(([k, label]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DEMAND_COLORS[k] }} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart B: Cumulative Deficit */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-red-500" />
            <CardTitle className="text-base">Cumulative Deficit</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={v => `${v}Mt`}
              />
              <Tooltip content={<DeficitTooltip />} />
              <Bar dataKey="cumulative_deficit_mt" name="Cumulative Deficit" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      (entry.cumulative_deficit_mt ?? 0) >= 0
                        ? "hsl(142, 50%, 45%)"
                        : `hsl(0, ${Math.min(80, 40 + Math.abs(entry.cumulative_deficit_mt ?? 0))}%, 50%)`
                    }
                  />
                ))}
              </Bar>
              <ReferenceLine x={2030} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3">
                <Label value="Supply peak" position="top" fontSize={10} fill="hsl(var(--muted-foreground))" />
              </ReferenceLine>
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            ~93Mt cumulative deficit projected by 2040 under base case
          </p>
        </CardContent>
      </Card>

      {/* Source Notes */}
      <div className="space-y-1 px-1">
        <p className="text-[10px] text-muted-foreground/70 italic">Primary mine supply peaks at ~24.5Mt in 2030, then declines to ~22Mt by 2035–2040 as ore grades fall and mines deplete. Range across sources: 24–27Mt peak (S&P Global, IEA, Wood Mackenzie).</p>
        <p className="text-[10px] text-muted-foreground/70 italic">Secondary supply (scrap/recycling) doubles from ~4.5Mt to ~10Mt by 2040 per S&P Global. Cannot close the gap alone.</p>
        <p className="text-[10px] text-muted-foreground/70 italic">EV demand: 2.6Mt (2025) → 6.3Mt (2040) at 5.8% CAGR. S&P Global includes charging infrastructure copper.</p>
        <p className="text-[10px] text-muted-foreground/70 italic">Data center demand is the most uncertain variable: IEA range is 250–550kt by 2030. Table uses mid-range estimates.</p>
        <p className="text-[10px] text-muted-foreground/70 italic">S&P Global total demand is 42Mt by 2040; this table's build-up sums to 43.4Mt. The ~1.4Mt difference is within the data center uncertainty band.</p>
      </div>
    </div>
  );
}
