/**
 * Uranium Miner Valuation Engine
 *
 * Derives EV/lb, P/NAV proxy, EV/EBITDA, EV/production, and a composite
 * BUY / HOLD / AVOID score for each miner in the universe.
 */

// ── Input types ──────────────────────────────────────────────────────────────

export interface MinerUniverse {
  ticker: string;
  company: string;
  stage: string; // 'Producer' | 'Developer' | 'Explorer' | 'Royalty'
  jurisdiction_hq: string | null;
  jurisdiction_operations: string;
  resources_mlb: number | null;
  annual_production_mlb: number | null;
  capex_to_production_usd_m: number | null;
  notes: string | null;
}

export interface MinerFinancials {
  ticker: string;
  share_price: number | null;
  market_cap_usd_bn: number | null;
  total_debt_usd_bn: number | null;
  cash_usd_bn: number | null;
  ebitda_usd_bn: number | null;
  ev_usd_bn: number | null;
  shares_outstanding_bn: number | null;
  annual_production_mlb: number | null;
}

// ── Output types ─────────────────────────────────────────────────────────────

export type Signal = 'BUY' | 'HOLD' | 'AVOID';

export interface EvPerLbResult {
  value: number; // $/lb
  /** Fraction of spot: value / spotPrice */
  pctOfSpot: number;
  flag: 'cheap' | 'fair' | 'expensive';
  explanation: string;
}

export interface PNavProxyResult {
  /** EV/lb ÷ spot — a 0‑1+ ratio */
  ratio: number;
  explanation: string;
  caveat: string;
}

export interface EvEbitdaResult {
  value: number;
  flag: 'cheap' | 'fair' | 'expensive';
  explanation: string;
}

export interface EvProductionResult {
  /** $/lb of annual production capacity */
  value: number;
  explanation: string;
}

export interface CompositeResult {
  signal: Signal;
  impliedUpsideMultiple: number;
  reason: string;
}

export interface MinerValuationResult {
  ticker: string;
  company: string;
  stage: string;
  jurisdictionOperations: string;
  sharePrice: number | null;
  marketCapBn: number | null;
  evBn: number | null;
  resourcesMlb: number | null;
  annualProductionMlb: number | null;

  evPerLb: EvPerLbResult | null;
  pNavProxy: PNavProxyResult | null;
  evEbitda: EvEbitdaResult | null;
  evProduction: EvProductionResult | null;
  composite: CompositeResult;

