// Uranium analytical engines — Anchor (production cost), Forces (supply-demand), Leverage (miners)

export interface UraniumPrice {
  date: string;
  spot_price: number;
  lt_contract_price: number | null;
}

export interface UraniumSupplyDemand {
  quarter: string;
  mine_production_mlb: number;
  secondary_supply_mlb: number;
  reactor_demand_mlb: number;
  contracting_mlb: number;
}

export interface UraniumReactor {
  year: number;
  operating: number;
  under_construction: number;
  planned: number;
  capacity_gw: number;
}

// ──────────────────────────────────────────────
// ANCHOR — Production cost parity
// ──────────────────────────────────────────────

export const URANIUM_COST_BANDS = [
  { label: 'Existing Mine AISC', min: 30, max: 55, color: 'bullish' as const },
  { label: 'Restart Incentive', min: 55, max: 80, color: 'primary' as const },
  { label: 'Greenfield Incentive', min: 80, max: 100, color: 'neutral' as const },
  { label: 'Shortage Pricing', min: 100, max: 160, color: 'bearish' as const },
] as const;

export type UraniumZone = 'below_aisc' | 'restart' | 'greenfield' | 'shortage';

export interface UraniumAnchorResult {
  spotPrice: number;
  ltContractPrice: number;
  zone: UraniumZone;
  zoneLabel: string;
  greenfieldMidpoint: number;
  gapToGreenfield: number; // percentage
}

export function getUraniumZone(spot: number): { zone: UraniumZone; label: string } {
  if (spot < 55) return { zone: 'below_aisc', label: 'Below Production Cost' };
  if (spot < 80) return { zone: 'restart', label: 'Restart Zone' };
  if (spot < 100) return { zone: 'greenfield', label: 'Greenfield Incentive' };
  return { zone: 'shortage', label: 'Shortage Pricing' };
}

export function computeUraniumAnchor(prices: UraniumPrice[]): UraniumAnchorResult | null {
  if (!prices.length) return null;
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const greenfieldMidpoint = 92.5; // midpoint of $85-$100
  const { zone, label } = getUraniumZone(latest.spot_price);

  return {
    spotPrice: latest.spot_price,
    ltContractPrice: latest.lt_contract_price ?? latest.spot_price,
    zone,
    zoneLabel: label,
    greenfieldMidpoint,
    gapToGreenfield: ((latest.spot_price - greenfieldMidpoint) / greenfieldMidpoint) * 100,
  };
}

export function deriveAnchorConclusion(spot: number): { text: string; detail: string; color: string } {
  if (spot < 55) return {
    text: 'BELOW PRODUCTION COST',
    detail: 'Miners are losing money. Supply will contract. Historically, this has preceded major bull runs. Last seen: 2016-2020.',
    color: 'bullish',
  };
  if (spot < 80) return {
    text: 'RESTART ZONE',
    detail: 'Enough to keep existing mines running and restart some mothballed capacity. Not enough to incentivise new mines. Supply growth limited.',
    color: 'primary',
  };
  if (spot < 100) return {
    text: 'GREENFIELD INCENTIVE',
    detail: 'Price is high enough to justify building new mines, but construction takes 10-15 years. Supply response will be slow.',
    color: 'neutral',
  };
  return {
    text: 'SHORTAGE PRICING',
    detail: 'Utilities competing for limited supply. Historically short-lived but can persist for 1-3 years (see 2007).',
    color: 'bearish',
  };
}

// ──────────────────────────────────────────────
// FORCES — Supply/demand gap
// ──────────────────────────────────────────────

export interface UraniumForcesResult {
  annualDemand: number;
  primarySupply: number;
  secondarySupply: number;
  totalSupply: number;
  deficit: number;
  deficitPct: number;
  demandSignal: 'accelerating' | 'stable' | 'decelerating';
  supplySignal: 'tightening' | 'stable' | 'expanding';
  contractingSignal: 'early_stage' | 'mid_cycle' | 'late_cycle';
}

