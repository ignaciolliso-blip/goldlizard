import { Observation } from './dataFetcher';
import { VARIABLE_CONFIG, FIXED_WEIGHTS, INVERT_SERIES, type TierName } from './constants';

export interface CentralBankEntry {
  quarter: string;
  tonnes: number;
  bar_coin_tonnes?: number;
}

export interface EtfFlowEntry {
  month: string;
  flows_usd_bn: number;
  holdings_tonnes: number;
}

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

// Convert quarterly data to daily step function
function quarterlyToDailyMap(data: { date: string; value: number }[], dates: string[]): Map<string, number> {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const result = new Map<string, number>();
  let lastVal: number | null = null;

  for (const d of dates) {
    for (const entry of sorted) {
      if (entry.date <= d) lastVal = entry.value;
    }
    if (lastVal !== null) result.set(d, lastVal);
  }
  return result;
}

function quarterToDate(q: string): string {
  const [year, qNum] = q.split('-Q');
  const month = (parseInt(qNum) - 1) * 3 + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

// Rolling mean and std
function rollingStats(values: number[], windowSize: number): { mean: number; std: number } {
  const window = values.slice(-windowSize);
  if (window.length < 20) return { mean: 0, std: 1 };
  const mean = window.reduce((s, v) => s + v, 0) / window.length;
  const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / window.length;
  return { mean, std: Math.sqrt(variance) || 1 };
}

// Compute M2 cumulative deviation from 20-year exponential trend
function computeM2Deviation(m2Data: Observation[]): Observation[] {
  if (m2Data.length < 52) return [];

  // Convert weekly to monthly (take last observation per month)
  const monthlyMap = new Map<string, number>();
  for (const o of m2Data) {
    const monthKey = o.date.substring(0, 7);
    monthlyMap.set(monthKey, o.value);
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ date: `${month}-01`, value }));

  if (monthly.length < 24) return monthly.map(m => ({ date: m.date, value: 0 }));

  // Fit exponential trend to first ~10 years (120 months) or available data
  const trendWindow = Math.min(120, Math.floor(monthly.length * 0.5));
  const baseValue = monthly[0].value;
  const endTrendValue = monthly[trendWindow - 1].value;
  const monthlyGrowthRate = Math.pow(endTrendValue / baseValue, 1 / trendWindow) - 1;

  // Compute deviation from trend at each point
  return monthly.map((m, i) => {
    const trendValue = baseValue * Math.pow(1 + monthlyGrowthRate, i);
    const deviation = ((m.value - trendValue) / trendValue) * 100; // as percentage
    return { date: m.date, value: deviation };
  });
}

// Compute Real Fed Funds Rate (DFF - CPI YoY)
function computeRealFFR(dff: Observation[], cpi: Observation[]): Observation[] {
  if (!dff.length || !cpi.length) return [];

  // Compute CPI YoY for each month
  const cpiByMonth = new Map<string, number>();
  for (const o of cpi) {
    cpiByMonth.set(o.date.substring(0, 7), o.value);
  }

  const cpiYoY = new Map<string, number>();
  const months = Array.from(cpiByMonth.keys()).sort();
  for (const m of months) {
    const [y, mo] = m.split('-').map(Number);
    const prevMonth = `${y - 1}-${String(mo).padStart(2, '0')}`;
    const current = cpiByMonth.get(m);
    const prev = cpiByMonth.get(prevMonth);
    if (current && prev && prev > 0) {
      cpiYoY.set(m, ((current - prev) / prev) * 100);
    }
  }

  // Forward-fill CPI YoY to daily DFF dates
  const result: Observation[] = [];
  let lastCpiYoY: number | null = null;
  for (const o of dff) {
    const month = o.date.substring(0, 7);
    if (cpiYoY.has(month)) {
      lastCpiYoY = cpiYoY.get(month)!;
    }
    if (lastCpiYoY !== null) {
      result.push({ date: o.date, value: o.value - lastCpiYoY });
    }
  }
  return result;
}

export interface TierContribution {
  structural: number;
  demand: number;
  conditions: number;
}

export interface GDIResult {
  dates: string[];
  gdiValues: number[];
  variableDetails: VariableDetail[];
  alignedData: Map<string, Map<string, number>>;
  tierContributions: TierContribution;
}

export interface VariableDetail {
  id: string;
  name: string;
  tier: TierName;
  currentValue: number;
  zScore: number;
  adjustedZScore: number;
  weight: number;
  contribution: number;
}

