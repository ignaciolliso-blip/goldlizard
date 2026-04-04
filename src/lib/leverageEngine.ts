// Legacy type still used by miner_prices table fetchers
export interface MinerPrice {
  date: string;
  ticker: string;
  close_price: number;
}

export interface GoldMinerValuation {
  ticker: string;
  company: string;
  p_nav: number;
  aisc_per_oz: number;
  nav_usd_bn: number;
  jurisdiction: string;
  stage: string;
}

export interface GoldPNAVHistoryPoint {
  date: string;
  pnav: number;
  goldPrice: number;
  source: string;
  notes: string;
}

export interface LeverageResult {
  sectorPNAV: number;
  historicalAvgPNAV: number;
  miners: GoldMinerValuation[];
  pnavHistory: GoldPNAVHistoryPoint[];
}

const HISTORICAL_AVG_PNAV = 1.3;
const HISTORICAL_PEAK_PNAV = 2.5;
const HISTORICAL_TROUGH_PNAV = 0.4;

export { HISTORICAL_AVG_PNAV, HISTORICAL_PEAK_PNAV, HISTORICAL_TROUGH_PNAV };

export function computeLeverage(
  miners: GoldMinerValuation[],
  pnavHistory: GoldPNAVHistoryPoint[],
): LeverageResult | null {
  if (!miners.length) return null;

  // Weighted avg P/NAV (by nav_usd_bn, fallback equal weight)
  const totalNav = miners.reduce((s, m) => s + m.nav_usd_bn, 0);
  const sectorPNAV = totalNav > 0
    ? miners.reduce((s, m) => s + m.p_nav * m.nav_usd_bn, 0) / totalNav
    : miners.reduce((s, m) => s + m.p_nav, 0) / miners.length;

  return {
    sectorPNAV,
    historicalAvgPNAV: HISTORICAL_AVG_PNAV,
    miners,
    pnavHistory,
  };
}

export function projectGoldPNAV(
  currentPNAV: number,
  targetPNAV: number,
  yearsForward: number,
): number {
  const halfLife = 2.5;
  const decayFactor = Math.pow(0.5, yearsForward / halfLife);
  return targetPNAV + (currentPNAV - targetPNAV) * decayFactor;
}

export function deriveLeverageConclusion(sectorPNAV: number): {
  text: string;
  detail: string;
  color: string;
} {
  if (sectorPNAV < 0.5) {
    return {
      text: 'DEEP DISCOUNT — generational buying opportunity',
      detail: `At ${sectorPNAV.toFixed(1)}× P/NAV, miners are priced for bankruptcy. Historically this has preceded 3-5× returns over 3-5 years.`,
      color: 'text-bullish',
    };
  }
  if (sectorPNAV < 0.8) {
    return {
      text: 'UNDERVALUED — buying gold reserves at a discount',
      detail: `At ${sectorPNAV.toFixed(1)}× P/NAV, you're paying less than what the gold in the ground is worth. Strong risk-reward.`,
      color: 'text-bullish',
    };
  }
  if (sectorPNAV <= 1.5) {
    return {
      text: 'FAIR VALUE — hold and accumulate on dips',
      detail: `At ${sectorPNAV.toFixed(1)}× P/NAV, miners are in the fair value range (0.8-1.5×). Below the historical average of ${HISTORICAL_AVG_PNAV}×. Returns will be driven by gold price appreciation.`,
      color: 'text-neutral',
    };
  }
  if (sectorPNAV <= 2.0) {
    return {
      text: 'PREMIUM — approaching overvalued for producers',
      detail: `At ${sectorPNAV.toFixed(1)}× P/NAV, miners are above historical average. Justified for royalty/streaming cos, but caution warranted for producers.`,
      color: 'text-bearish',
    };
  }
  return {
    text: 'OVERVALUED — take profits',
    detail: `At ${sectorPNAV.toFixed(1)}× P/NAV, miners are at or above the 2011 mania peak. Historically followed by severe drawdowns.`,
    color: 'text-bearish',
  };
}

