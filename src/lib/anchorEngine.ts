import type { Observation } from './dataFetcher';

// Gold supply constants (WGC end-2024)
export const TROY_OZ_PER_TONNE = 32150.7;
export const TOTAL_ABOVE_GROUND_TONNES = 216265;
export const INVESTABLE_TONNES = 86389; // bars+coins+ETFs (48634) + CB reserves (37755)
export const TOTAL_OZ = TOTAL_ABOVE_GROUND_TONNES * TROY_OZ_PER_TONNE; // ~6.95B
export const INVESTABLE_OZ = INVESTABLE_TONNES * TROY_OZ_PER_TONNE; // ~2.78B
export const M2_GROWTH = 0.06;
export const GOLD_SUPPLY_GROWTH = 0.015;
export const NET_PARITY_GROWTH = M2_GROWTH - GOLD_SUPPLY_GROWTH; // ~4.5%

export interface AnchorResult {
  currentGoldPrice: number;
  currentM2: number; // in billions
  totalParity: number;
  investableParity: number;
  pctOfTotalParity: number; // e.g. 142
  pctOfInvestableParity: number; // e.g. 57
  zone: AnchorZone;
  zoneLabel: string;
  paritySeries: Observation[]; // historical % of investable parity
  m2GoldRatio: number; // kept for backward compat
}

export type AnchorZone = 'above_parity' | 'elevated' | 'transition' | 'undervalued' | 'extreme_undervaluation';

export interface AnchorZoneInfo {
  zone: AnchorZone;
  label: string;
  range: [number, number]; // % of investable parity
  color: string;
  description: string;
  lastSeen: string;
  context: string;
}

export const ANCHOR_ZONES: AnchorZoneInfo[] = [
  {
    zone: 'extreme_undervaluation', label: 'Extreme Undervaluation', range: [0, 10], color: 'bullish',
    description: 'Gold capturing almost none of the money printing. Best entry in 50 years.',
    lastSeen: '1999-2001', context: 'Dot-com mania, budget surpluses, CBs selling gold. Best entry in 50 years.',
  },
  {
    zone: 'undervalued', label: 'Undervalued — Opportunity', range: [10, 30], color: 'bullish',
    description: 'Gold cheap relative to money supply. BUYING OPPORTUNITY with hindsight.',
    lastSeen: '2015-2019', context: 'Low inflation, stock boom, peace, nobody wants gold. BUYING OPPORTUNITY.',
  },
  {
    zone: 'transition', label: 'Transition — Partially Priced', range: [30, 60], color: 'neutral',
    description: 'Gold has partially repriced. Direction depends on whether fear or complacency wins.',
    lastSeen: 'TODAY (57%), also 2008', context: 'Gold has partially repriced. Direction depends on whether fear or complacency wins.',
  },
  {
    zone: 'elevated', label: 'Elevated — Approaching Parity', range: [60, 100], color: 'bearish',
    description: 'Gold approaching investable parity. Strong returns but correction risk rising.',
    lastSeen: '2011', context: 'Post-GFC QE, debt crises, CB buying. Strong returns but risk of correction rising.',
  },
  {
    zone: 'above_parity', label: 'Above Parity — Overvalued', range: [100, 200], color: 'bearish',
    description: 'Gold above investable parity. Historically followed by multi-year corrections.',
    lastSeen: '1980', context: 'Oil shocks, Cold War, inflation 15%. Gold mania. Followed by 20yr bear market.',
  },
];

export interface HistoricalAnnotation {
  date: string;
  ratio: number; // kept for reference
  label: string;
  detail: string;
  zone: string;
  key?: boolean;
}

