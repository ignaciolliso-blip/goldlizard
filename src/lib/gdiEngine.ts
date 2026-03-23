import { Observation, CentralBankEntry } from './dataFetcher';
import { FIXED_WEIGHTS, INVERT_SERIES } from './constants';

interface AlignedRow {
  date: string;
  [key: string]: number | string;
}

// Get all unique business days across all series
function getCommonDates(allSeries: Record<string, Observation[]>): string[] {
  const dateSet = new Set<string>();
  Object.values(allSeries).forEach(obs => {
    obs.forEach(o => dateSet.add(o.date));
  });
  return Array.from(dateSet).sort();
}

// Forward-fill a series to align with dates
function forwardFill(observations: Observation[], dates: string[]): Map<string, number> {
  const map = new Map<string, number>();
  observations.forEach(o => map.set(o.date, o.value));

  const result = new Map<string, number>();
  let lastVal: number | null = null;

  for (const d of dates) {
    if (map.has(d)) {
      lastVal = map.get(d)!;
    }
    if (lastVal !== null) {
      result.set(d, lastVal);
    }
  }
  return result;
}

// Convert quarterly CB data to daily step function
function cbToDailyMap(cbData: CentralBankEntry[], dates: string[]): Map<string, number> {
  // Parse quarters to date ranges
  const quarterToDate = (q: string): string => {
    const [year, qNum] = q.split('-Q');
    const month = (parseInt(qNum) - 1) * 3 + 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  };

  const sorted = [...cbData].sort((a, b) => a.quarter.localeCompare(b.quarter));
  const cbMap = new Map<string, number>();
  sorted.forEach(entry => {
    cbMap.set(quarterToDate(entry.quarter), entry.tonnes);
  });

  const result = new Map<string, number>();
  let lastVal: number | null = null;
  const cbDates = Array.from(cbMap.keys()).sort();

  for (const d of dates) {
    // Find latest CB date <= d
    for (const cd of cbDates) {
      if (cd <= d) lastVal = cbMap.get(cd)!;
    }
    if (lastVal !== null) result.set(d, lastVal);
  }

  return result;
}

// Rolling mean and std
function rollingStats(values: number[], windowSize: number): { mean: number; std: number } {
  const window = values.slice(-windowSize);
  if (window.length < 20) return { mean: 0, std: 1 }; // avoid div by zero
  const mean = window.reduce((s, v) => s + v, 0) / window.length;
  const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / window.length;
  return { mean, std: Math.sqrt(variance) || 1 };
}

export interface GDIResult {
  dates: string[];
  gdiValues: number[];
  variableDetails: VariableDetail[];
  alignedData: Map<string, Map<string, number>>;
}

export interface VariableDetail {
  id: string;
  name: string;
  currentValue: number;
  zScore: number;
  adjustedZScore: number;
  weight: number;
  contribution: number;
}

const VARIABLE_NAMES: Record<string, string> = {
  DFII10: '10Y Real Yield',
  DTWEXBGS: 'US Dollar Index',
  DCOILBRENTEU: 'Brent Crude',
  VIXCLS: 'VIX',
  T10YIE: 'Breakeven Inflation',
  DFF: 'Fed Funds Rate',
  T10Y2Y: '10Y-2Y Spread',
  central_bank_gold: 'CB Gold Purchases',
};