export function computeUraniumForces(sd: UraniumSupplyDemand[]): UraniumForcesResult | null {
  if (!sd.length) return null;
  const sorted = [...sd].sort((a, b) => a.quarter.localeCompare(b.quarter));
  
  // Use latest 4 quarters to annualise
  const recent = sorted.slice(-4);
  const annualDemand = recent.reduce((s, q) => s + q.reactor_demand_mlb, 0);
  const primarySupply = recent.reduce((s, q) => s + q.mine_production_mlb, 0);
  const secondarySupply = recent.reduce((s, q) => s + q.secondary_supply_mlb, 0);
  const totalSupply = primarySupply + secondarySupply;
  const deficit = totalSupply - annualDemand;
  const deficitPct = (deficit / annualDemand) * 100;

  // Trend signals — compare first 4 vs last 4 quarters
  const early = sorted.slice(0, Math.min(4, sorted.length));
  const earlyDemand = early.reduce((s, q) => s + q.reactor_demand_mlb, 0);
  const demandGrowth = annualDemand - earlyDemand;
  const demandSignal = demandGrowth > 5 ? 'accelerating' : demandGrowth < -5 ? 'decelerating' : 'stable';

  const earlySupply = early.reduce((s, q) => s + q.mine_production_mlb + q.secondary_supply_mlb, 0);
  const supplyGrowth = totalSupply - earlySupply;
  const supplySignal = supplyGrowth < -5 ? 'tightening' : supplyGrowth > 5 ? 'expanding' : 'stable';

  const latestContracting = recent.reduce((s, q) => s + q.contracting_mlb, 0);
  const contractingSignal = latestContracting < 130 ? 'early_stage' : latestContracting < 170 ? 'mid_cycle' : 'late_cycle';

  return {
    annualDemand,
    primarySupply,
    secondarySupply,
    totalSupply,
    deficit,
    deficitPct,
    demandSignal,
    supplySignal,
    contractingSignal,
  };
}

// ──────────────────────────────────────────────
// LEVERAGE — Miner/uranium ratio
// ──────────────────────────────────────────────

export interface MinerValuation {
  ticker: string;
  company: string;
  p_nav: number;
  ev_per_lb: number;
  nav_usd_bn: number;
  resources_mlb: number;
  jurisdiction: string;
  stage: string;
  updated_at: string;
}

export interface UraniumLeverageResult {
  sectorPNAV: number;
  historicalAvgPNAV: number;
  valuations: MinerValuation[];
  currentURNMPrice: number;
  currentU3O8Price: number;
  // Keep ratio series for charts
  currentRatio: number;
  medianRatio: number;
  currentPercentile: number;
  ratioSeries: { date: string; value: number }[];
}

export function computeUraniumLeverage(
  uraniumPrices: UraniumPrice[],
  minerPrices: { date: string; close_price: number; ticker: string }[],
  valuations?: MinerValuation[],
): UraniumLeverageResult | null {
  const urnmPrices = minerPrices.filter(p => p.ticker === 'URNM').sort((a, b) => a.date.localeCompare(b.date));
  if (!urnmPrices.length || !uraniumPrices.length) return null;

  const uraniumMap = new Map<string, number>();
  uraniumPrices.forEach(p => uraniumMap.set(p.date.substring(0, 7), p.spot_price));

  const ratioSeries: { date: string; value: number }[] = [];
  const ratioValues: number[] = [];

  for (const mp of urnmPrices) {
    const month = mp.date.substring(0, 7);
    let uPrice = uraniumMap.get(month);
    if (!uPrice) {
      const d = new Date(mp.date);
      d.setMonth(d.getMonth() - 1);
      uPrice = uraniumMap.get(d.toISOString().substring(0, 7));
    }
    if (uPrice && uPrice > 0) {
      const ratio = mp.close_price / uPrice;
      ratioSeries.push({ date: mp.date, value: ratio });
      ratioValues.push(ratio);
    }
  }

  if (!ratioValues.length) return null;

  const currentRatio = ratioValues[ratioValues.length - 1];
  const sorted = [...ratioValues].sort((a, b) => a - b);
  const medianRatio = sorted[Math.floor(sorted.length / 2)];
  const below = sorted.filter(v => v < currentRatio).length;
  const currentPercentile = (below / sorted.length) * 100;

  const u3o8Prices = minerPrices.filter(p => p.ticker === 'U3O8').sort((a, b) => a.date.localeCompare(b.date));
  const currentURNMPrice = urnmPrices[urnmPrices.length - 1].close_price;
  const currentU3O8Price = u3o8Prices.length ? u3o8Prices[u3o8Prices.length - 1].close_price : 0;

  // Compute sector-weighted P/NAV from valuations
  const vals = valuations && valuations.length > 0 ? valuations : [];
  let sectorPNAV = 1.5; // fallback
  if (vals.length > 0) {
    // Use etf_holdings weights if available, otherwise simple average
    const totalWeight = vals.reduce((s, v) => s + (v.nav_usd_bn || 1), 0);
    sectorPNAV = vals.reduce((s, v) => s + v.p_nav * (v.nav_usd_bn || 1), 0) / totalWeight;
  }

  return {
    sectorPNAV,
    historicalAvgPNAV: 1.2,
    valuations: vals,
    currentURNMPrice,
    currentU3O8Price,
    currentRatio,
    medianRatio,
    currentPercentile,
    ratioSeries,
  };
}

