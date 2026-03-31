import type { UraniumAnchorResult, UraniumForcesResult, UraniumLeverageResult } from '@/lib/uraniumEngine';
import { deriveUraniumPositioning } from '@/lib/uraniumEngine';
import { GuideTooltip } from '@/components/GuideMode';

interface Props {
  anchorResult: UraniumAnchorResult | null;
  forcesResult: UraniumForcesResult | null;
  leverageResult: UraniumLeverageResult | null;
}

function fmt(n: number) { return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }

export default function UraniumPositioning({ anchorResult, forcesResult, leverageResult }: Props) {
  if (!anchorResult || !forcesResult) return null;

  const zone = anchorResult.zone;
  const deficitPct = forcesResult.deficitPct;
  const minerPercentile = leverageResult?.currentPercentile ?? 50;

  const positioning = deriveUraniumPositioning(zone, deficitPct, minerPercentile);

  const borderColorMap: Record<string, string> = {
    bullish: 'border-l-bullish',
    bearish: 'border-l-bearish',
    neutral: 'border-l-neutral',
    primary: 'border-l-uranium',
  };
  const textColorMap: Record<string, string> = {
    bullish: 'text-bullish',
    bearish: 'text-bearish',
    neutral: 'text-neutral',
    primary: 'text-uranium',
  };

  const narrative = `Uranium spot (${fmt(anchorResult.spotPrice)}/lb) is in the ${anchorResult.zoneLabel.toLowerCase()} — ${positioning.detail}. The long-term contract price (${fmt(anchorResult.ltContractPrice)}/lb) is at a 14-year high and ${anchorResult.ltContractPrice >= 85 ? 'at' : 'approaching'} greenfield incentive levels. The supply-demand gap: demand at ${forcesResult.annualDemand.toFixed(0)} Mlb against supply of ${forcesResult.totalSupply.toFixed(0)} Mlb — a ${Math.abs(forcesResult.deficitPct).toFixed(0)}% ${forcesResult.deficit < 0 ? 'deficit' : 'surplus'}. Miners (URNM) at the ${minerPercentile.toFixed(0)}th percentile — ${minerPercentile > 75 ? 'front-running the spot price' : minerPercentile < 25 ? 'lagging the commodity' : 'fairly valued'}.`;

  return (
    <div className={`bg-card border border-border ${borderColorMap[positioning.color]} border-l-4 rounded-xl p-6 sm:p-7 space-y-4`}>
      <div>
        <GuideTooltip id="uranium-positioning" text="This recommendation combines three lenses: uranium's price vs production cost (Anchor), the supply-demand deficit trajectory (Forces), and miner valuation vs the commodity (Leverage). When all three align, conviction is highest.">
          <h2 className={`font-display text-2xl ${textColorMap[positioning.color]}`}>
            {positioning.text}
          </h2>
        </GuideTooltip>
        <p className="text-sm text-muted-foreground mt-2">{positioning.detail}</p>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{narrative}</p>
      
      {/* Vehicle recommendation in narrative */}
      <div className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
        For European investors: <span className="text-foreground font-medium">HANetf Sprott Uranium Miners UCITS ETF (U3O8, ISIN: IE0005YK6564)</span> provides 
        broad miner exposure. For higher-beta: <span className="text-foreground font-medium">URNJ</span>. For physical uranium: <span className="text-foreground font-medium">SPUT</span>. 
        ETFs do not qualify for <em>traspaso</em> under Spanish tax rules.
      </div>
    </div>
  );
}
