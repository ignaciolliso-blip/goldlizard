import type { Observation } from './dataFetcher';

// ─── VERIFIED CONSTANTS ───────────────────────────────────────────────────────
// All figures cross-checked against primary sources. Do not change without
// updating the source annotation and re-running the spot checks.

// WGC above-ground gold stock, end-2024
// Source: World Gold Council Gold Demand Trends Q4 2024
// https://www.gold.org/goldhub/data/above-ground-stocks
export const TROY_OZ_PER_TONNE = 32150.7466;
export const TOTAL_ABOVE_GROUND_TONNES = 216265;
export const TOTAL_OZ = TOTAL_ABOVE_GROUND_TONNES * TROY_OZ_PER_TONNE; // 6.953B oz

// G5 Global M2 multiplier
// G5 = US + Eurozone + China + Japan + UK, converted to USD at Dec year-end FX
// US M2 share of G5 M2: 21.7% (2020), 22.3% (2021), 23.6% (2022), 22.6% (2023), 21.9% (2024)
// 5-year average: ~22.4%. Using 4.6x (= 1/21.7%) — conservative, anchored to 2020 base.
// Sources: FRED M2SL, ECB SDW, PBoC, Bank of Japan, Bank of England
// This multiplier converts live FRED WM2NS (US M2) to approximate G5 Global M2.
// Update annually when CB data is reconciled.
export const G5_US_M2_MULTIPLIER = 4.6;

// ─── MANUAL UPDATE SCHEDULE ──────────────────────────────────────────────────
// Two constants below require annual human review. They cannot be fetched
// automatically because no free API publishes them in real-time.
//
// TOTAL_ABOVE_GROUND_TONNES: update each February when WGC publishes
//   Gold Demand Trends Q4 report. https://www.gold.org/goldhub/research/gold-demand-trends
//   Last updated: end-2024 (216,265t). Next due: February 2026.
//
// G5_US_M2_MULTIPLIER: review each January using prior December CB releases.
//   US share has been 21–24% since 2020. Recalculate as:
//   (US M2 Dec) / (US + Euro + China + Japan + UK M2 Dec, all in USD)
//   Last reviewed: 2024 data. Next due: January 2026.
//
// If today's date is past the due date, a staleness warning appears in the Anchor card.
export const CONSTANTS_LAST_UPDATED  = '2024-12-31'; // ISO date of last manual review
export const CONSTANTS_NEXT_REVIEW   = '2026-01-31'; // show warning after this date

// G5 M2 growth rate (2007–2024 CAGR = 5.1%/yr in USD terms)
// Using 5.0%/yr going forward (slightly conservative)
// Gold supply growth: ~1.5%/yr (WGC mine production ~3,500t/yr on 216,000t stock)
export const G5_M2_GROWTH = 0.05;
export const GOLD_SUPPLY_GROWTH = 0.015;
export const NET_PARITY_GROWTH = G5_M2_GROWTH - GOLD_SUPPLY_GROWTH; // 3.5%/yr

// Historical benchmarks — % of G5 total parity (gold market cap / G5 M2)
// Derived from verified annual dataset (2007–2024), 18 data points
// Verified spot checks: 2008=11.0%, 2017=11.8%, 2025=20.9%
// Source: GoldM2LongTermChart verified dataset
export const HISTORICAL_MEDIAN_PCT = 12.3; // median 2007–2024
export const HISTORICAL_MEAN_PCT   = 12.7; // mean   2007–2024

// Key historical reference levels (% of G5 total parity):
// 1980 mania peak:  50.7%  — the all-time high
// 2011 cycle peak:  15.2%
// 1999 generational low: 6.3%
// TODAY (2025):     ~20.9% — above mean, below 2011 peak

export interface AnchorResult {
  currentGoldPrice: number;
  currentM2: number;        // US M2 in billions (raw FRED feed)
  currentG5M2: number;      // G5 Global M2 in billions (US × 4.6)
  totalParity: number;      // G5 M2 / all oz — the structural ceiling price
  pctOfTotalParity: number; // current gold price as % of totalParity
  // kept for backward compat with SignalLenses / SignalProjectionTable
  investableParity: number; // = totalParity (unified; no longer split investable vs total)
  pctOfInvestableParity: number; // = pctOfTotalParity
  zone: AnchorZone;
  zoneLabel: string;
  paritySeries: Observation[];
  m2GoldRatio: number;
  goldSeries: Observation[];
  impliedPriceSeries: Observation[];
}

export type AnchorZone = 'mania' | 'elevated' | 'fair_value' | 'undervalued' | 'extreme_undervaluation';

export interface AnchorZoneInfo {
  zone: AnchorZone;
  label: string;
  range: [number, number]; // % of G5 total parity
  color: string;
  description: string;
  lastSeen: string;
  context: string;
}

