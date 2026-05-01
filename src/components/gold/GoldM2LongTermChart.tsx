import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

const STATIC_100Y = [
  { year: 1925, goldPrice: 20.67, goldStockBillionOz: 1.00, m2Billions: 44 },
  { year: 1926, goldPrice: 20.67, goldStockBillionOz: 1.01, m2Billions: 45 },
  { year: 1927, goldPrice: 20.67, goldStockBillionOz: 1.02, m2Billions: 46 },
  { year: 1928, goldPrice: 20.67, goldStockBillionOz: 1.04, m2Billions: 47 },
  { year: 1929, goldPrice: 20.67, goldStockBillionOz: 1.05, m2Billions: 46 },
  { year: 1930, goldPrice: 20.67, goldStockBillionOz: 1.06, m2Billions: 45 },
  { year: 1931, goldPrice: 20.67, goldStockBillionOz: 1.07, m2Billions: 42 },
  { year: 1932, goldPrice: 20.67, goldStockBillionOz: 1.08, m2Billions: 36 },
  { year: 1933, goldPrice: 26.33, goldStockBillionOz: 1.09, m2Billions: 32 },
  { year: 1934, goldPrice: 35.00, goldStockBillionOz: 1.10, m2Billions: 34 },
  { year: 1935, goldPrice: 35.00, goldStockBillionOz: 1.12, m2Billions: 39 },
  { year: 1936, goldPrice: 35.00, goldStockBillionOz: 1.13, m2Billions: 43 },
  { year: 1937, goldPrice: 35.00, goldStockBillionOz: 1.14, m2Billions: 45 },
  { year: 1938, goldPrice: 35.00, goldStockBillionOz: 1.16, m2Billions: 46 },
  { year: 1939, goldPrice: 35.00, goldStockBillionOz: 1.17, m2Billions: 49 },
  { year: 1940, goldPrice: 35.00, goldStockBillionOz: 1.18, m2Billions: 55 },
  { year: 1941, goldPrice: 35.00, goldStockBillionOz: 1.20, m2Billions: 62 },
  { year: 1942, goldPrice: 35.00, goldStockBillionOz: 1.21, m2Billions: 71 },
  { year: 1943, goldPrice: 35.00, goldStockBillionOz: 1.22, m2Billions: 89 },
  { year: 1944, goldPrice: 35.00, goldStockBillionOz: 1.24, m2Billions: 106 },
  { year: 1945, goldPrice: 35.00, goldStockBillionOz: 1.25, m2Billions: 127 },
  { year: 1946, goldPrice: 35.00, goldStockBillionOz: 1.26, m2Billions: 138 },
  { year: 1947, goldPrice: 35.00, goldStockBillionOz: 1.28, m2Billions: 146 },
  { year: 1948, goldPrice: 35.00, goldStockBillionOz: 1.29, m2Billions: 151 },
  { year: 1949, goldPrice: 35.00, goldStockBillionOz: 1.30, m2Billions: 149 },
  { year: 1950, goldPrice: 35.00, goldStockBillionOz: 1.32, m2Billions: 151 },
  { year: 1951, goldPrice: 35.00, goldStockBillionOz: 1.33, m2Billions: 158 },
  { year: 1952, goldPrice: 35.00, goldStockBillionOz: 1.35, m2Billions: 163 },
  { year: 1953, goldPrice: 35.00, goldStockBillionOz: 1.36, m2Billions: 169 },
  { year: 1954, goldPrice: 35.00, goldStockBillionOz: 1.38, m2Billions: 175 },
  { year: 1955, goldPrice: 35.00, goldStockBillionOz: 1.39, m2Billions: 178 },
  { year: 1956, goldPrice: 35.00, goldStockBillionOz: 1.41, m2Billions: 181 },
  { year: 1957, goldPrice: 35.00, goldStockBillionOz: 1.42, m2Billions: 185 },
  { year: 1958, goldPrice: 35.00, goldStockBillionOz: 1.44, m2Billions: 196 },
  { year: 1959, goldPrice: 35.00, goldStockBillionOz: 1.45, m2Billions: 298 },
  { year: 1960, goldPrice: 35.00, goldStockBillionOz: 1.47, m2Billions: 312 },
  { year: 1961, goldPrice: 35.00, goldStockBillionOz: 1.49, m2Billions: 335 },
  { year: 1962, goldPrice: 35.00, goldStockBillionOz: 1.50, m2Billions: 362 },
  { year: 1963, goldPrice: 35.00, goldStockBillionOz: 1.52, m2Billions: 393 },
  { year: 1964, goldPrice: 35.00, goldStockBillionOz: 1.54, m2Billions: 425 },
  { year: 1965, goldPrice: 35.00, goldStockBillionOz: 1.55, m2Billions: 460 },
  { year: 1966, goldPrice: 35.00, goldStockBillionOz: 1.57, m2Billions: 480 },
  { year: 1967, goldPrice: 35.00, goldStockBillionOz: 1.59, m2Billions: 524 },
  { year: 1968, goldPrice: 39.31, goldStockBillionOz: 1.60, m2Billions: 566 },
  { year: 1969, goldPrice: 41.51, goldStockBillionOz: 1.62, m2Billions: 589 },
  { year: 1970, goldPrice: 36.02, goldStockBillionOz: 1.64, m2Billions: 628 },
  { year: 1971, goldPrice: 40.81, goldStockBillionOz: 1.65, m2Billions: 710 },
  { year: 1972, goldPrice: 58.42, goldStockBillionOz: 1.67, m2Billions: 800 },
  { year: 1973, goldPrice: 97.39, goldStockBillionOz: 1.69, m2Billions: 855 },
  { year: 1974, goldPrice: 159.26, goldStockBillionOz: 1.70, m2Billions: 902 },
  { year: 1975, goldPrice: 161.02, goldStockBillionOz: 1.72, m2Billions: 1016 },
  { year: 1976, goldPrice: 124.84, goldStockBillionOz: 1.74, m2Billions: 1152 },
  { year: 1977, goldPrice: 147.84, goldStockBillionOz: 1.76, m2Billions: 1270 },
  { year: 1978, goldPrice: 193.22, goldStockBillionOz: 1.77, m2Billions: 1388 },
  { year: 1979, goldPrice: 306.00, goldStockBillionOz: 1.79, m2Billions: 1474 },
  { year: 1980, goldPrice: 612.56, goldStockBillionOz: 1.81, m2Billions: 1600 },
  { year: 1981, goldPrice: 459.61, goldStockBillionOz: 1.83, m2Billions: 1756 },
  { year: 1982, goldPrice: 375.67, goldStockBillionOz: 1.85, m2Billions: 1911 },
  { year: 1983, goldPrice: 424.35, goldStockBillionOz: 1.87, m2Billions: 2127 },
  { year: 1984, goldPrice: 360.48, goldStockBillionOz: 1.89, m2Billions: 2311 },
  { year: 1985, goldPrice: 317.26, goldStockBillionOz: 1.91, m2Billions: 2497 },
  { year: 1986, goldPrice: 367.66, goldStockBillionOz: 1.93, m2Billions: 2734 },
  { year: 1987, goldPrice: 446.46, goldStockBillionOz: 1.95, m2Billions: 2832 },
  { year: 1988, goldPrice: 436.94, goldStockBillionOz: 1.97, m2Billions: 2994 },
  { year: 1989, goldPrice: 381.44, goldStockBillionOz: 1.99, m2Billions: 3159 },
  { year: 1990, goldPrice: 383.51, goldStockBillionOz: 2.01, m2Billions: 3278 },
  { year: 1991, goldPrice: 362.11, goldStockBillionOz: 2.03, m2Billions: 3379 },
  { year: 1992, goldPrice: 343.82, goldStockBillionOz: 2.05, m2Billions: 3434 },
  { year: 1993, goldPrice: 359.77, goldStockBillionOz: 2.07, m2Billions: 3483 },
  { year: 1994, goldPrice: 384.00, goldStockBillionOz: 2.09, m2Billions: 3500 },
  { year: 1995, goldPrice: 384.02, goldStockBillionOz: 2.11, m2Billions: 3642 },
  { year: 1996, goldPrice: 387.81, goldStockBillionOz: 2.13, m2Billions: 3821 },
  { year: 1997, goldPrice: 331.02, goldStockBillionOz: 2.15, m2Billions: 4034 },
  { year: 1998, goldPrice: 294.24, goldStockBillionOz: 2.17, m2Billions: 4389 },
  { year: 1999, goldPrice: 278.98, goldStockBillionOz: 2.19, m2Billions: 4644 },
  { year: 2000, goldPrice: 279.11, goldStockBillionOz: 2.22, m2Billions: 4921 },
  { year: 2001, goldPrice: 271.04, goldStockBillionOz: 2.24, m2Billions: 5441 },
  { year: 2002, goldPrice: 309.68, goldStockBillionOz: 2.26, m2Billions: 5781 },
  { year: 2003, goldPrice: 363.38, goldStockBillionOz: 2.28, m2Billions: 6065 },
  { year: 2004, goldPrice: 409.17, goldStockBillionOz: 2.30, m2Billions: 6420 },
  { year: 2005, goldPrice: 444.74, goldStockBillionOz: 2.32, m2Billions: 6680 },
  { year: 2006, goldPrice: 603.46, goldStockBillionOz: 2.34, m2Billions: 7022 },
  { year: 2007, goldPrice: 695.39, goldStockBillionOz: 2.37, m2Billions: 7479 },
  { year: 2008, goldPrice: 871.96, goldStockBillionOz: 2.39, m2Billions: 8185 },
  { year: 2009, goldPrice: 972.35, goldStockBillionOz: 2.41, m2Billions: 8503 },
  { year: 2010, goldPrice: 1224.53, goldStockBillionOz: 2.43, m2Billions: 8793 },
  { year: 2011, goldPrice: 1571.52, goldStockBillionOz: 2.46, m2Billions: 9643 },
  { year: 2012, goldPrice: 1668.98, goldStockBillionOz: 2.48, m2Billions: 10450 },
  { year: 2013, goldPrice: 1411.23, goldStockBillionOz: 2.50, m2Billions: 10988 },
  { year: 2014, goldPrice: 1266.40, goldStockBillionOz: 2.52, m2Billions: 11677 },
  { year: 2015, goldPrice: 1160.06, goldStockBillionOz: 2.55, m2Billions: 12340 },
  { year: 2016, goldPrice: 1250.74, goldStockBillionOz: 2.57, m2Billions: 13211 },
  { year: 2017, goldPrice: 1257.15, goldStockBillionOz: 2.59, m2Billions: 13863 },
  { year: 2018, goldPrice: 1268.49, goldStockBillionOz: 2.61, m2Billions: 14359 },
  { year: 2019, goldPrice: 1393.34, goldStockBillionOz: 2.64, m2Billions: 15279 },
  { year: 2020, goldPrice: 1769.64, goldStockBillionOz: 2.66, m2Billions: 19101 },
  { year: 2021, goldPrice: 1798.89, goldStockBillionOz: 2.68, m2Billions: 21503 },
  { year: 2022, goldPrice: 1800.12, goldStockBillionOz: 2.71, m2Billions: 21307 },
  { year: 2023, goldPrice: 1943.00, goldStockBillionOz: 2.73, m2Billions: 20761 },
  { year: 2024, goldPrice: 2386.00, goldStockBillionOz: 2.75, m2Billions: 21441 },
  { year: 2025, goldPrice: 3050.00, goldStockBillionOz: 2.77, m2Billions: 21900 },
];

