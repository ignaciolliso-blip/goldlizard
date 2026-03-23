export interface ScenarioConfig {
  last_refreshed: string;
  scenarios: Scenario[];
}

export interface Scenario {
  name: string;
  color: string;
  description: string;
  targets: {
    '3m': number;
    '6m': number;
    '1y': number;
    '3y': number;
    '5y': number;
  };
}

export interface ScenarioProbabilities {
  bull: number;
  base: number;
  bear: number;
}

export function computeScenarioProbabilities(gdi: number): ScenarioProbabilities {
  const temperature = 0.8;
  const centres = { bull: 1.5, base: 0.0, bear: -1.5 };
  const rawBull = Math.exp(-temperature * Math.pow(gdi - centres.bull, 2));
  const rawBase = Math.exp(-temperature * Math.pow(gdi - centres.base, 2));
  const rawBear = Math.exp(-temperature * Math.pow(gdi - centres.bear, 2));
  const total = rawBull + rawBase + rawBear;
  return {
    bull: rawBull / total,
    base: rawBase / total,
    bear: rawBear / total,
  };
}

export interface ForecastPoint {
  date: string;
  label: string;
  bull: number;
  base: number;
  bear: number;
  ev: number;
}

export interface BankConsensus {
  bank: string;
  price: number;
  date: string;
}

export const BANK_CONSENSUS: BankConsensus[] = [
  { bank: 'J.P. Morgan', price: 6300, date: '2026-12-31' },
  { bank: 'UBS', price: 6200, date: '2026-12-31' },
  { bank: 'Goldman Sachs', price: 5400, date: '2026-12-31' },
  { bank: 'Deutsche Bank', price: 6000, date: '2026-12-31' },
  { bank: 'Yardeni', price: 10000, date: '2029-12-31' },
];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function buildForecastPoints(
  currentPrice: number,
  scenarios: Scenario[],
  probs: ScenarioProbabilities,
  today: Date = new Date()
): ForecastPoint[] {
  const horizons: { label: string; months: number; key: keyof Scenario['targets'] }[] = [
    { label: 'Now', months: 0, key: '3m' },
    { label: '3M', months: 3, key: '3m' },
    { label: '6M', months: 6, key: '6m' },
    { label: '1Y', months: 12, key: '1y' },
    { label: '3Y', months: 36, key: '3y' },
    { label: '5Y', months: 60, key: '5y' },
  ];

  const bull = scenarios.find(s => s.name === 'Bull');
  const base = scenarios.find(s => s.name === 'Base');
  const bear = scenarios.find(s => s.name === 'Bear');

  if (!bull || !base || !bear) return [];

  return horizons.map(h => {
    const date = formatDate(addMonths(today, h.months));
    const bullPrice = h.months === 0 ? currentPrice : bull.targets[h.key];
    const basePrice = h.months === 0 ? currentPrice : base.targets[h.key];
    const bearPrice = h.months === 0 ? currentPrice : bear.targets[h.key];
    const ev = probs.bull * bullPrice + probs.base * basePrice + probs.bear * bearPrice;

    return {
      date,
      label: h.label,
      bull: bullPrice,
      base: basePrice,
      bear: bearPrice,
      ev,
    };
  });
}
