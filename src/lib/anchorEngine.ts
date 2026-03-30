import type { Observation } from './dataFetcher';

export interface AnchorResult {
  m2GoldRatio: number;
  currentGoldPrice: number;
  currentM2: number; // in billions
  zone: AnchorZone;
  zoneLabel: string;
  ratioSeries: Observation[]; // historical M2/Gold ratio over time
  // Scenario prices at current M2
  priceIfRatio: (targetRatio: number) => number;
}

export type AnchorZone = 'extreme_fear' | 'elevated_fear' | 'transition' | 'complacency' | 'extreme_complacency';

export interface AnchorZoneInfo {
  zone: AnchorZone;
  label: string;
  range: [number, number];
  color: string; // CSS class suffix
  description: string;
  lastSeen: string;
  context: string;
}

export const ANCHOR_ZONES: AnchorZoneInfo[] = [
  {
    zone: 'extreme_fear', label: 'Extreme Fear', range: [0, 3], color: 'bearish',
    description: 'Gold mania territory. Historically followed by multi-year corrections.',
    lastSeen: '1980', context: 'Oil shocks, Cold War, inflation 15%, institutional panic. Gold 24x\'d in 9 years. Then fell for 20 years.',
  },
  {
    zone: 'elevated_fear', label: 'Elevated Fear', range: [3, 5], color: 'bearish',
    description: 'Gold expensive relative to money supply. Strong returns but correction risk rising.',
    lastSeen: '2011, 2025-26', context: 'Post-crisis QE, debt crises, CB buying surge. Strong returns but risk of correction rising.',
  },
  {
    zone: 'transition', label: 'Transition', range: [5, 10], color: 'neutral',
    description: 'Gold has partially repriced. Direction depends on whether fear or complacency wins.',
    lastSeen: 'TODAY, also 2008, 2022', context: 'Mixed signals. Gold has partially repriced. Direction depends on whether fear or complacency wins.',
  },
  {
    zone: 'complacency', label: 'Complacency', range: [10, 15], color: 'bullish',
    description: 'Money supply growing faster than gold is repricing. BUYING OPPORTUNITY with hindsight.',
    lastSeen: '2015-2019', context: 'Low inflation, stock boom, peace, nobody wants gold. BUYING OPPORTUNITY with hindsight.',
  },
  {
    zone: 'extreme_complacency', label: 'Extreme Complacency', range: [15, 25], color: 'bullish',
    description: 'Gold dirt cheap relative to M2. Best entry point in 50 years.',
    lastSeen: '1995-2001', context: 'Dot-com mania, budget surpluses, CBs selling gold. Best entry point in 50 years.',
  },
];

export interface HistoricalAnnotation {
  date: string;
  ratio: number;
  label: string;
  detail: string;
  zone: string;
  key?: boolean; // show on mobile
}

export const HISTORICAL_ANNOTATIONS: HistoricalAnnotation[] = [
  { date: '1971-08-15', ratio: 17, label: 'Nixon ends gold standard', detail: 'Nixon suspends dollar-gold convertibility at $35/oz. Gold begins free-floating. The era of fiat money begins.', zone: 'complacency' },
  { date: '1973-10-01', ratio: 10, label: 'First oil shock', detail: 'OPEC oil embargo quadruples oil prices. Inflation surges. Gold begins repricing as inflation hedge.', zone: 'transition' },
  { date: '1979-11-01', ratio: 3, label: 'Second oil shock + Iran', detail: 'Iranian revolution, Soviet invasion of Afghanistan, US inflation hits 14.8%. Peak Cold War fear. Gold surges to $850.', zone: 'fear' },
  { date: '1980-01-21', ratio: 2, label: 'Gold mania — $850/oz', detail: 'Gold hits $850, the lowest M2/Gold ratio in history. Volcker raises rates to 20% to crush inflation. This marks the TOP.', zone: 'extreme_fear', key: true },
  { date: '1985-01-01', ratio: 7, label: 'Volcker tames inflation', detail: 'Aggressive rate hikes work. Inflation falls from 14.8% to 3.5%. Dollar strengthens. Gold fades as stocks become the new darling.', zone: 'transition' },
  { date: '1989-11-09', ratio: 10, label: 'Berlin Wall falls', detail: 'Cold War ends. Peace dividend begins. Geopolitical risk premium evaporates.', zone: 'complacency' },
  { date: '1995-01-01', ratio: 13, label: 'Dot-com boom begins', detail: 'Internet revolution, tech stocks exploding. Budget surpluses under Clinton. Nobody wants gold. Central banks selling reserves.', zone: 'complacency' },
  { date: '1999-07-01', ratio: 20, label: 'Gold trough — $252/oz', detail: 'Gold at cheapest vs M2 in modern history. UK sells half its reserves at the bottom (Brown Bottom). Peak complacency.', zone: 'extreme_complacency', key: true },
  { date: '2001-09-11', ratio: 18, label: '9/11 attacks', detail: 'World Trade Center destroyed. War on Terror begins. Era of peace and surpluses ends. Gold begins a decade-long bull run from $250.', zone: 'complacency' },
  { date: '2008-09-15', ratio: 8, label: 'Lehman Brothers collapses', detail: 'Global Financial Crisis. Banks fail. The Fed launches QE1 — first of many rounds of unprecedented money printing.', zone: 'transition', key: true },
  { date: '2011-09-06', ratio: 3.5, label: 'Gold peaks — $1,920/oz', detail: 'Post-GFC fear peaks. QE2 underway, European debt crisis, US credit downgrade, Arab Spring. Gold 7x from 2001.', zone: 'fear', key: true },
  { date: '2013-04-15', ratio: 6, label: 'Taper tantrum crash', detail: 'Fed signals end of QE. Gold drops 28% in 6 months as markets believe the crisis is over.', zone: 'transition' },
  { date: '2015-12-01', ratio: 13, label: 'Fed begins rate hikes', detail: 'First rate hike since 2006. Economy recovering. Inflation low, stocks booming. Gold hits $1,050, 6-year low.', zone: 'complacency' },
  { date: '2020-03-23', ratio: 10, label: 'COVID + unlimited QE', detail: 'Pandemic shuts global economy. Fed announces unlimited QE. Congress passes $6T stimulus. M2 explodes. Greatest money-printing episode in history.', zone: 'transition' },
  { date: '2022-02-24', ratio: 8, label: 'Russia invades Ukraine', detail: 'War in Europe. West freezes $300B Russian reserves. Central banks globally realize dollar reserves can be weaponised.', zone: 'transition' },
  { date: '2025-01-29', ratio: 4, label: 'Gold ATH — $5,595', detail: 'Gold all-time high. Central banks buying 1,000+ tonnes/year. US debt above 120% of GDP. De-dollarisation accelerating.', zone: 'fear' },
  { date: '2026-03-21', ratio: 4.9, label: 'TODAY', detail: 'Gold pulled back ~20% from ATH. Fed holding rates at 3.5-3.75%. Structural forces remain.', zone: 'transition', key: true },
];

