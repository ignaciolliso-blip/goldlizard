import type { Observation } from './dataFetcher';

export interface MinerPrice {
  date: string;
  ticker: string;
  close_price: number;
}

export interface LeverageResult {
  currentGDXGoldRatio: number;
  medianRatio: number;
  currentPercentile: number;
  ratioSeries: Observation[];
}

function percentileRank(value: number, arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return (below / sorted.length) * 100;
}

export function computeLeverage(
  goldSpot: Observation[],
  minerPrices: MinerPrice[],
): LeverageResult | null {
  if (!goldSpot.length || !minerPrices.length) return null;

  const goldMap = new Map<string, number>();
  goldSpot.forEach(o => goldMap.set(o.date.substring(0, 7), o.value));

  const ratioSeries: Observation[] = [];
  const ratioValues: number[] = [];

  for (const mp of minerPrices.sort((a, b) => a.date.localeCompare(b.date))) {
    const month = mp.date.substring(0, 7);
    // Find closest gold price
    let goldPrice = goldMap.get(month);
    if (!goldPrice) {
      // Try previous month
      const d = new Date(mp.date);
      d.setMonth(d.getMonth() - 1);
      const prevMonth = d.toISOString().substring(0, 7);
      goldPrice = goldMap.get(prevMonth);
    }
    if (goldPrice && goldPrice > 0) {
      const ratio = mp.close_price / goldPrice;
      ratioSeries.push({ date: mp.date, value: ratio });
      ratioValues.push(ratio);
    }
  }

  if (ratioValues.length === 0) return null;

  const currentRatio = ratioValues[ratioValues.length - 1];
  const sorted = [...ratioValues].sort((a, b) => a - b);
  const medianRatio = sorted[Math.floor(sorted.length / 2)];
  const currentPercentile = percentileRank(currentRatio, ratioValues);

  return {
    currentGDXGoldRatio: currentRatio,
    medianRatio,
    currentPercentile,
    ratioSeries,
  };
}

export function projectGDXGoldRatio(
  currentRatio: number,
  medianRatio: number,
  yearsForward: number,
): number {
  const halfLife = 2.5;
  const decayFactor = Math.pow(0.5, yearsForward / halfLife);
  return medianRatio + (currentRatio - medianRatio) * decayFactor;
}
