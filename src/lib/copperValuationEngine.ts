import type { CopperEquityFinancial } from "./copperDataFetcher";

export interface ValuationMetricScore {
  label: string;
  value: string;
  score: number; // +1, 0, -1
  flag: "cheap" | "fair" | "expensive";
}

export interface ValuationResult {
  metrics: ValuationMetricScore[];
  totalScore: number;
  signal: string;
  compositeAdjustment: number;
  redFlags: { icon: string; message: string; cap?: string }[];
}

function scoreEvEbitda(v: number | null): ValuationMetricScore {
  if (v == null) return { label: "EV/EBITDA (NTM)", value: "N/A", score: 0, flag: "fair" };
  const flag = v < 5 ? "cheap" : v <= 8 ? "fair" : "expensive";
  const score = v < 5 ? 1 : v <= 8 ? 0 : -1;
  return { label: "EV/EBITDA (NTM)", value: `${v.toFixed(1)}×`, score, flag };
}

function scorePNav(v: number | null): ValuationMetricScore {
  if (v == null) return { label: "P/NAV", value: "N/A", score: 0, flag: "fair" };
  const flag = v < 0.8 ? "cheap" : v <= 1.2 ? "fair" : "expensive";
  const score = v < 0.8 ? 1 : v <= 1.2 ? 0 : -1;
  return { label: "P/NAV", value: `${v.toFixed(2)}×`, score, flag };
}

function scoreFcfYield(v: number | null): ValuationMetricScore {
  if (v == null) return { label: "FCF Yield", value: "N/A", score: 0, flag: "fair" };
  const flag = v > 8 ? "cheap" : v >= 4 ? "fair" : "expensive";
  const score = v > 8 ? 1 : v >= 4 ? 0 : -1;
  return { label: "FCF Yield", value: `${v.toFixed(1)}%`, score, flag };
}

function scoreNetDebtEbitda(v: number | null): ValuationMetricScore {
  if (v == null) return { label: "Net Debt/EBITDA", value: "N/A", score: 0, flag: "fair" };
  const flag = v < 1.0 ? "cheap" : v <= 2.0 ? "fair" : "expensive";
  const score = v < 1.0 ? 1 : v <= 2.0 ? 0 : -1;
  return { label: "Net Debt/EBITDA", value: `${v.toFixed(1)}×`, score, flag };
}

function deriveSignal(total: number): { signal: string; adj: number } {
  if (total >= 3) return { signal: "DEEP VALUE", adj: 1.5 };
  if (total >= 1) return { signal: "UNDERVALUED", adj: 1.0 };
  if (total >= -1) return { signal: "FAIR VALUE", adj: 0 };
  if (total >= -3) return { signal: "OVERVALUED", adj: -0.5 };
  return { signal: "EXPENSIVE", adj: -1.0 };
}

export function computeValuation(fin: CopperEquityFinancial, tier: string): ValuationResult {
  const metrics = [
    scoreEvEbitda(fin.ev_ebitda_forward ?? fin.ev_ebitda),
    scorePNav(fin.p_nav),
    scoreFcfYield(fin.fcf_yield_pct),
    scoreNetDebtEbitda(fin.net_debt_ebitda),
  ];
  const totalScore = metrics.reduce((s, m) => s + m.score, 0);
  const { signal, adj } = deriveSignal(totalScore);

  const redFlags: ValuationResult["redFlags"] = [];
  if (fin.insider_net_buying_usd_m != null && fin.insider_net_buying_usd_m < -5) {
    redFlags.push({ icon: "⚠️", message: "SIGNIFICANT INSIDER SELLING", cap: "HOLD / WATCH" });
  }
  if (fin.net_debt_ebitda != null && fin.net_debt_ebitda > 3.0) {
    redFlags.push({ icon: "⚠️", message: "HIGH LEVERAGE", cap: "ACCUMULATE ON WEAKNESS" });
  }
  if (tier === "producer" && fin.fcf_yield_pct != null && fin.fcf_yield_pct < 0) {
    redFlags.push({ icon: "⚠️", message: "CASH BURN", cap: "HOLD / WATCH" });
  }
  if (fin.copper_revenue_pct != null && fin.copper_revenue_pct < 50) {
    redFlags.push({ icon: "ℹ️", message: "NOT A PURE PLAY" });
  }

  return { metrics, totalScore, signal, compositeAdjustment: adj, redFlags };
}
