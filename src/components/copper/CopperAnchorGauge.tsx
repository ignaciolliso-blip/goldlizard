import type { CopperAnchorResult } from "@/lib/copperEngine";
import type { CopperMarketData } from "@/lib/copperDataFetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Anchor } from "lucide-react";

interface Props {
  anchor: CopperAnchorResult;
  marketData: CopperMarketData;
}

const colorMap: Record<string, string> = {
  bullish: "text-bullish border-bullish/30",
  bearish: "text-bearish border-bearish/30",
  neutral: "text-neutral border-neutral/30",
};

export default function CopperAnchorGauge({ anchor, marketData }: Props) {
  const { spotTonne, aiscTonne, incentiveTonne, anchorGapPct, upsidePct, positioning } = anchor;
  const range = incentiveTonne - aiscTonne;
  const spotPct = range > 0 ? Math.max(0, Math.min(100, ((spotTonne - aiscTonne) / range) * 100)) : 50;

  // Zone boundaries: green <40%, amber 40-70%, red >70%
  const zoneColors = [
    { pct: 40, label: "Cheap", cls: "bg-bullish/30" },
    { pct: 70, label: "Fair", cls: "bg-neutral/30" },
    { pct: 100, label: "Expensive", cls: "bg-bearish/30" },
  ];

  return (
    <Card className="border-copper/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Anchor size={18} className="text-copper" />
          <span>Incentive Price Parity</span>
          <span className={`ml-auto text-sm font-semibold px-2 py-0.5 rounded border ${colorMap[positioning.color] || "text-muted-foreground"}`}>
            {positioning.text}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Horizontal gauge */}
        <div className="space-y-2">
          <div className="relative h-8 rounded-md overflow-hidden flex">
            {zoneColors.map((z, i) => {
              const prev = i === 0 ? 0 : zoneColors[i - 1].pct;
              return (
                <div key={z.label} className={`${z.cls} h-full`} style={{ width: `${z.pct - prev}%` }} />
              );
            })}
            {/* Spot marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-foreground"
              style={{ left: `${spotPct}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-copper font-semibold">
                SPOT
              </div>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-muted-foreground">
                ${spotTonne.toLocaleString()}/t
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-6">
            <span>90th pctile AISC: ${aiscTonne.toLocaleString()}/t</span>
            <span>Incentive price: ${incentiveTonne.toLocaleString()}/t</span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-mono font-bold text-copper">{anchorGapPct}%</div>
            <div className="text-xs text-muted-foreground">Anchor Gap</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-bullish">{upsidePct}%</div>
            <div className="text-xs text-muted-foreground">Upside to Incentive</div>
          </div>
          {marketData.deficit_current_year_kt && (
            <div>
              <div className="text-2xl font-mono font-bold text-foreground">{Number(marketData.deficit_current_year_kt)}kt</div>
              <div className="text-xs text-muted-foreground">Proj. Deficit</div>
            </div>
          )}
        </div>

        {/* Narrative */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Copper trades at ${Number(marketData.spot_price_lb).toFixed(2)}/lb (${spotTonne.toLocaleString()}/t),
          which is {anchorGapPct}% below the estimated greenfield incentive price of ${incentiveTonne.toLocaleString()}/t.
          The market is pricing copper as though existing mines can meet future demand. They cannot — new mine
          development requires approximately ${incentiveTonne.toLocaleString()}/t to be economically viable,
          implying {upsidePct}% upside to incentive parity.
          {marketData.deficit_source && (
            <span className="text-[10px] ml-1">({marketData.deficit_source})</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