export const HISTORICAL_ANNOTATIONS: HistoricalAnnotation[] = [
  { date: '1971-08-15', ratio: 17, label: 'Nixon ends gold standard', detail: 'Nixon suspends dollar-gold convertibility at $35/oz. Gold begins free-floating. The era of fiat money begins.', zone: 'undervalued' },
  { date: '1973-10-01', ratio: 10, label: 'First oil shock', detail: 'OPEC oil embargo quadruples oil prices. Inflation surges. Gold begins repricing as inflation hedge.', zone: 'transition' },
  { date: '1979-11-01', ratio: 3, label: 'Second oil shock + Iran', detail: 'Iranian revolution, Soviet invasion of Afghanistan, US inflation hits 14.8%. Peak Cold War fear. Gold surges to $850.', zone: 'elevated' },
  { date: '1980-01-21', ratio: 2, label: 'Gold mania — $850/oz', detail: 'Gold hits $850, the lowest M2/Gold ratio in history. Volcker raises rates to 20% to crush inflation. This marks the TOP.', zone: 'above_parity', key: true },
  { date: '1985-01-01', ratio: 7, label: 'Volcker tames inflation', detail: 'Aggressive rate hikes work. Inflation falls from 14.8% to 3.5%. Dollar strengthens. Gold fades as stocks become the new darling.', zone: 'transition' },
  { date: '1989-11-09', ratio: 10, label: 'Berlin Wall falls', detail: 'Cold War ends. Peace dividend begins. Geopolitical risk premium evaporates.', zone: 'undervalued' },
  { date: '1995-01-01', ratio: 13, label: 'Dot-com boom begins', detail: 'Internet revolution, tech stocks exploding. Budget surpluses under Clinton. Nobody wants gold. Central banks selling reserves.', zone: 'undervalued' },
  { date: '1999-07-01', ratio: 20, label: 'Gold trough — $252/oz', detail: 'Gold at its cheapest vs M2 in modern history. UK sells half its reserves at the bottom (Brown Bottom). Peak complacency.', zone: 'extreme_undervaluation', key: true },
  { date: '2001-09-11', ratio: 18, label: '9/11 attacks', detail: 'World Trade Center destroyed. War on Terror begins. Era of peace and surpluses ends. Gold begins a decade-long bull run from $250.', zone: 'undervalued' },
  { date: '2008-09-15', ratio: 8, label: 'Lehman Brothers collapses', detail: 'Global Financial Crisis. Banks fail. The Fed launches QE1 — first of many rounds of unprecedented money printing.', zone: 'transition', key: true },
  { date: '2011-09-06', ratio: 3.5, label: 'Gold peaks — $1,920/oz', detail: 'Post-GFC fear peaks. QE2 underway, European debt crisis, US credit downgrade, Arab Spring. Gold 7x from 2001.', zone: 'elevated', key: true },
  { date: '2013-04-15', ratio: 6, label: 'Taper tantrum crash', detail: 'Fed signals end of QE. Gold drops 28% in 6 months as markets believe the crisis is over.', zone: 'transition' },
  { date: '2015-12-01', ratio: 13, label: 'Fed begins rate hikes', detail: 'First rate hike since 2006. Economy recovering. Inflation low, stocks booming. Gold hits $1,050, 6-year low.', zone: 'undervalued' },
  { date: '2020-03-23', ratio: 10, label: 'COVID + unlimited QE', detail: 'Pandemic shuts global economy. Fed announces unlimited QE. Congress passes $6T stimulus. M2 explodes.', zone: 'transition' },
  { date: '2022-02-24', ratio: 8, label: 'Russia invades Ukraine', detail: 'War in Europe. West freezes $300B Russian reserves. Central banks realize dollar reserves can be weaponised.', zone: 'transition' },
  { date: '2025-01-29', ratio: 4, label: 'Gold ATH — $5,595', detail: 'Gold all-time high. Central banks buying 1,000+ tonnes/year. US debt above 120% of GDP. De-dollarisation accelerating.', zone: 'elevated' },
  { date: '2026-03-21', ratio: 4.9, label: 'TODAY', detail: 'Gold pulled back ~20% from ATH. Fed holding rates at 3.5-3.75%. Structural forces remain.', zone: 'transition', key: true },
];

