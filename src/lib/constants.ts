export const FRED_SERIES = [
  { id: 'DFII10', name: '10Y Real Yield (TIPS)', unit: '%' },
  { id: 'DTWEXBGS', name: 'US Dollar Index', unit: 'index' },
  { id: 'DCOILBRENTEU', name: 'Brent Crude Oil', unit: '$/barrel' },
  { id: 'VIXCLS', name: 'CBOE VIX', unit: 'index' },
  { id: 'T10YIE', name: '10Y Breakeven Inflation', unit: '%' },
  { id: 'DFF', name: 'Fed Funds Rate', unit: '%' },
  { id: 'T10Y2Y', name: '10Y-2Y Spread', unit: '%' },
] as const;

export type FredSeriesId = typeof FRED_SERIES[number]['id'];

// Variables to invert (higher = bearish for gold)
export const INVERT_SERIES: FredSeriesId[] = ['DFII10', 'DTWEXBGS', 'DFF', 'T10Y2Y'];

// Fixed empirical weights
export const FIXED_WEIGHTS: Record<string, number> = {
  DFII10: 0.28,
  DTWEXBGS: 0.18,
  central_bank_gold: 0.14,
  T10Y2Y: 0.10,
  VIXCLS: 0.08,
  DCOILBRENTEU: 0.08,
  T10YIE: 0.07,
  DFF: 0.07,
};

export const CACHE_TTL_HOURS = 6;
