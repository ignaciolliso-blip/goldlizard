import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { CopperMarketData, CopperEquityName, CopperEquityFinancial } from "@/lib/copperDataFetcher";

interface Props {
  marketData: CopperMarketData | null;
  equities: CopperEquityName[];
  financials: CopperEquityFinancial[];
}

export default function CopperStaleWarnings({ marketData, equities, financials }: Props) {
  const warnings: string[] = [];

  if (marketData) {
    const daysSince = Math.floor((Date.now() - new Date(marketData.date).getTime()) / 86400000);
    if (daysSince > 14) {
      warnings.push(`Market data last updated ${marketData.date} — update via Data Management.`);
    }
  }

  // Check stale financials for producers
  const producers = equities.filter(e => e.tier === "producer");
  for (const p of producers) {
    const fin = financials.find(f => f.equity_id === p.id);
    if (fin) {
      const daysSince = Math.floor((Date.now() - new Date(fin.as_of_date).getTime()) / 86400000);
      if (daysSince > 100) {
        warnings.push(`Financial data for ${p.name} is ${daysSince} days old.`);
      }
    }
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <Alert key={i} className="border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-xs text-yellow-400">{w}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