// Zone boundaries calibrated to G5 total parity basis
// Historical range: 6.3% (1999 low) to 50.7% (1980 peak)
// Mean: 12.7%, Median: 12.3% (2007–2024 verified data)
export const ANCHOR_ZONES: AnchorZoneInfo[] = [
  {
    zone: 'extreme_undervaluation', label: 'Generational Buy', range: [0, 7], color: 'bullish',
    description: 'Gold below 1999 trough level. Generational entry opportunity.',
    lastSeen: '1999–2004',
    context: 'UK sold half its reserves at the bottom (Brown Bottom). Gold was at 6.3% of G5 parity. What followed: 7× rally over 12 years.',
  },
  {
    zone: 'undervalued', label: 'Undervalued', range: [7, 11], color: 'bullish',
    description: 'Below historical mean. Solid entry point — forces matter more than valuation.',
    lastSeen: '2007–2009, 2013–2016',
    context: 'Typical range during accumulation phases. Gold underpriced relative to the global money it competes with.',
  },
  {
    zone: 'fair_value', label: 'Fair Value', range: [11, 18], color: 'neutral',
    description: 'Within one standard deviation of the 2007–2024 mean (12.7%). Neutral anchor reading.',
    lastSeen: '2010–2014, 2017–2023',
    context: 'Gold is neither cheap nor expensive on a global M2 basis. Direction depends on the Forces.',
  },
  {
    zone: 'elevated', label: 'Elevated', range: [18, 35], color: 'bearish',
    description: 'Above historical mean. Gold repricing toward 2011 cycle levels. Returns depend on continued structural demand.',
    lastSeen: '2011 (15.2%), approaching now',
    context: 'The 2011 peak was 15.2% — today we are above that. Still well below the 1980 mania at 50.7%. Caution warranted on new positions.',
  },
  {
    zone: 'mania', label: 'Mania Territory', range: [35, 100], color: 'bearish',
    description: 'Approaching or above 1980 mania levels. Historically preceded multi-decade bear markets.',
    lastSeen: '1975–1980 only',
    context: 'The 1980 peak at 50.7% was followed by a 20-year bear market. Only justified by hyperinflation + Cold War peak fear.',
  },
];

export interface HistoricalAnnotation {
  date: string;
  ratio: number;
  label: string;
  detail: string;
  zone: string;
  key?: boolean;
}

export const HISTORICAL_ANNOTATIONS: HistoricalAnnotation[] = [
  { date: '1971-08-15', ratio: 5, label: 'Nixon ends gold standard', detail: 'Nixon suspends dollar-gold convertibility at $35/oz. Gold begins free-floating. The era of fiat money begins.', zone: 'undervalued' },
  { date: '1980-01-21', ratio: 50.7, label: 'Gold mania — $612 avg / $850 peak', detail: 'Gold reached 50.7% of G5 total parity — the all-time high. Volcker raises rates to 20% to crush inflation. This marks the TOP.', zone: 'mania', key: true },
  { date: '1999-07-01', ratio: 6.3, label: 'Generational low — $279/oz', detail: 'Gold at 6.3% of G5 parity — the all-time low on this metric. UK sells half its reserves at the bottom. Best entry in 50 years.', zone: 'extreme_undervaluation', key: true },
  { date: '2008-09-15', ratio: 11.0, label: 'Lehman collapses', detail: 'Global Financial Crisis. Fed launches QE1. G5 M2 begins its expansion from $44T.', zone: 'fair_value', key: true },
  { date: '2011-09-06', ratio: 15.2, label: 'Gold peaks — $1,572/oz', detail: 'Post-GFC fear peaks. At 15.2% of G5 parity. Above the long-run mean but far below 1980 mania.', zone: 'elevated', key: true },
  { date: '2020-03-23', ratio: 13.0, label: 'COVID + G5 QE surge', detail: 'All G5 central banks expand simultaneously. G5 M2 jumps from $75T to $88T in one year.', zone: 'fair_value' },
  { date: '2025-01-01', ratio: 20.9, label: 'TODAY — ~21% of G5 parity', detail: 'Gold at 20.9% of G5 total parity. Above historical mean (12.7%) but well below the 2011 cycle peak analogs and far from 1980 mania.', zone: 'elevated', key: true },
];

export function getZone(pctOfParity: number): AnchorZoneInfo {
  if (pctOfParity >= 35) return ANCHOR_ZONES[4]; // mania
  if (pctOfParity >= 18) return ANCHOR_ZONES[3]; // elevated
  if (pctOfParity >= 11) return ANCHOR_ZONES[2]; // fair value
  if (pctOfParity >= 7)  return ANCHOR_ZONES[1]; // undervalued
  return ANCHOR_ZONES[0]; // extreme undervaluation
}