export const GOLD_PNAV_ANNOTATIONS = [
  {
    date: "2006-01",
    pnav: 1.4,
    label: "Gold bull market builds — $600/oz",
    detail: "Gold miners re-rating as gold rises from $400 to $600. P/NAV expanding from 1.0× to 1.4×. Producers generating good margins. The sweet spot for miner investing — commodity rising AND multiples expanding.",
  },
  {
    date: "2008-10",
    pnav: 0.8,
    label: "Financial crisis — everything sells",
    detail: "Lehman collapses. Gold holds relatively well ($750) but miners crash as equity markets liquidate indiscriminately. P/NAV compresses from 1.5× to 0.8×. Buying opportunity — gold recovers faster than miners, creating a catch-up trade.",
  },
  {
    date: "2011-08",
    pnav: 2.5,
    label: "GOLD AT $1,920 — miner mania peak",
    detail: "Gold hits all-time high. Miners trade at 2.0-2.5× NAV as institutional money pours in. Exploration juniors with no reserves get absurd valuations. This is the TOP for the cycle. Within 4 years, miners will lose 80% of their value.",
  },
  {
    date: "2013-06",
    pnav: 1.0,
    label: "Gold crash — miners destroyed",
    detail: "Gold drops from $1,920 to $1,200 in 2 years. But miners fall even more — P/NAV compresses from 2.5× to 1.0×. Double whammy: commodity decline + multiple compression = catastrophic losses for miner investors.",
  },
  {
    date: "2015-12",
    pnav: 0.4,
    label: "CYCLE TROUGH — miners at 0.4× NAV",
    detail: "Gold at $1,050. Miners trading at 0.3-0.5× NAV — the market is pricing in widespread mine closures and bankruptcy. Barrick's debt crisis. Mass write-downs across the sector. The generational buying opportunity. What followed: miners up 5× in 5 years.",
  },
  {
    date: "2016-08",
    pnav: 1.5,
    label: "Snap recovery — too fast, too soon",
    detail: "Gold rallies to $1,370 and miners explode higher — GDX up 120% in 7 months. P/NAV re-rates from 0.4× to 1.5×. But the rally fizzles as the Fed raises rates. Miners give back half the gains by year-end.",
  },
  {
    date: "2020-08",
    pnav: 1.4,
    label: "COVID gold peak — $2,075/oz",
    detail: "Gold hits new ATH on COVID stimulus fears. Miners re-rate to 1.4× NAV. But unlike 2011, the multiple expansion is more modest — investors have learned to be skeptical of miner management. The premium is earned, not speculative.",
  },
  {
    date: "2022-09",
    pnav: 0.6,
    label: "Fed tightening — miners crushed again",
    detail: "Fed raises rates aggressively. Gold falls to $1,630. Miners trade at 0.5-0.7× NAV despite record low AISC costs. The market is pricing in sustained high real rates. With hindsight, another buying opportunity.",
  },
  {
    date: "2025-01",
    pnav: 1.3,
    label: "Gold ATH — miners lagging",
    detail: "Gold has risen 2.5× from 2022 lows but miners have only partially re-rated. P/NAV at 1.3× is well below the 2011 peak of 2.5×. The catch-up potential remains.",
  },
  {
    date: "2026-03",
    pnav: 1.1,
    label: "TODAY — miners after pullback",
    detail: "Miners have pulled back more than gold (typical beta). P/NAV below the historical average of 1.3×. Record AISC margins persist. The market is not pricing in these margins sustainably.",
  },
];

export const GOLD_CYCLE_TABLE_STATIC = [
  { cycle: '2006 Early Bull', price: '$600', pnav: '1.4×', margin: '$200', result: 'Gold 3×\'d, miners 4×\'d' },
  { cycle: '2011 Mania Peak', price: '$1,920', pnav: '2.5×', margin: '$700', result: 'Gold -45%, miners -80%' },
  { cycle: '2015 Trough', price: '$1,050', pnav: '0.4×', margin: '-$50', result: 'Gold 2×\'d, miners 5×\'d' },
  { cycle: '2020 COVID Peak', price: '$2,075', pnav: '1.4×', margin: '$600', result: 'Gold flat, miners -30%' },
  { cycle: '2022 Fed Tightening', price: '$1,630', pnav: '0.6×', margin: '$400', result: 'Gold 2.7×\'d, miners 3×\'d' },
];

/** Build cycle table with dynamic TODAY row */
export function buildGoldCycleTable(currentGoldPrice: number, currentPNAV: number, aisc = 1400) {
  const margin = currentGoldPrice > 0 ? currentGoldPrice - aisc : 0;
  return [
    ...GOLD_CYCLE_TABLE_STATIC,
    {
      cycle: 'TODAY (2026)',
      price: currentGoldPrice > 0 ? `$${Math.round(currentGoldPrice).toLocaleString()}` : '—',
      pnav: `${currentPNAV.toFixed(1)}×`,
      margin: margin > 0 ? `$${Math.round(margin).toLocaleString()}` : '—',
      result: '???',
    },
  ];
}