  /** True when financials are missing so metrics couldn't be computed */
  noFinancials: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function evPerLbFlag(pctOfSpot: number): 'cheap' | 'fair' | 'expensive' {
  if (pctOfSpot < 0.15) return 'cheap';
  if (pctOfSpot > 0.40) return 'expensive';
  return 'fair';
}

function evEbitdaFlag(ratio: number): 'cheap' | 'fair' | 'expensive' {
  if (ratio < 8) return 'cheap';
  if (ratio > 15) return 'expensive';
  return 'fair';
}

function fmt(n: number, decimals = 1): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Core engine ──────────────────────────────────────────────────────────────

export function computeMinerValuations(
  universe: MinerUniverse[],
  financials: MinerFinancials[],
  uraniumSpotPrice: number
): MinerValuationResult[] {
  // Index financials by ticker — use most recent row per ticker
  const finMap = new Map<string, MinerFinancials>();
  for (const f of financials) {
    finMap.set(f.ticker, f);
  }

  return universe.map((miner) => {
    const fin = finMap.get(miner.ticker) ?? null;
    const noFinancials = !fin || fin.ev_usd_bn == null;

    const evBn = fin?.ev_usd_bn ?? null;
    const resourcesMlb = miner.resources_mlb;
    // Prefer universe production, fall back to financials
    const annualProdMlb =
      miner.annual_production_mlb ?? fin?.annual_production_mlb ?? null;
    const ebitdaBn = fin?.ebitda_usd_bn ?? null;
    const isProducer = miner.stage === 'Producer';

    // ── EV/lb ────────────────────────────────────────────────────────────
    let evPerLb: EvPerLbResult | null = null;
    if (evBn != null && resourcesMlb != null && resourcesMlb > 0) {
      const evUsd = evBn * 1_000; // $bn → $M
      const value = (evUsd * 1_000_000) / (resourcesMlb * 1_000_000); // simplifies to evUsd M / resources Mlb → $/lb
      // Actually: EV in USD / resources in lbs
      // evBn * 1e9 / (resourcesMlb * 1e6) = evBn * 1000 / resourcesMlb
      const valueCorrected = (evBn * 1_000) / resourcesMlb; // $/lb
      const pctOfSpot = valueCorrected / uraniumSpotPrice;
      const flag = evPerLbFlag(pctOfSpot);

      evPerLb = {
        value: valueCorrected,
        pctOfSpot,
        flag,
        explanation: `You are paying $${fmt(valueCorrected)}/lb for every pound of uranium in the ground (${fmt(pctOfSpot * 100, 0)}% of the $${fmt(uraniumSpotPrice)}/lb spot price).`,
      };
    }

    // ── P/NAV proxy ──────────────────────────────────────────────────────
    let pNavProxy: PNavProxyResult | null = null;
    if (evPerLb != null) {
      const ratio = evPerLb.value / uraniumSpotPrice;
      pNavProxy = {
        ratio,
        explanation: `The market values ${miner.company}'s uranium at ${fmt(ratio * 100, 0)}% of what spot uranium is worth.`,
        caveat:
          'This is a proxy for P/NAV using EV/lb ÷ spot price. True P/NAV requires analyst NAV models.',
      };
    }

    // ── EV/EBITDA (producers only) ───────────────────────────────────────
    let evEbitda: EvEbitdaResult | null = null;
    if (
      isProducer &&
      evBn != null &&
      ebitdaBn != null &&
      ebitdaBn > 0
    ) {
      const value = evBn / ebitdaBn;
      const flag = evEbitdaFlag(value);
      evEbitda = {
        value,
        flag,
        explanation: `At current earnings, it would take ${fmt(value)}× years to pay back the enterprise value.`,
      };
    }

    // ── EV/production (producers only) ───────────────────────────────────
    let evProduction: EvProductionResult | null = null;
    if (
      isProducer &&
      evBn != null &&
      annualProdMlb != null &&
      annualProdMlb > 0
    ) {
      // evBn * 1e9 / (annualProdMlb * 1e6) = evBn * 1000 / annualProdMlb
      const value = (evBn * 1_000) / annualProdMlb;
      evProduction = {
        value,
        explanation: `The market pays $${fmt(value)}/lb of annual production capacity.`,
      };
    }

    // ── Composite signal ─────────────────────────────────────────────────
    const composite = computeComposite(
      miner,
      evPerLb,
      evEbitda,
      uraniumSpotPrice,
      noFinancials
    );

    return {
      ticker: miner.ticker,
      company: miner.company,
      stage: miner.stage,
      jurisdictionOperations: miner.jurisdiction_operations,
      sharePrice: fin?.share_price ?? null,
      marketCapBn: fin?.market_cap_usd_bn ?? null,
      evBn,
      resourcesMlb,
      annualProductionMlb: annualProdMlb,
      evPerLb,
      pNavProxy,
      evEbitda,
      evProduction,
      composite,
      noFinancials,
    };
  });
}

function computeComposite(
  miner: MinerUniverse,
  evPerLb: EvPerLbResult | null,
  evEbitda: EvEbitdaResult | null,
  spotPrice: number,
  noFinancials: boolean
): CompositeResult {
  if (noFinancials || !evPerLb) {
    return {
      signal: 'HOLD',
      impliedUpsideMultiple: 1,
      reason: 'Insufficient financial data to score.',
    };
  }

  const isProducer = miner.stage === 'Producer';

  // Implied upside for developers/explorers:
  //   If spot × 15% is the "cheap" EV/lb threshold, upside = threshold / actual
  const cheapThreshold = spotPrice * 0.15;
  const developerUpside = cheapThreshold / evPerLb.value;

  // For producers, blend in EV/EBITDA
  let producerScore = 1.0;
  if (isProducer && evEbitda) {
    // Normalize EV/EBITDA: benchmark 10× → 1.0, 5× → 2.0, 20× → 0.5
    producerScore = 10 / evEbitda.value;
  }

  const impliedUpside = isProducer
    ? (developerUpside + producerScore) / 2
    : developerUpside;

  // ── AVOID conditions
  if (evPerLb.pctOfSpot > 0.40) {
    if (!isProducer || (evEbitda && evEbitda.value > 20)) {
      return {
        signal: 'AVOID',
        impliedUpsideMultiple: Math.round(impliedUpside * 100) / 100,
        reason: isProducer
          ? `Expensive on both EV/lb (${fmt(evPerLb.pctOfSpot * 100, 0)}% of spot) and EV/EBITDA (${evEbitda ? fmt(evEbitda.value) + '×' : 'n/a'}).`
          : `EV/lb at ${fmt(evPerLb.pctOfSpot * 100, 0)}% of spot — market is pricing in significant upside already.`,
      };
    }
  }

  // ── BUY conditions — implied upside ≥ 2×
  if (impliedUpside >= 2) {
    return {
      signal: 'BUY',
      impliedUpsideMultiple: Math.round(impliedUpside * 100) / 100,
      reason: isProducer
        ? `Cheap at $${fmt(evPerLb.value)}/lb (${fmt(evPerLb.pctOfSpot * 100, 0)}% of spot)${evEbitda ? ` with ${fmt(evEbitda.value)}× EV/EBITDA` : ''}. ${fmt(impliedUpside)}× implied upside.`
        : `Deep value at $${fmt(evPerLb.value)}/lb (${fmt(evPerLb.pctOfSpot * 100, 0)}% of spot). ${fmt(impliedUpside)}× implied upside to fair value.`,
    };
  }

  // ── HOLD
  return {
    signal: 'HOLD',
    impliedUpsideMultiple: Math.round(impliedUpside * 100) / 100,
    reason: `Fair value range — EV/lb at ${fmt(evPerLb.pctOfSpot * 100, 0)}% of spot${evEbitda ? `, EV/EBITDA ${fmt(evEbitda.value)}×` : ''}. ${fmt(impliedUpside)}× implied upside.`,
  };
}
