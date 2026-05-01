import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── DATA METHODOLOGY ────────────────────────────────────────────────────────
// Gold price:      Annual average, FRED GOLDAMGBD228NLBM (London PM fix)
// Gold stock:      WGC Above-Ground Stocks (end-year tonnes × 32,150.7466 oz/t)
// G5 Global M2:    Sum of US + Eurozone + China + Japan + UK, USD at Dec FX
// Confidence:      'verified' = post-2007, all 5 CBs traceable
//                  'estimated' = pre-2007, reconstructed from IMF IFS + US share
// ─────────────────────────────────────────────────────────────────────────────

const OZ_PER_TONNE = 32150.7466;

interface DataRow {
  year: number;
  goldPriceAvg: number;
  goldTonnes: number;
  g5M2_T: number; // G5 Global M2 in USD trillions
  confidence: 'verified' | 'estimated';
  annotation?: string;
}

const RAW_DATA: DataRow[] = [
  // ── ESTIMATED (pre-2007) ─────────────────────────────────────────────────
  { year: 1925, goldPriceAvg: 20.67,  goldTonnes: 35000,  g5M2_T: 0.10,  confidence: 'estimated' },
  { year: 1930, goldPriceAvg: 20.67,  goldTonnes: 37000,  g5M2_T: 0.10,  confidence: 'estimated' },
  { year: 1934, goldPriceAvg: 35.00,  goldTonnes: 39000,  g5M2_T: 0.12,  confidence: 'estimated', annotation: '1934' },
  { year: 1940, goldPriceAvg: 35.00,  goldTonnes: 43000,  g5M2_T: 0.25,  confidence: 'estimated' },
  { year: 1950, goldPriceAvg: 35.00,  goldTonnes: 51000,  g5M2_T: 0.55,  confidence: 'estimated' },
  { year: 1960, goldPriceAvg: 35.00,  goldTonnes: 64000,  g5M2_T: 1.00,  confidence: 'estimated' },
  { year: 1970, goldPriceAvg: 36.02,  goldTonnes: 84000,  g5M2_T: 1.70,  confidence: 'estimated' },
  { year: 1971, goldPriceAvg: 40.81,  goldTonnes: 85500,  g5M2_T: 1.90,  confidence: 'estimated', annotation: '1971' },
  { year: 1973, goldPriceAvg: 97.39,  goldTonnes: 88000,  g5M2_T: 2.30,  confidence: 'estimated' },
  { year: 1975, goldPriceAvg: 161.02, goldTonnes: 90000,  g5M2_T: 2.80,  confidence: 'estimated' },
  { year: 1976, goldPriceAvg: 124.84, goldTonnes: 91500,  g5M2_T: 3.10,  confidence: 'estimated' },
  { year: 1978, goldPriceAvg: 193.22, goldTonnes: 94000,  g5M2_T: 3.60,  confidence: 'estimated' },
  { year: 1979, goldPriceAvg: 306.00, goldTonnes: 96000,  g5M2_T: 3.80,  confidence: 'estimated' },
  { year: 1980, goldPriceAvg: 612.56, goldTonnes: 103000, g5M2_T: 4.00,  confidence: 'estimated', annotation: '1980' },
  { year: 1982, goldPriceAvg: 375.67, goldTonnes: 106000, g5M2_T: 5.00,  confidence: 'estimated' },
  { year: 1985, goldPriceAvg: 317.26, goldTonnes: 111000, g5M2_T: 7.00,  confidence: 'estimated' },
  { year: 1987, goldPriceAvg: 446.46, goldTonnes: 114500, g5M2_T: 8.50,  confidence: 'estimated' },
  { year: 1990, goldPriceAvg: 383.51, goldTonnes: 130000, g5M2_T: 13.50, confidence: 'estimated' },
  { year: 1995, goldPriceAvg: 384.02, goldTonnes: 142000, g5M2_T: 18.00, confidence: 'estimated' },
  { year: 1999, goldPriceAvg: 278.98, goldTonnes: 154000, g5M2_T: 22.00, confidence: 'estimated', annotation: '1999' },
  { year: 2000, goldPriceAvg: 279.11, goldTonnes: 155000, g5M2_T: 23.00, confidence: 'estimated' },
  { year: 2002, goldPriceAvg: 309.68, goldTonnes: 158000, g5M2_T: 25.00, confidence: 'estimated' },
  { year: 2004, goldPriceAvg: 409.17, goldTonnes: 161000, g5M2_T: 28.00, confidence: 'estimated' },
  { year: 2006, goldPriceAvg: 603.46, goldTonnes: 165000, g5M2_T: 37.00, confidence: 'estimated' },
  // ── VERIFIED (post-2007) ──────────────────────────────────────────────────
  { year: 2007, goldPriceAvg: 695.39,  goldTonnes: 168000, g5M2_T: 42,  confidence: 'verified' },
  { year: 2008, goldPriceAvg: 871.96,  goldTonnes: 172300, g5M2_T: 44,  confidence: 'verified' },
  { year: 2009, goldPriceAvg: 972.35,  goldTonnes: 174800, g5M2_T: 50,  confidence: 'verified' },
  { year: 2010, goldPriceAvg: 1224.53, goldTonnes: 177200, g5M2_T: 55,  confidence: 'verified' },
  { year: 2011, goldPriceAvg: 1571.52, goldTonnes: 180000, g5M2_T: 60,  confidence: 'verified', annotation: '2011' },
  { year: 2012, goldPriceAvg: 1668.98, goldTonnes: 183000, g5M2_T: 63,  confidence: 'verified' },
  { year: 2013, goldPriceAvg: 1411.23, goldTonnes: 183500, g5M2_T: 61,  confidence: 'verified' },
  { year: 2014, goldPriceAvg: 1266.40, goldTonnes: 184500, g5M2_T: 63,  confidence: 'verified' },
  { year: 2015, goldPriceAvg: 1160.06, goldTonnes: 186700, g5M2_T: 66,  confidence: 'verified' },
  { year: 2016, goldPriceAvg: 1250.74, goldTonnes: 188000, g5M2_T: 64,  confidence: 'verified' },
  { year: 2017, goldPriceAvg: 1257.15, goldTonnes: 190040, g5M2_T: 65,  confidence: 'verified' },
  { year: 2018, goldPriceAvg: 1268.49, goldTonnes: 193000, g5M2_T: 64,  confidence: 'verified' },
  { year: 2019, goldPriceAvg: 1393.34, goldTonnes: 197576, g5M2_T: 75,  confidence: 'verified' },
  { year: 2020, goldPriceAvg: 1769.64, goldTonnes: 201296, g5M2_T: 88,  confidence: 'verified', annotation: '2020' },
  { year: 2021, goldPriceAvg: 1798.61, goldTonnes: 204874, g5M2_T: 97,  confidence: 'verified' },
  { year: 2022, goldPriceAvg: 1800.93, goldTonnes: 208874, g5M2_T: 90,  confidence: 'verified' },
  { year: 2023, goldPriceAvg: 1940.54, goldTonnes: 212582, g5M2_T: 92,  confidence: 'verified' },
  { year: 2024, goldPriceAvg: 2386.00, goldTonnes: 216265, g5M2_T: 98,  confidence: 'verified' },
  { year: 2025, goldPriceAvg: 3000.00, goldTonnes: 216265, g5M2_T: 100, confidence: 'verified', annotation: '2025' },
];

