import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, BookOpen } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function CopperHowToRead() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-copper/20">
        <CollapsibleTrigger className="w-full">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <BookOpen size={16} className="text-copper shrink-0" />
            <span className="text-sm font-medium text-copper">How to Read This Page</span>
            <ChevronDown size={14} className={`ml-auto text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-5 text-sm text-muted-foreground leading-relaxed">
            {/* Three Questions */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">The Three Questions This Page Answers</h3>
              <ol className="list-decimal pl-5 space-y-1 text-xs">
                <li><strong className="text-foreground">Is copper cheap or expensive right now?</strong> → The Anchor gauge</li>
                <li><strong className="text-foreground">Are structural conditions getting better or worse?</strong> → The Forces scorecard + Supply-Demand charts</li>
                <li><strong className="text-foreground">What should I buy, how much, and when?</strong> → The Composite Signal dashboard + equity cards</li>
              </ol>
            </div>

            {/* Reading Order */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Reading Order</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-foreground">Step 1: Anchor Gauge</p>
                  <p>The Anchor Gap % tells you how far copper is below the price needed to build new mines. Gap &gt; 40% = the opportunity is large. Gap &lt; 25% = consider taking profits.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Step 2: Supply-Demand Charts</p>
                  <p>Chart A shows demand (stacked by sector) against supply (mine + scrap). The red shaded gap is the deficit. Chart B shows the cumulative total — this is the chart that makes the scale of the problem visible. Read the honesty callout above Chart A: the near-term refined market may actually be in surplus. The structural deficit is a 2027+ story.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Step 3: Forces Scorecard</p>
                  <p>10 metrics with arrows. The verdict counts improving arrows. 8+ of 10 = STRONG TAILWIND. Watch D4 (China demand) — it's the single most important near-term metric since China is 55%+ of global consumption.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Step 4: Composite Signal Dashboard</p>
                  <p>The decision table. Every equity name has a score combining Anchor (is copper cheap?) + Forces (conditions?) + Jurisdiction (country risk?) + Valuation (is this stock cheap?). The badge tells you what to do. The position sizing cap tells you how much. Red flags (insider selling, high leverage, cash burn) override the signal.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Step 5: Equity Cards</p>
                  <p>Producers show financial metrics and margin expansion — how much profit multiplies if copper reaches incentive price. Developers show catalyst trackers. Explorers are binary bets capped at 2%.</p>
                </div>
              </div>
            </div>

            {/* When to Update */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">When to Update</h3>
              <p className="text-xs">If financial metrics are more than one quarter old, they're stale. Forces and supply-demand projections should be refreshed when S&amp;P Global, IEA, or Wood Mackenzie publish new studies (typically semi-annually).</p>
            </div>

            {/* What This Page Does NOT Do */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">What This Page Does NOT Do</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                <li>No price predictions or technical analysis</li>
                <li>No personal portfolio allocation advice</li>
                <li>The composite signal is a framework, not financial advice</li>
                <li>Supply-demand projections carry significant uncertainty beyond 2030</li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