export function getZone(ratio: number): AnchorZoneInfo {
  if (ratio < 3) return ANCHOR_ZONES[0];
  if (ratio < 5) return ANCHOR_ZONES[1];
  if (ratio < 10) return ANCHOR_ZONES[2];
  if (ratio < 15) return ANCHOR_ZONES[3];
  return ANCHOR_ZONES[4];
}

export function getZoneConclusion(ratio: number): string {
  if (ratio > 13) return 'GOLD IS CHEAP — Extreme complacency zone. Historically, this precedes major bull runs.';
  if (ratio >= 10) return 'GOLD IS UNDERVALUED — Complacency zone. Money supply is growing faster than gold is repricing.';
  if (ratio >= 5) return 'TRANSITION ZONE — Gold has partially repriced for money printing. Direction depends on whether fear or complacency wins.';
  if (ratio >= 3) return 'GOLD IS ELEVATED — Fear zone. Most of the easy money has been made, but crises can push further.';
  return 'GOLD MANIA — Extreme fear repricing. Historically, gold has corrected significantly from these levels.';
}

export function computeAnchor(
  goldSpot: Observation[],
  m2Data: Observation[],
): AnchorResult | null {
  if (!goldSpot.length || !m2Data.length) return null;

  // Convert M2 to monthly (last obs per month), values in billions
  const m2MonthMap = new Map<string, number>();
  for (const o of m2Data) {
    m2MonthMap.set(o.date.substring(0, 7), o.value);
  }

  // Build ratio series
  const goldMonthMap = new Map<string, number>();
  for (const o of goldSpot) {
    goldMonthMap.set(o.date.substring(0, 7), o.value);
  }

  const ratioSeries: Observation[] = [];
  let lastM2: number | null = null;

  // Merge all months and compute ratio
  const allMonths = new Set<string>();
  goldSpot.forEach(o => allMonths.add(o.date.substring(0, 7)));

  const sortedMonths = Array.from(allMonths).sort();
  for (const month of sortedMonths) {
    if (m2MonthMap.has(month)) lastM2 = m2MonthMap.get(month)!;
    const goldPrice = goldMonthMap.get(month);
    if (lastM2 && goldPrice && goldPrice > 0) {
      // M2 is in billions from FRED, ratio = M2_billions / gold_price
      const ratio = lastM2 / goldPrice;
      ratioSeries.push({ date: `${month}-01`, value: ratio });
    }
  }

  if (ratioSeries.length === 0) return null;

  const currentGoldPrice = goldSpot[goldSpot.length - 1].value;
  const m2Sorted = Array.from(m2MonthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const currentM2 = m2Sorted[m2Sorted.length - 1]?.[1] || 0;
  const m2GoldRatio = currentM2 / currentGoldPrice;

  const zone = getZone(m2GoldRatio);

  return {
    m2GoldRatio,
    currentGoldPrice,
    currentM2,
    zone: zone.zone,
    zoneLabel: zone.label,
    ratioSeries,
    priceIfRatio: (targetRatio: number) => currentM2 / targetRatio,
  };
}