export function getZone(pctOfInvParity: number): AnchorZoneInfo {
  if (pctOfInvParity >= 100) return ANCHOR_ZONES[4];
  if (pctOfInvParity >= 60) return ANCHOR_ZONES[3];
  if (pctOfInvParity >= 30) return ANCHOR_ZONES[2];
  if (pctOfInvParity >= 10) return ANCHOR_ZONES[1];
  return ANCHOR_ZONES[0];
}

export function getZoneConclusion(pctOfInvParity: number): string {
  if (pctOfInvParity >= 100) return 'GOLD ABOVE PARITY — Historically followed by multi-year corrections.';
  if (pctOfInvParity >= 60) return 'GOLD ELEVATED — Approaching investable parity. Strong returns but correction risk rising.';
  if (pctOfInvParity >= 30) return 'TRANSITION ZONE — Gold has partially repriced. Direction depends on whether fear or complacency wins.';
  if (pctOfInvParity >= 10) return 'GOLD UNDERVALUED — Significant debasement remains unpriced. Historically a buying opportunity.';
  return 'EXTREME UNDERVALUATION — Gold dirt cheap relative to money supply. Best entry point in 50 years.';
}

export function projectParity(currentParity: number, yearsForward: number): number {
  return currentParity * Math.pow(1 + NET_PARITY_GROWTH, yearsForward);
}

export function computeAnchor(
  goldSpot: Observation[],
  m2Data: Observation[],
): AnchorResult | null {
  if (!goldSpot.length || !m2Data.length) return null;

  // Build M2 monthly map (values in billions from FRED)
  const m2MonthMap = new Map<string, number>();
  for (const o of m2Data) {
    m2MonthMap.set(o.date.substring(0, 7), o.value);
  }

  const goldMonthMap = new Map<string, number>();
  for (const o of goldSpot) {
    goldMonthMap.set(o.date.substring(0, 7), o.value);
  }

  // Build % of investable parity series
  const paritySeries: Observation[] = [];
  let lastM2: number | null = null;

  const allMonths = new Set<string>();
  goldSpot.forEach(o => allMonths.add(o.date.substring(0, 7)));

  const sortedMonths = Array.from(allMonths).sort();
  for (const month of sortedMonths) {
    if (m2MonthMap.has(month)) lastM2 = m2MonthMap.get(month)!;
    const goldPrice = goldMonthMap.get(month);
    if (lastM2 && goldPrice && goldPrice > 0) {
      const m2Dollars = lastM2 * 1e9;
      const invParity = m2Dollars / INVESTABLE_OZ;
      const pctOfInvParity = (goldPrice / invParity) * 100;
      paritySeries.push({ date: `${month}-01`, value: pctOfInvParity });
    }
  }

  if (paritySeries.length === 0) return null;

  const currentGoldPrice = goldSpot[goldSpot.length - 1].value;
  const m2Sorted = Array.from(m2MonthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const currentM2 = m2Sorted[m2Sorted.length - 1]?.[1] || 0;

  const m2Dollars = currentM2 * 1e9;
  const totalParity = m2Dollars / TOTAL_OZ;
  const investableParity = m2Dollars / INVESTABLE_OZ;
  const pctOfTotalParity = (currentGoldPrice / totalParity) * 100;
  const pctOfInvestableParity = (currentGoldPrice / investableParity) * 100;
  const m2GoldRatio = currentM2 / currentGoldPrice;

  const zone = getZone(pctOfInvestableParity);

  return {
    currentGoldPrice,
    currentM2,
    totalParity,
    investableParity,
    pctOfTotalParity,
    pctOfInvestableParity,
    zone: zone.zone,
    zoneLabel: zone.label,
    paritySeries,
    m2GoldRatio,
  };
}