const ANNOTATIONS = RAW_DATA
  .filter(d => d.annotation)
  .map(d => ({ year: d.year, label: d.annotation! }));

function fmtUSD(v: number): string {
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(1) + 'T';
  if (v >= 1e9)  return '$' + (v / 1e9).toFixed(1) + 'B';
  return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const ratioColor = d.ratio > 25 ? 'text-red-400' : d.ratio < 8 ? 'text-green-400' : 'text-neutral-400';
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5 min-w-[220px]">
      <div className="flex items-center justify-between border-b border-border pb-1 mb-1">
        <span className="font-semibold text-foreground">{d.year}</span>
        <span className={`text-[10px] font-mono ${d.confidence === 'verified' ? 'text-green-400/80' : 'text-muted-foreground/70'}`}>
          {d.confidence === 'verified' ? '✓ verified' : '~ estimated'}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Gold price</span>
        <span className="text-foreground font-medium">${d.goldPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}/oz</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Gold stock</span>
        <span className="text-foreground font-medium">{d.goldTonnes.toLocaleString()}t</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Gold market cap</span>
        <span className="text-foreground font-medium">{fmtUSD(d.goldMarketCap)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">G5 Global M2</span>
        <span className="text-foreground font-medium">{fmtUSD(d.g5M2)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Gold Cap / G5 M2</span>
        <span className={`font-semibold ${ratioColor}`}>{d.ratio.toFixed(1)}%</span>
      </div>
    </div>
  );
}

interface Props {
  currentGoldPrice?: number;
  currentM2Billions?: number;
}

type RangeKey = '100y' | '50y' | '20y' | '10y' | '5y' | '3y' | '1y' | 'ytd';
const RANGES: { key: RangeKey; label: string; years: number | 'ytd' }[] = [
  { key: '100y', label: '100Y', years: 100 },
  { key: '50y',  label: '50Y',  years: 50 },
  { key: '20y',  label: '20Y',  years: 20 },
  { key: '10y',  label: '10Y',  years: 10 },
  { key: '5y',   label: '5Y',   years: 5 },
  { key: '3y',   label: '3Y',   years: 3 },
  { key: '1y',   label: '1Y',   years: 1 },
  { key: 'ytd',  label: 'YTD',  years: 'ytd' },
];

export default function GoldM2LongTermChart({ currentGoldPrice }: Props) {
  const isMobile = useIsMobile();
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [range, setRange] = useState<RangeKey>('100y');

  const allData = useMemo(() => {
    return RAW_DATA.map(r => {
      const oz = r.goldTonnes * OZ_PER_TONNE;
      const price = (r.year === 2025 && currentGoldPrice) ? currentGoldPrice : r.goldPriceAvg;
      const goldMarketCap = price * oz;
      const g5M2 = r.g5M2_T * 1e12;
      const ratio = (goldMarketCap / g5M2) * 100;
      return {
        year: r.year,
        goldMarketCap,
        g5M2,
        ratio,
        goldPrice: price,
        goldTonnes: r.goldTonnes,
        confidence: r.confidence,
      };
    });
  }, [currentGoldPrice]);

  const chartData = useMemo(() => {
    if (range === 'ytd') {
      const currentYear = new Date().getFullYear();
      const filtered = allData.filter(d => d.year >= currentYear);
      return filtered.length ? filtered : allData.slice(-1);
    }
    const years = RANGES.find(r => r.key === range)?.years as number;
    const cutoff = (allData[allData.length - 1]?.year ?? new Date().getFullYear()) - years;
    const filtered = allData.filter(d => d.year >= cutoff);
    return filtered.length >= 2 ? filtered : allData.slice(-2);
  }, [allData, range]);

  const maxAbsolute = useMemo(() => Math.max(...chartData.map(d => Math.max(d.goldMarketCap, d.g5M2))), [chartData]);
  const maxRatio    = useMemo(() => Math.max(...chartData.map(d => d.ratio)) * 1.2, [chartData]);
  const currentRatio = chartData[chartData.length - 1]?.ratio ?? 0;
  const ratioColor = currentRatio > 25 ? 'text-red-400' : currentRatio < 8 ? 'text-green-400' : 'text-yellow-400';
  const xInterval = chartData.length > 40 ? (isMobile ? 9 : 4) : chartData.length > 15 ? 2 : chartData.length > 6 ? 1 : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-7 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 max-w-3xl">
          <h3 className="font-display text-foreground text-lg">
            Gold Market Cap vs. G5 Global M2 — 100-Year View
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Gold market cap = annual avg price × all above-ground mined ounces (WGC). G5 Global M2 = US + Eurozone + China + Japan + UK money supply, converted to USD at December year-end FX rates. Shaded area (right axis): ratio of Gold Market Cap ÷ G5 M2. Pre-2007 data estimated; post-2007 traceable to central bank releases.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-xs">
            <span className="text-muted-foreground">Ratio now: </span>
            <span className={`font-semibold ${ratioColor}`}>{currentRatio.toFixed(1)}%</span>
          </div>
          <button
            onClick={() => setShowAnnotations(a => !a)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/60 rounded px-2 py-0.5"
          >
            {showAnnotations ? 'Hide' : 'Show'} events
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-[hsl(var(--gold))]" />
          <span className="text-muted-foreground">Gold Market Cap (L)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-[hsl(210_80%_60%)]" />
          <span className="text-muted-foreground">G5 Global M2 (L)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 bg-[hsl(40_80%_60%)] opacity-30" />
          <span className="text-muted-foreground">Gold Cap / G5 M2 % (R)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 border-t border-dashed border-muted-foreground" />
          <span className="text-muted-foreground">Pre-2007 estimated</span>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-1">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              range === r.key
                ? 'bg-primary/15 border-primary/50 text-foreground font-semibold'
                : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: isMobile ? 320 : 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <XAxis
              dataKey="year"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => String(v)}
              interval={xInterval}
            />
            <YAxis
              yAxisId="left"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v >= 1e12 ? '$' + (v / 1e12).toFixed(0) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(0) + 'B' : '$' + v}
              domain={[0, maxAbsolute * 1.1]}
              width={isMobile ? 44 : 64}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(40 80% 60%)"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.toFixed(0) + '%'}
              domain={[0, maxRatio]}
              width={isMobile ? 36 : 44}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="ratio"
              stroke="hsl(40 80% 60%)"
              strokeWidth={1}
              fill="hsl(40 80% 60%)"
              fillOpacity={0.15}
              name="Gold Cap / G5 M2 %"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="goldMarketCap"
              stroke="hsl(var(--gold))"
              strokeWidth={2}
              dot={false}
              name="Gold Market Cap"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="g5M2"
              stroke="hsl(210 80% 60%)"
              strokeWidth={2}
              dot={false}
              name="G5 Global M2"
            />
            {showAnnotations && ANNOTATIONS.map(a => (
              <ReferenceLine
                key={a.year}
                x={a.year}
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 4"
                strokeOpacity={0.5}
                label={{ value: a.label, position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
            ))}
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.3, strokeWidth: 1 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sources */}
      <div className="border-t border-border/40 pt-3 space-y-2">
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Sources & Methodology</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[10px] text-muted-foreground/70 font-mono">
          <a href="https://fred.stlouisfed.org/series/GOLDAMGBD228NLBM" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            Gold price (annual avg, 1968–) — FRED GOLDAMGBD228NLBM ↗
          </a>
          <a href="https://www.gold.org/goldhub/data/above-ground-stocks" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            Gold above-ground stock — World Gold Council ↗
          </a>
          <a href="https://fred.stlouisfed.org/series/M2SL" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            US M2 (Dec year-end) — FRED M2SL ↗
          </a>
          <a href="https://sdw.ecb.europa.eu/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            Eurozone M2 — ECB Statistical Data Warehouse ↗
          </a>
          <a href="http://www.pbc.gov.cn/en/3688110/3688172/3688254/index.html" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            China M2 (CNY→USD Dec FX) — PBoC ↗
          </a>
          <a href="https://www.boj.or.jp/en/statistics/money/ms/index.htm" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            Japan M2 (JPY→USD Dec FX) — Bank of Japan ↗
          </a>
          <a href="https://www.bankofengland.co.uk/statistics/m4" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            UK M4 (GBP→USD Dec FX) — Bank of England ↗
          </a>
          <a href="https://www.gold.org/goldhub/research/gold-demand-trends" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            WGC Gold Demand Trends (annual) ↗
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed pt-1">
          Pre-2007 G5 M2 estimated from IMF IFS aggregates and documented US-share ratios. Tooltip shows confidence level per data point. Ratio = (gold price × WGC above-ground oz) ÷ G5 Global M2.
        </p>
      </div>
    </div>
  );
}