export function calculateGDI(
  fredData: Record<string, Observation[]>,
  centralBank: CentralBankEntry[],
  errors: string[],
  weightMode: 'fixed' | 'rolling' = 'fixed',
  goldData?: Observation[]
): GDIResult {
  // Filter out errored series
  const availableFred = Object.fromEntries(
    Object.entries(fredData).filter(([id]) => !errors.includes(id))
  );

  // Get common dates from 2015 onwards
  const allDates = getCommonDates(availableFred).filter(d => d >= '2015-01-01');

  // Align all FRED series
  const aligned = new Map<string, Map<string, number>>();
  Object.entries(availableFred).forEach(([id, obs]) => {
    aligned.set(id, forwardFill(obs, allDates));
  });

  // Add central bank data
  aligned.set('central_bank_gold', cbToDailyMap(centralBank, allDates));

  // ~2520 trading days in 10 years
  const ROLLING_WINDOW = 2520;

  // Determine weights
  let weights = { ...FIXED_WEIGHTS };

  // Remove unavailable series and renormalize
  const availableVars = Array.from(aligned.keys()).filter(
    id => weights[id] !== undefined
  );

  if (weightMode === 'rolling' && goldData && goldData.length > 0) {
    weights = computeRollingWeights(aligned, goldData, allDates, availableVars);
  }

  // Renormalize weights for available vars
  const totalWeight = availableVars.reduce((s, id) => s + (weights[id] || 0), 0);
  const normWeights: Record<string, number> = {};
  availableVars.forEach(id => {
    normWeights[id] = (weights[id] || 0) / totalWeight;
  });

  // Calculate GDI for each date
  const gdiValues: number[] = [];

  for (let i = 0; i < allDates.length; i++) {
    const date = allDates[i];
    let gdi = 0;

    for (const varId of availableVars) {
      const series = aligned.get(varId)!;
      const val = series.get(date);
      if (val === undefined) continue;

      // Collect trailing window values
      const windowVals: number[] = [];
      for (let j = Math.max(0, i - ROLLING_WINDOW); j <= i; j++) {
        const v = series.get(allDates[j]);
        if (v !== undefined) windowVals.push(v);
      }

      const { mean, std } = rollingStats(windowVals, ROLLING_WINDOW);
      let z = (val - mean) / std;

      // Directional adjustment
      if (INVERT_SERIES.includes(varId as any)) {
        z *= -1;
      }

      gdi += normWeights[varId] * z;
    }

    gdiValues.push(gdi);
  }

  // Compute current variable details (last date)
  const lastIdx = allDates.length - 1;
  const lastDate = allDates[lastIdx];
  const variableDetails: VariableDetail[] = [];

  for (const varId of availableVars) {
    const series = aligned.get(varId)!;
    const val = series.get(lastDate);
    if (val === undefined) continue;

    const windowVals: number[] = [];
    for (let j = Math.max(0, lastIdx - ROLLING_WINDOW); j <= lastIdx; j++) {
      const v = series.get(allDates[j]);
      if (v !== undefined) windowVals.push(v);
    }

    const { mean, std } = rollingStats(windowVals, ROLLING_WINDOW);
    let z = (val - mean) / std;
    const rawZ = z;

    if (INVERT_SERIES.includes(varId as any)) {
      z *= -1;
    }

    variableDetails.push({
      id: varId,
      name: VARIABLE_NAMES[varId] || varId,
      currentValue: val,
      zScore: rawZ,
      adjustedZScore: z,
      weight: normWeights[varId],
      contribution: normWeights[varId] * z,
    });
  }

  // Sort by absolute contribution descending
  variableDetails.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return { dates: allDates, gdiValues, variableDetails, alignedData: aligned };
}

function computeRollingWeights(
  aligned: Map<string, Map<string, number>>,
  goldData: Observation[],
  allDates: string[],
  availableVars: string[]
): Record<string, number> {
  const goldMap = new Map<string, number>();
  goldData.forEach(o => goldMap.set(o.date, o.value));

  // Weekly returns for last 52 weeks (~260 trading days)
  const recentDates = allDates.slice(-260);
  const weeklyDates: string[] = [];
  for (let i = 0; i < recentDates.length; i += 5) {
    weeklyDates.push(recentDates[i]);
  }

  function weeklyReturns(series: Map<string, number>): number[] {
    const returns: number[] = [];
    for (let i = 1; i < weeklyDates.length; i++) {
      const prev = series.get(weeklyDates[i - 1]);
      const curr = series.get(weeklyDates[i]);
      if (prev && curr && prev !== 0) {
        returns.push((curr - prev) / prev);
      } else {
        returns.push(0);
      }
    }
    return returns;
  }

  // Gold weekly returns (use FRED gold if spot unavailable)
  const goldSeries = aligned.get('GOLDPMGBD228NLBM') || new Map();
  const goldReturns = weeklyReturns(goldMap.size > 0 ? goldMap as any : goldSeries);

  const correlations: Record<string, number> = {};
  for (const varId of availableVars) {
    const series = aligned.get(varId)!;
    const varReturns = weeklyReturns(series);
    correlations[varId] = Math.abs(pearsonCorrelation(goldReturns, varReturns));
  }

  // Normalize
  const total = Object.values(correlations).reduce((s, v) => s + v, 0);
  const weights: Record<string, number> = {};
  availableVars.forEach(id => {
    weights[id] = total > 0 ? correlations[id] / total : 1 / availableVars.length;
  });

  return weights;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}
