import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function CopperHonestFindings() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors">
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="text-sm font-medium text-muted-foreground">What This Page Will NOT Do</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pt-3 pb-1">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>No price predictions or technical analysis targets</li>
          <li>No assumption that the incentive price is reached on any specific timeline</li>
          <li>The incentive price itself shifts over time as capital costs evolve — it is not fixed</li>
          <li>Copper is a cyclical commodity; the structural thesis can temporarily be overwhelmed by recession, demand destruction, or Chinese destocking</li>
          <li>The 2026 supply picture includes a Goldman Sachs estimate of a 600kt surplus in 2025 — the deficit thesis is contested by credible analysts</li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