const ANNOTATIONS = [
  { year: 1934, short: '1934' },
  { year: 1971, short: '1971' },
  { year: 1980, short: '1980' },
  { year: 1999, short: '1999' },
  { year: 2011, short: '2011' },
  { year: 2020, short: '2020' },
];

function fmtUSD(v: number): string {
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(1) + 'T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const ratioColor = d.ratio > 20 ? 'text-red-400' : d.ratio < 8 ? 'text-green-400' : 'text-neutral-400';
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5 min-w-[200px]">
      <div className="font-semibold text-foreground border-b border-border pb-1 mb-1">{d.year}</div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Gold Market Cap</span>
        <span className="text-foreground font-medium">{fmtUSD(d.goldMarketCap)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">M2 Supply</span>
        <span className="text-foreground font-medium">{fmtUSD(d.m2)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Gold Cap / M2</span>
        <span className={`font-semibold ${ratioColor}`}>{d.ratio.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Gold Price</span>
        <span className="text-foreground font-medium">${d.goldPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}/oz</span>
      </div>
    </div>
  );
}

interface Props {
  currentGoldPrice?: number;
  currentM2Billions?: number;
}

export default function GoldM2LongTermChart({ currentGoldPrice, currentM2Billions }: Props) {
  const isMobile = useIsMobile();
  const [showAnnotations, setShowAnnotations] = useState(true);

  const chartData = useMemo(() => {
    const rows = [...STATIC_100Y];
    if (currentGoldPrice && currentM2Billions) {
      const last = rows[rows.length - 1];
      rows[rows.length - 1] = { ...last, goldPrice: currentGoldPrice, m2Billions: currentM2Billions };
    }
    return rows.map(r => ({
      year: r.year,
      goldMarketCap: r.goldPrice * r.goldStockBillionOz * 1e9,
      m2: r.m2Billions * 1e9,
      ratio: r.m2Billions > 0 ? (r.goldPrice * r.goldStockBillionOz) / r.m2Billions * 100 : 0,
      goldPrice: r.goldPrice,
    }));
  }, [currentGoldPrice, currentM2Billions]);

  const maxAbsolute = useMemo(() => Math.max(...chartData.map(d => Math.max(d.goldMarketCap, d.m2))), [chartData]);
  const maxRatio = useMemo(() => Math.max(...chartData.map(d => d.ratio)) * 1.15, [chartData]);
  const currentRatio = chartData[chartData.length - 1]?.ratio ?? 0;
  const ratioColor = currentRatio > 20 ? 'text-red-400' : currentRatio < 8 ? 'text-green-400' : 'text-neutral-400';

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-7 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 max-w-3xl">
          <h3 className="font-display text-foreground text-lg">
            Gold Market Cap vs. M2 Money Supply — 100-Year View
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Left axis: Gold total market cap (price × all mined ounces) vs. US M2 — both in USD. Right axis (shaded area): Gold Market Cap ÷ M2 ratio. The 1980 peak at ~25% is the all-time high; the 1999 trough at ~3% was the generational low.
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

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-[hsl(var(--gold))]" />
          <span className="text-muted-foreground">Gold Market Cap (L)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-[hsl(210_80%_60%)]" />
          <span className="text-muted-foreground">M2 Supply (L)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 bg-[hsl(40_80%_60%)] opacity-30" />
          <span className="text-muted-foreground">Gold Cap / M2 % (R)</span>
        </div>
      </div>

      <div className="w-full" style={{ height: isMobile ? 320 : 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <XAxis
              dataKey="year"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => String(v)}
              interval={isMobile ? 19 : 9}
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
              name="Gold Cap / M2 %"
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
              dataKey="m2"
              stroke="hsl(210 80% 60%)"
              strokeWidth={2}
              dot={false}
              name="M2 Supply"
            />
            {showAnnotations && ANNOTATIONS.map(a => (
              <ReferenceLine
                key={a.year}
                x={a.year}
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 4"
                strokeOpacity={0.5}
                label={{ value: a.short, position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
            ))}
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.3, strokeWidth: 1 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-border/40 pt-3 space-y-2">
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Sources</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[10px] text-muted-foreground/70 font-mono">
          <a href="https://fred.stlouisfed.org/series/GOLDAMGBD228NLBM" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            Gold spot price (1968–) — FRED GOLDAMGBD228NLBM ↗
          </a>
          <a href="https://fred.stlouisfed.org/series/M2SL" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            M2 money supply (1959–) — FRED M2SL ↗
          </a>
          <a href="https://www.gold.org/goldhub/data/above-ground-stocks" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            Above-ground gold stock — World Gold Council ↗
          </a>
          <a href="https://www.nber.org/books-and-chapters/monetary-history-united-states-1867-1960" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            Pre-1959 M2 estimates — Friedman & Schwartz (NBER) ↗
          </a>
          <a href="https://www.kitco.com/charts/historicalgold.html" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
            Historical gold prices (pre-1968) — Kitco ↗
          </a>
          <span className="text-muted-foreground/50">
            Ratio = (gold price × all mined oz) ÷ US M2
          </span>
        </div>
      </div>
    </div>
  );
}