export function calculateGDI(
  fredData: Record<string, Observation[]>,
  centralBank: CentralBankEntry[],
  etfFlows: EtfFlowEntry[],
  errors: string[],
  weightMode: 'fixed' | 'rolling' = 'fixed',
  goldData?: Observation[]
): GDIResult {
  // Filter out errored series
  const availableFred = Object.fromEntries(
    Object.entries(fredData).filter(([id]) => !errors.includes(id))
  );

  // Get common dates from 2010 onwards
  const allDates = getCommonDates(availableFred).filter(d => d >= '2010-01-01');

  // Align all FRED series
  const aligned = new Map<string, Map<string, number>>();

  // Direct FRED series (Tier 3 + some Tier 1 inputs)
  for (const [id, obs] of Object.entries(availableFred)) {
    if (['DFII10', 'DTWEXBGS', 'DCOILBRENTEU', 'VIXCLS', 'T10YIE'].includes(id)) {
      aligned.set(id, forwardFill(obs, allDates));
    }
  }

  // Tier 1: M2 Cumulative Deviation
  if (availableFred['WM2NS']) {
    const m2Dev = computeM2Deviation(availableFred['WM2NS']);
    if (m2Dev.length > 0) {
      aligned.set('WM2NS_DEV', forwardFill(m2Dev, allDates));
    }
  }

  // Tier 1: Debt/GDP (quarterly, forward-fill)
  if (availableFred['GFDEGDQ188S']) {
    aligned.set('GFDEGDQ188S', forwardFill(availableFred['GFDEGDQ188S'], allDates));
  }

  // Tier 1: Real Fed Funds Rate
  if (availableFred['DFF'] && availableFred['CPIAUCSL']) {
    const realFFR = computeRealFFR(availableFred['DFF'], availableFred['CPIAUCSL']);
    if (realFFR.length > 0) {
      aligned.set('REAL_FFR', forwardFill(realFFR, allDates));
    }
  }

  // Tier 2: Physical Gold Demand (CB tonnes + bar/coin tonnes combined)
  if (centralBank.length > 0) {
    const demandEntries = centralBank.map(cb => ({
      date: quarterToDate(cb.quarter),
      value: cb.tonnes + (cb.bar_coin_tonnes || 0),
    }));
    aligned.set('PHYSICAL_DEMAND', quarterlyToDailyMap(demandEntries, allDates));
  }

  // Tier 2: ETF Flows
  if (etfFlows.length > 0) {
    const etfEntries = etfFlows.map(e => ({
      date: `${e.month}-01`,
      value: e.flows_usd_bn,
    }));
    aligned.set('ETF_FLOWS', forwardFill(etfEntries as Observation[], allDates));
  }

  const ROLLING_WINDOW = 2520; // ~10 years of trading days

  // Determine weights
  let weights = { ...FIXED_WEIGHTS };

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

  const invertSet = new Set(INVERT_SERIES);

  // Calculate GDI for each date
  const gdiValues: number[] = [];

  for (let i = 0; i < allDates.length; i++) {
    const date = allDates[i];
    let gdi = 0;

    for (const varId of availableVars) {
      const series = aligned.get(varId)!;
      const val = series.get(date);
      if (val === undefined) continue;

      const windowVals: number[] = [];
      for (let j = Math.max(0, i - ROLLING_WINDOW); j <= i; j++) {
        const v = series.get(allDates[j]);
        if (v !== undefined) windowVals.push(v);
      }

      const { mean, std } = rollingStats(windowVals, ROLLING_WINDOW);
      let z = (val - mean) / std;

      if (invertSet.has(varId)) {
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

    if (invertSet.has(varId)) {
      z *= -1;
    }

    const config = VARIABLE_CONFIG.find(c => c.id === varId);
    variableDetails.push({
      id: varId,
      name: config?.name || varId,
      tier: config?.tier || 'conditions',
      currentValue: val,
      zScore: rawZ,
      adjustedZScore: z,
      weight: normWeights[varId],
      contribution: normWeights[varId] * z,
    });
  }

  // Sort by absolute contribution descending
  variableDetails.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  // Compute tier contributions
  const tierContributions: TierContribution = { structural: 0, demand: 0, conditions: 0 };
  for (const v of variableDetails) {
    tierContributions[v.tier] += v.contribution;
  }

  return { dates: allDates, gdiValues, variableDetails, alignedData: aligned, tierContributions };
}

// Compute stats for projections (used for forward GDI)
export function getCurrentStats(
  aligned: Map<string, Map<string, number>>,
  dates: string[],
  varId: string
): { mean: number; std: number } {
  const series = aligned.get(varId);
  if (!series) return { mean: 0, std: 1 };
  const ROLLING_WINDOW = 2520;
  const lastIdx = dates.length - 1;
  const windowVals: number[] = [];
  for (let j = Math.max(0, lastIdx - ROLLING_WINDOW); j <= lastIdx; j++) {
    const v = series.get(dates[j]);
    if (v !== undefined) windowVals.push(v);
  }
  return rollingStats(windowVals, ROLLING_WINDOW);
}

function computeRollingWeights(
  aligned: Map<string, Map<string, number>>,
  goldData: Observation[],
  allDates: string[],
  availableVars: string[]
): Record<string, number> {
  const goldMap = new Map<string, number>();
  goldData.forEach(o => goldMap.set(o.date, o.value));

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

  const goldReturns = weeklyReturns(goldMap);

  const correlations: Record<string, number> = {};
  for (const varId of availableVars) {
    const series = aligned.get(varId)!;
    const varReturns = weeklyReturns(series);
    correlations[varId] = Math.abs(pearsonCorrelation(goldReturns, varReturns));
  }

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