// ──────────────────────────────────────────────
// POSITIONING
// ──────────────────────────────────────────────

export function deriveUraniumPositioning(
  zone: UraniumZone,
  deficitPct: number,
  minerPercentile: number,
): { text: string; color: string; detail: string } {
  const deficitWidening = deficitPct < -10;
  const deficitStable = deficitPct >= -10 && deficitPct <= 0;
  const minersCheap = minerPercentile < 25;
  const minersFair = minerPercentile >= 25 && minerPercentile <= 75;

  if (zone === 'below_aisc' && deficitWidening && minersCheap)
    return { text: 'STRONG BUY MINERS', color: 'bullish', detail: 'Commodity below cost, demand rising, miners discounted' };
  if (zone === 'below_aisc')
    return { text: 'ACCUMULATE ON WEAKNESS', color: 'bullish', detail: 'Below production cost — supply will contract' };
  if (zone === 'restart' && deficitWidening && minersCheap)
    return { text: 'ACCUMULATE MINERS', color: 'bullish', detail: 'Supply response limited, deficit deepening, miners cheap' };
  if (zone === 'restart' && deficitWidening && minersFair)
    return { text: 'ACCUMULATE ON PULLBACKS', color: 'primary', detail: 'Thesis intact but wait for better entry' };
  if (zone === 'restart' && deficitStable)
    return { text: 'HOLD', color: 'neutral', detail: 'Equilibrium — watch contracting cycle' };
  if (zone === 'greenfield' && deficitWidening && minersCheap)
    return { text: 'HOLD / ADD SELECTIVELY', color: 'primary', detail: 'Price incentivising new supply but slowly' };
  if (zone === 'greenfield')
    return { text: 'HOLD CAUTIOUSLY', color: 'neutral', detail: 'Supply response beginning — be patient' };
  if (zone === 'shortage')
    return { text: 'TAKE PROFITS', color: 'bearish', detail: 'Historically unsustainable — lock in gains' };

  return { text: 'HOLD', color: 'neutral', detail: 'Mixed signals — maintain allocation' };
}

