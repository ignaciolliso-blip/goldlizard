export const FRED_SERIES = [
  { id: 'DFII10', name: '10Y Real Yield (TIPS)', unit: '%' },
  { id: 'DTWEXBGS', name: 'US Dollar Index', unit: 'index' },
  { id: 'DCOILBRENTEU', name: 'Brent Crude Oil', unit: '$/barrel' },
  { id: 'VIXCLS', name: 'CBOE VIX', unit: 'index' },
  { id: 'T10YIE', name: '10Y Breakeven Inflation', unit: '%' },
  { id: 'DFF', name: 'Fed Funds Rate', unit: '%' },
  { id: 'WM2NS', name: 'M2 Money Supply', unit: 'billions' },
  { id: 'GFDEGDQ188S', name: 'Federal Debt/GDP', unit: '%' },
  { id: 'CPIAUCSL', name: 'CPI All Urban', unit: 'index' },
] as const;

export type FredSeriesId = typeof FRED_SERIES[number]['id'];

// Three-tier architecture
export type TierName = 'structural' | 'demand' | 'conditions';

export interface VariableConfig {
  id: string;
  name: string;
  tier: TierName;
  weight: number;
  unit: string;
  invert: boolean;
  showCard: boolean; // false for Brent (background variable)
}

export const VARIABLE_CONFIG: VariableConfig[] = [
  // Tier 1: Structural Debasement (30%)
  { id: 'WM2NS_DEV', name: 'M2 Cumulative Deviation', tier: 'structural', weight: 0.12, unit: '%', invert: false, showCard: true },
  { id: 'GFDEGDQ188S', name: 'US Debt/GDP', tier: 'structural', weight: 0.10, unit: '%', invert: false, showCard: true },
  { id: 'REAL_FFR', name: 'Real Fed Funds Rate', tier: 'structural', weight: 0.08, unit: '%', invert: true, showCard: true },

  // Tier 2: Demand Flows (35%)
  { id: 'PHYSICAL_DEMAND', name: 'Physical Gold Demand', tier: 'demand', weight: 0.20, unit: 't/qtr', invert: false, showCard: true },
  { id: 'ETF_FLOWS', name: 'Gold ETF Flows', tier: 'demand', weight: 0.15, unit: '$B/mo', invert: false, showCard: true },

  // Tier 3: Market Conditions (35%)
  { id: 'DFII10', name: '10Y Real Yield', tier: 'conditions', weight: 0.12, unit: '%', invert: true, showCard: true },
  { id: 'DTWEXBGS', name: 'US Dollar Index', tier: 'conditions', weight: 0.09, unit: 'index', invert: true, showCard: true },
  { id: 'T10YIE', name: 'Breakeven Inflation', tier: 'conditions', weight: 0.06, unit: '%', invert: false, showCard: true },
  { id: 'VIXCLS', name: 'VIX', tier: 'conditions', weight: 0.04, unit: 'index', invert: false, showCard: true },
  { id: 'DCOILBRENTEU', name: 'Brent Crude', tier: 'conditions', weight: 0.04, unit: '$/bbl', invert: false, showCard: false },
];

// Variables to invert (higher = bearish for gold)
export const INVERT_SERIES: string[] = VARIABLE_CONFIG.filter(v => v.invert).map(v => v.id);

// Fixed empirical weights (keyed by variable id)
export const FIXED_WEIGHTS: Record<string, number> = Object.fromEntries(
  VARIABLE_CONFIG.map(v => [v.id, v.weight])
);

export const TIER_LABELS: Record<TierName, string> = {
  structural: 'STRUCTURAL DEBASEMENT',
  demand: 'DEMAND FLOWS',
  conditions: 'MARKET CONDITIONS',
};

export const CACHE_TTL_HOURS = 6;

// Projection assumptions defaults
export interface ProjectionRow {
  variableId: string;
  current: number;
  '3m': number;
  '6m': number;
  '1y': number;
  '3y': number;
  '5y': number;
  method: string;
  confidence: number; // 1-5 stars
}

export const DEFAULT_PROJECTIONS: Omit<ProjectionRow, 'current'>[] = [
  { variableId: 'WM2NS_DEV', '3m': 0.5, '6m': 1.0, '1y': 2.0, '3y': 8, '5y': 15, method: 'Historical 5-7% annual M2 growth compounds above trend', confidence: 4 },
  { variableId: 'GFDEGDQ188S', '3m': 122, '6m': 124, '1y': 127, '3y': 135, '5y': 142, method: 'CBO 10-year baseline projection', confidence: 5 },
  { variableId: 'REAL_FFR', '3m': 0.3, '6m': 0.0, '1y': -0.3, '3y': -0.5, '5y': -0.3, method: 'Fed Funds futures + structural attractor toward negative', confidence: 3 },
  { variableId: 'PHYSICAL_DEMAND', '3m': 500, '6m': 490, '1y': 470, '3y': 400, '5y': 350, method: 'S-curve saturation: CB target 25% reserves, current 20%', confidence: 3 },
  { variableId: 'ETF_FLOWS', '3m': 5, '6m': 4, '1y': 3, '3y': 2, '5y': 2, method: 'Mean reversion from extreme; partially rate-dependent', confidence: 2 },
  { variableId: 'DFII10', '3m': 1.8, '6m': 1.5, '1y': 1.2, '3y': 0.8, '5y': 1.0, method: 'TIPS term structure + gradual easing', confidence: 2 },
  { variableId: 'DTWEXBGS', '3m': 98, '6m': 96, '1y': 94, '3y': 90, '5y': 88, method: 'JPM: DXY ~9% overvalued; structural weakening', confidence: 2 },
  { variableId: 'T10YIE', '3m': 2.5, '6m': 2.6, '1y': 2.7, '3y': 2.5, '5y': 2.4, method: 'Elevated near-term from oil; normalise long-term', confidence: 2 },
  { variableId: 'VIXCLS', '3m': 20, '6m': 19, '1y': 18, '3y': 17, '5y': 17, method: 'Mean reversion to long-run 17-18', confidence: 1 },
  { variableId: 'DCOILBRENTEU', '3m': 90, '6m': 80, '1y': 75, '3y': 70, '5y': 70, method: 'Futures curve + war-premium fade assumption', confidence: 1 },
];
