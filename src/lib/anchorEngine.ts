import type { Observation } from './dataFetcher';

export interface AnchorResult {
  goldCPIRatio: number;
  goldM2Ratio: number;
  cpiFairValue: number;
  m2FairValue: number;
  historicalAvgGoldCPIRatio: number;
  historicalAvgGoldM2Ratio: number;
  currentGoldPrice: number;
  currentCPI: number;
  currentM2: number;
  // Historical series for charting
  goldCPIRatioSeries: Observation[];
  goldM2RatioSeries: Observation[];
}

function computeRatioSeries(
  gold: Observation[],
  other: Observation[],
): Observation[] {
  const otherMap = new Map<string, number>();
  other.forEach(o => otherMap.set(o.date.substring(0, 7), o.value));

  const result: Observation[] = [];
  let lastOther: number | null = null;

  for (const g of gold) {
    const month = g.date.substring(0, 7);
    if (otherMap.has(month)) lastOther = otherMap.get(month)!;
    if (lastOther && lastOther > 0) {
      result.push({ date: g.date, value: g.value / lastOther });
    }
  }
  return result;
}

function averageAfterDate(series: Observation[], afterDate: string): number {
  const filtered = series.filter(o => o.date >= afterDate);
  if (filtered.length === 0) return 0;
  return filtered.reduce((s, o) => s + o.value, 0) / filtered.length;
}

export function computeAnchor(
  goldSpot: Observation[],
  cpiData: Observation[],
  m2Data: Observation[],
  baselineStart: '1971' | '2000' = '2000',
): AnchorResult | null {
  if (!goldSpot.length || !cpiData.length || !m2Data.length) return null;

  const startDate = baselineStart === '2000' ? '2000-01-01' : '1971-01-01';

  // Convert weekly M2 to monthly (last obs per month)
  const m2Monthly: Observation[] = [];
  const m2MonthMap = new Map<string, number>();
  for (const o of m2Data) {
    m2MonthMap.set(o.date.substring(0, 7), o.value);
  }
  for (const [month, value] of Array.from(m2MonthMap.entries()).sort()) {
    m2Monthly.push({ date: `${month}-01`, value });
  }

  const goldCPIRatioSeries = computeRatioSeries(goldSpot, cpiData);
  const goldM2RatioSeries = computeRatioSeries(goldSpot, m2Monthly);

  const historicalAvgGoldCPIRatio = averageAfterDate(goldCPIRatioSeries, startDate);
  const historicalAvgGoldM2Ratio = averageAfterDate(goldM2RatioSeries, startDate);

  const currentGoldPrice = goldSpot[goldSpot.length - 1].value;
  const currentCPI = cpiData[cpiData.length - 1].value;

  // Get latest M2
  const m2Sorted = m2Monthly.sort((a, b) => a.date.localeCompare(b.date));
  const currentM2 = m2Sorted[m2Sorted.length - 1]?.value || 0;

  const goldCPIRatio = currentCPI > 0 ? currentGoldPrice / currentCPI : 0;
  const goldM2Ratio = currentM2 > 0 ? currentGoldPrice / currentM2 : 0;

  const cpiFairValue = historicalAvgGoldCPIRatio * currentCPI;
  const m2FairValue = historicalAvgGoldM2Ratio * currentM2;

  return {
    goldCPIRatio,
    goldM2Ratio,
    cpiFairValue,
    m2FairValue,
    historicalAvgGoldCPIRatio,
    historicalAvgGoldM2Ratio,
    currentGoldPrice,
    currentCPI,
    currentM2,
    goldCPIRatioSeries,
    goldM2RatioSeries,
  };
}
