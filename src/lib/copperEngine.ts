import type { CopperMarketData } from "./copperDataFetcher";

export const LBS_PER_TONNE = 2204.62;

export interface CopperAnchorResult {
  spotLb: number;
  spotTonne: number;
  incentiveTonne: number;
  aiscTonne: number;
  anchorGapPct: number;
  upsidePct: number;
  positioning: { text: string; color: string; score: number };
}

function derivePositioning(gapPct: number): { text: string; color: string; score: number } {
  if (gapPct > 60) return { text: "STRONG ACCUMULATE", color: "bullish", score: 2 };
  if (gapPct > 40) return { text: "ACCUMULATE", color: "bullish", score: 1 };
  if (gapPct > 25) return { text: "HOLD", color: "neutral", score: 0 };
  if (gapPct > 10) return { text: "TAKE PROFITS", color: "bearish", score: -1 };
  return { text: "REDUCE", color: "bearish", score: -2 };
}

export function computeCopperAnchor(data: CopperMarketData): CopperAnchorResult {
  const spotTonne = Number(data.spot_price_tonne);
  const spotLb = Number(data.spot_price_lb);
  const incentiveTonne = Number(data.incentive_price_tonne);
  const aiscTonne = Number(data.p90_aisc_tonne);

  const anchorGapPct = Math.round(((incentiveTonne - spotTonne) / incentiveTonne) * 100);
  const upsidePct = Math.round((incentiveTonne / spotTonne) * 100 - 100);

  return {
    spotLb,
    spotTonne,
    incentiveTonne,
    aiscTonne,
    anchorGapPct,
    upsidePct,
    positioning: derivePositioning(anchorGapPct),
  };
}