// Historical annotations for the chart
export const URANIUM_ANNOTATIONS = [
  { date: '1979-03-28', label: 'Three Mile Island', detail: 'Partial meltdown at TMI reactor in Pennsylvania. US nuclear expansion halts. Uranium demand outlook collapses. Beginning of a 20-year bear market.', important: true },
  { date: '1986-04-26', label: 'Chernobyl disaster', detail: 'Catastrophic reactor explosion in Ukraine. Global anti-nuclear sentiment surges. European countries begin phase-out programmes. Uranium enters deep bear market — spot falls below $10/lb.', important: true },
  { date: '1993-01-01', label: 'HEU Agreement', detail: 'Russia agrees to downblend 500 tonnes of weapons-grade uranium into reactor fuel for US plants. This floods the market with cheap secondary supply for 20 years, suppressing mine production globally.', important: false },
  { date: '2003-01-01', label: 'Uranium bull begins', detail: 'Spot at $10/lb after decades of underinvestment. Chinese nuclear build-out accelerating. HEU deal winding down. Supply deficit emerging. Spot will rally from $10 to $136 in 4 years.', important: false },
  { date: '2007-06-01', label: 'U hits $136 — ATH', detail: 'Cigar Lake mine flood + Chinese demand + hedge fund speculation. Utilities panic-contract at any price. The price is unsustainable — most is speculative. Spot collapses afterward.', important: true },
  { date: '2011-03-11', label: 'Fukushima disaster', detail: 'Tsunami destroys three reactors in Japan. All 54 Japanese reactors shut down. Germany announces full nuclear phase-out. Uranium spot collapses from $70 to $28 over the next 5 years.', important: true },
  { date: '2016-11-01', label: 'U hits $18 — cycle low', detail: 'Decade-low. Most mines unprofitable. Cameco shuts McArthur River. Kazatomprom announces production cuts. The supply destruction that sets up the next bull market.', important: true },
  { date: '2021-09-01', label: 'Sprott Trust launches', detail: 'Sprott begins buying physical uranium on the spot market, removing ~40 Mlb from available supply. Financial buyers enter the market for the first time at scale.', important: false },
  { date: '2022-02-24', label: 'Russia invades Ukraine', detail: 'Russia supplies ~35% of global enrichment and ~13% of uranium. Sanctions disrupt nuclear fuel supply chains. Western utilities scramble to diversify.', important: false },
  { date: '2023-07-01', label: 'Niger coup', detail: 'Military junta seizes power in Niger, disrupting uranium production from SOMAÏR (~5% of EU requirements). Highlights concentration risk.', important: false },
  { date: '2024-01-15', label: 'U hits $106', detail: 'Spot breaks $100 for first time since 2007. Driven by Sprott buying, utility contracting acceleration, and supply disappointments.', important: true },
  { date: '2024-05-01', label: 'US bans Russian U', detail: 'PREU Act signed. Phases out Russian LEU imports by 2028. Forces US utilities to find alternative enrichment.', important: false },
  { date: '2025-01-01', label: 'Trump: quadruple nuclear', detail: 'Executive order to quadruple US nuclear capacity by 2050. Would require doubling global uranium production. $80B pledged for new AP1000 reactors.', important: false },
  { date: '2026-01-01', label: 'TODAY — Spot ~$78', detail: 'Long-term contracts at $86 — 14-year high. Mining equities reprice. Utilities still undercontracted. The structural deficit continues to build.', important: true },
];

// Projection constants
export const URANIUM_PROJECTIONS = {
  greenfieldInflation: 0.035, // greenfield cost rises ~3.5%/year with inflation
  currentGreenfieldLow: 85,
  currentGreenfieldHigh: 100,
  goldmanTarget1Y: 91,
  supplyGapEV: { '1y': 95, '3y': 120, '5y': 140, '10y': 160 },
  pnavProjected: { '1y': 1.4, '3y': 1.3, '5y': 1.2, '10y': 1.1 },
};

export function deriveLeverageConclusion(sectorPNAV: number): { text: string; detail: string; color: string } {
  if (sectorPNAV < 0.8) return {
    text: 'DEEPLY UNDERVALUED — Miners below NAV',
    detail: 'You\'re buying uranium in the ground for less than it\'s worth. This level has historically preceded 2-3× rallies in miner equities.',
    color: 'bullish',
  };
  if (sectorPNAV < 1.0) return {
    text: 'UNDERVALUED — Below asset value',
    detail: 'Miners trading at a discount to their uranium reserves. Attractive entry for patient investors.',
    color: 'bullish',
  };
  if (sectorPNAV < 1.3) return {
    text: 'FAIR VALUE — Near historical average',
    detail: 'Miners are priced roughly in line with the value of their reserves. Returns from here depend on uranium price appreciation.',
    color: 'primary',
  };
  if (sectorPNAV < 2.0) return {
    text: 'ABOVE AVERAGE — Paying a growth premium',
    detail: 'Miners are pricing in future uranium price increases and project development. Add on pullbacks, don\'t chase.',
    color: 'neutral',
  };
  return {
    text: 'EXPENSIVE — Significant premium to NAV',
    detail: 'Miners have front-run the uranium price. Historical P/NAVs above 2.0× have preceded corrections. Take profits or wait.',
    color: 'bearish',
  };
}