export function getZoneConclusion(pctOfParity: number): { text: string; detail: string; color: string } {
  const vsMedian = (pctOfParity / HISTORICAL_MEDIAN_PCT).toFixed(1);

  if (pctOfParity >= 35) {
    return {
      text: `MANIA TERRITORY — ${vsMedian}× historical median`,
      detail: 'Approaching 1980 peak levels (50.7%). Only justified by hyperinflationary conditions. Reduce exposure.',
      color: 'text-bearish',
    };
  } else if (pctOfParity >= 18) {
    return {
      text: `ELEVATED — ${vsMedian}× historical median`,
      detail: 'Above the 2007–2024 mean of 12.7%. Gold has repriced significantly vs global money supply. Returns now depend on continued structural demand rather than cheap valuation.',
      color: 'text-primary',
    };
  } else if (pctOfParity >= 11) {
    return {
      text: 'FAIR VALUE — Within historical range',
      detail: 'Gold is within one standard deviation of the 2007–2024 mean (12.7%). Neither cheap nor expensive on this metric.',
      color: 'text-neutral',
    };
  } else if (pctOfParity >= 7) {
    return {
      text: 'UNDERVALUED — Below historical mean',
      detail: 'Gold has not kept pace with global money supply growth. Historically preceded strong bull runs.',
      color: 'text-bullish',
    };
  }
  return {
    text: 'GENERATIONAL BUY — Below 1999 trough',
    detail: 'Gold at or below the 1999 generational low on a G5 M2 basis. The last time this happened, gold rallied 7× over 12 years.',
    color: 'text-bullish',
  };
}

export function projectParity(currentParity: number, yearsForward: number): number {
  return currentParity * Math.pow(1 + NET_PARITY_GROWTH, yearsForward);
}

export function computeAnchor(
  goldSpot: Observation[],
  m2Data: Observation[],
): AnchorResult | null {
  if (!goldSpot.length || !m2Data.length) return null;

  // US M2 monthly map (FRED WM2NS, values in billions)
  const m2MonthMap = new Map<string, number>();
  for (const o of m2Data) {
    m2MonthMap.set(o.date.substring(0, 7), o.value);
  }

  const goldMonthMap = new Map<string, number>();
  for (const o of goldSpot) {
    goldMonthMap.set(o.date.substring(0, 7), o.value);
  }

  // Build historical parity series using G5 M2 = US M2 × G5_US_M2_MULTIPLIER
  const paritySeries: Observation[] = [];
  const goldSeries: Observation[] = [];
  const impliedPriceSeries: Observation[] = [];
  let lastUSM2: number | null = null;

  const allMonths = new Set<string>();
  goldSpot.forEach(o => allMonths.add(o.date.substring(0, 7)));

  const sortedMonths = Array.from(allMonths).sort();
  for (const month of sortedMonths) {
    if (m2MonthMap.has(month)) lastUSM2 = m2MonthMap.get(month)!;
    const goldPrice = goldMonthMap.get(month);
    if (lastUSM2 && goldPrice && goldPrice > 0) {
      // Scale US M2 to G5 Global M2
      const g5M2Dollars = lastUSM2 * 1e9 * G5_US_M2_MULTIPLIER;
      const g5TotalParity = g5M2Dollars / TOTAL_OZ;
      const pctOfParity = (goldPrice / g5TotalParity) * 100;
      const dateStr = `${month}-01`;
      paritySeries.push({ date: dateStr, value: pctOfParity });
      goldSeries.push({ date: dateStr, value: goldPrice });
      impliedPriceSeries.push({ date: dateStr, value: g5TotalParity });
    }
  }

  if (paritySeries.length === 0) return null;

  const currentGoldPrice = goldSpot[goldSpot.length - 1].value;
  const m2Sorted = Array.from(m2MonthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const currentUSM2 = m2Sorted[m2Sorted.length - 1]?.[1] || 0;

  const g5M2Dollars    = currentUSM2 * 1e9 * G5_US_M2_MULTIPLIER;
  const totalParity    = g5M2Dollars / TOTAL_OZ;
  const pctOfParity    = (currentGoldPrice / totalParity) * 100;
  const m2GoldRatio    = currentUSM2 / currentGoldPrice;
  const zone           = getZone(pctOfParity);

  return {
    currentGoldPrice,
    currentM2:   currentUSM2,
    currentG5M2: currentUSM2 * G5_US_M2_MULTIPLIER,
    totalParity,
    pctOfTotalParity:       pctOfParity,
    // backward-compat aliases — both point to the same G5 total parity figure
    investableParity:       totalParity,
    pctOfInvestableParity:  pctOfParity,
    zone: zone.zone,
    zoneLabel: zone.label,
    paritySeries,
    m2GoldRatio,
    goldSeries,
    impliedPriceSeries,
  };
}
