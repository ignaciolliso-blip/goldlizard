import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { GuideTooltip } from '@/components/GuideMode';
import { supabase } from '@/integrations/supabase/client';
import type {
  UraniumAnchorResult, UraniumForcesResult, UraniumLeverageResult, MinerValuation,
} from '@/lib/uraniumEngine';
import { deriveAnchorConclusion, deriveLeverageConclusion } from '@/lib/uraniumEngine';

interface Props {
  anchorResult: UraniumAnchorResult | null;
  forcesResult: UraniumForcesResult | null;
  leverageResult: UraniumLeverageResult | null;
}

function fmt(n: number) { return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }

// ─── Skeleton ───
function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-7 space-y-4 animate-pulse">
      <div className="h-5 w-32 bg-secondary rounded" />
      <div className="h-4 w-48 bg-secondary/60 rounded" />
      <div className="h-48 bg-secondary/40 rounded-lg" />
      <div className="h-4 w-full bg-secondary/40 rounded" />
    </div>
  );
}

function CardShell({ title, subtitle, icon, children, guideId, guideText }: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode;
  guideId?: string; guideText?: string;
}) {
  const header = (
    <div className="flex items-start gap-3 mb-5">
      <div className="p-2.5 rounded-lg bg-uranium/10 text-uranium shrink-0">{icon}</div>
      <div>
        <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h3>
        <p className="text-sm italic text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
  return (
    <div className="bg-card border border-border rounded-xl p-7">
      {guideId && guideText ? (
        <GuideTooltip id={guideId} text={guideText}>{header}</GuideTooltip>
      ) : header}
      {children}
    </div>
  );
}

// ─── ANCHOR CARD ───
function AnchorCard({ anchor }: { anchor: UraniumAnchorResult | null }) {
  if (!anchor) return <SkeletonCard />;

  const conclusion = deriveAnchorConclusion(anchor.spotPrice);
  const gaugeHeight = 260;
  const minPrice = 20;
  const maxPrice = 150;
  const range = maxPrice - minPrice;
  const priceToY = (p: number) => gaugeHeight - ((Math.min(Math.max(p, minPrice), maxPrice) - minPrice) / range) * gaugeHeight;

  const spotY = priceToY(anchor.spotPrice);
  const ltY = priceToY(anchor.ltContractPrice);

  const bands = [
    { label: 'Existing AISC', low: 30, high: 55, color: 'hsl(var(--bullish))' },
    { label: 'Restart', low: 55, high: 80, color: 'hsl(var(--primary))' },
    { label: 'Greenfield', low: 80, high: 100, color: 'hsl(var(--neutral))' },
    { label: 'Shortage', low: 100, high: 150, color: 'hsl(var(--bearish))' },
  ];

  return (
    <CardShell
      title="THE ANCHOR"
      subtitle="Is uranium priced above or below what it costs to produce?"
      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l4.5 4.5"/></svg>}
      guideId="uranium-anchor"
      guideText="This gauge shows uranium's spot price relative to production cost bands. At the Greenfield level ($85-100), new mines become economically viable — but take 10-15 years to build. The long-term contract price is the more important signal because it reflects what utilities actually pay."
    >
      <div className="flex gap-6">
        {/* Gauge */}
        <div className="relative" style={{ width: 56, height: gaugeHeight }}>
          <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ width: 28 }}>
            {bands.map(b => {
              const top = priceToY(b.high);
              const bottom = priceToY(b.low);
              return (
                <div
                  key={b.label}
                  className="absolute left-0 right-0"
                  style={{ top, height: bottom - top, backgroundColor: b.color, opacity: 0.25 }}
                />
              );
            })}
          </div>
          {/* Spot marker */}
          <div className="absolute left-0 flex items-center" style={{ top: spotY - 8 }}>
            <div className="w-7 h-4 rounded-sm bg-uranium flex items-center justify-center">
              <span className="text-[9px] font-bold text-background">●</span>
            </div>
            <span className="ml-2 text-xs font-mono font-bold text-uranium whitespace-nowrap">
              SPOT {fmt(anchor.spotPrice)}
            </span>
          </div>
          {/* LT contract marker */}
          <div className="absolute left-0 flex items-center" style={{ top: ltY - 8 }}>
            <div className="w-7 h-4 rounded-sm bg-uranium-contract flex items-center justify-center">
              <span className="text-[9px] font-bold text-background">◆</span>
            </div>
            <span className="ml-2 text-xs font-mono font-bold text-uranium-contract whitespace-nowrap">
              LT {fmt(anchor.ltContractPrice)}
            </span>
          </div>
          {/* Band labels */}
          {bands.map(b => (
            <div
              key={b.label}
              className="absolute text-[10px] text-muted-foreground whitespace-nowrap"
              style={{ top: priceToY((b.low + b.high) / 2) - 6, left: 60 }}
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* Key numbers */}
      <div className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Spot price</span>
          <span className="font-mono font-semibold text-uranium">{fmt(anchor.spotPrice)}/lb</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Long-term contract</span>
          <span className="font-mono font-semibold text-uranium-contract">{fmt(anchor.ltContractPrice)}/lb</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Greenfield cost</span>
          <span className="font-mono text-muted-foreground">$85–$100/lb</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gap to greenfield</span>
          <span className="font-mono font-semibold text-foreground">{anchor.gapToGreenfield > 0 ? '+' : ''}{anchor.gapToGreenfield.toFixed(0)}%</span>
        </div>
      </div>

      {/* Conclusion */}
      <div className={`mt-4 p-3 rounded-lg border-l-4 ${
        conclusion.color === 'bullish' ? 'border-l-bullish bg-bullish/5' :
        conclusion.color === 'bearish' ? 'border-l-bearish bg-bearish/5' :
        conclusion.color === 'primary' ? 'border-l-primary bg-primary/5' :
        'border-l-neutral bg-neutral/5'
      }`}>
        <p className="text-sm font-semibold text-foreground">{conclusion.text}</p>
        <p className="text-sm text-muted-foreground mt-1">{conclusion.detail}</p>
      </div>

      {/* Contract explanation */}
      <div className="mt-4 p-4 bg-card border-l-4 border-l-uranium/40 rounded-lg">
        <p className="text-xs font-semibold text-foreground mb-1.5">WHY CONTRACTS MATTER MORE THAN SPOT</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Unlike gold, most uranium is sold under long-term contracts (3-10 years), not on the spot market. 
          The spot market is thin — only ~15% of annual uranium trades happen there. The long-term contract 
          price reflects what utilities are ACTUALLY willing to pay to secure future fuel. When this price 
          rises, it signals genuine scarcity — not speculation.
        </p>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        AISC = All-In Sustaining Cost. Greenfield = cost to build a new mine from scratch.
      </p>
    </CardShell>
  );
}

// ─── FORCES CARD ───

const SUPPLY_DEMAND_BY_YEAR: Record<string, { demand: number; supply: number; supplyPrimary: number; supplySecondary: number }> = {
  '2020': { demand: 155, supply: 140, supplyPrimary: 125, supplySecondary: 15 },
  '2025': { demand: 180, supply: 145, supplyPrimary: 137, supplySecondary: 8 },
  '2030F': { demand: 220, supply: 160, supplyPrimary: 150, supplySecondary: 10 },
  '2035F': { demand: 260, supply: 175, supplyPrimary: 167, supplySecondary: 8 },
  '2040F': { demand: 300, supply: 190, supplyPrimary: 183, supplySecondary: 7 },
};

function ForcesCard({ forces }: { forces: UraniumForcesResult | null }) {
  const [selectedYear, setSelectedYear] = useState('2025');

  if (!forces) return <SkeletonCard />;

  const signalColor = (s: string) =>
    s === 'accelerating' || s === 'tightening' || s === 'early_stage' ? 'text-bullish' :
    s === 'decelerating' || s === 'expanding' || s === 'late_cycle' ? 'text-bearish' :
    'text-neutral';

  const signalLabel = (s: string) =>
    s === 'accelerating' ? 'ACCELERATING' :
    s === 'tightening' ? 'TIGHTENING' :
    s === 'early_stage' ? 'EARLY STAGE' :
    s === 'decelerating' ? 'DECELERATING' :
    s === 'expanding' ? 'EXPANDING' :
    s === 'late_cycle' ? 'LATE CYCLE' : 'STABLE';

  // Use selected year data (fall back to live data for 2025)
  const yearData = SUPPLY_DEMAND_BY_YEAR[selectedYear] || SUPPLY_DEMAND_BY_YEAR['2025'];
  const { demand, supply, supplyPrimary, supplySecondary } = yearData;
  const gap = supply - demand;
  const gapPct = ((gap / demand) * 100).toFixed(0);

  const demandWidth = 100;
  const supplyWidth = (supply / demand) * 100;

  const years = ['2020', '2025', '2030F', '2035F', '2040F'];

  return (
    <CardShell
      title="THE FORCES"
      subtitle="Is the supply-demand gap widening or narrowing?"
      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
      guideId="uranium-forces"
      guideText="Uranium's price is driven by the gap between reactor demand and mine supply. Unlike gold, uranium has no substitute — reactors MUST have fuel. When supply falls short of demand, the price must rise until new mines are built (10-15 years)."
    >
      {/* Year header */}
      <p className="text-lg font-display font-bold text-foreground mb-3">
        ANNUAL SUPPLY vs DEMAND — {selectedYear.replace('F', '')} {selectedYear.includes('F') ? 'FORECAST' : 'ESTIMATE'}
      </p>

      {/* Gap bars */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">DEMAND</span>
          <div className="flex-1 h-8 bg-uranium-demand/20 rounded relative overflow-hidden">
            <div className="h-full bg-uranium-demand/60 rounded" style={{ width: `${demandWidth}%` }} />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-foreground">
              {demand} Mlb
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground ml-[76px]">
          {selectedYear === '2025' ? '440 reactors × ~0.4 Mlb avg annual fuel load' :
           selectedYear === '2020' ? '~440 reactors (some offline post-Fukushima)' :
           `Projected reactor fleet growth (incl. AI/data centre demand)`}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">SUPPLY</span>
          <div className="flex-1 h-8 bg-uranium-supply/20 rounded relative overflow-hidden">
            <div className="h-full bg-uranium-supply/60 rounded" style={{ width: `${Math.min(supplyWidth, 100)}%` }} />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-foreground">
              {supply} Mlb
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground ml-[76px]">
          Primary: {supplyPrimary} Mlb mines + Secondary: {supplySecondary} Mlb enricher underfeeding &amp; inventories
        </p>
        <div className="text-center mt-1">
          <span className={`text-base font-mono font-bold ${gap < 0 ? 'text-bearish' : 'text-bullish'}`}>
            GAP: {gap > 0 ? '+' : ''}{gap} Mlb ({gapPct}%)
          </span>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex gap-2 mb-5">
        {years.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono font-semibold transition-colors ${
              selectedYear === y
                ? 'bg-uranium/20 text-uranium border border-uranium/40'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60 border border-transparent'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Demand: WNA/IAEA reactor requirements. Supply: WNA mine production + secondary estimates. Forecasts: Goldman Sachs/Sprott.
      </p>

      {/* Three-tier decomposition */}
      <div className="space-y-3">
        {[
          { label: 'DEMAND DRIVERS', signal: forces.demandSignal, items: ['440 operating reactors', '65 under construction', '+15-20 GW AI/data centres by 2030'] },
          { label: 'SUPPLY CONSTRAINTS', signal: forces.supplySignal, items: [`Mine production: ${forces.primarySupply.toFixed(0)} Mlb`, `Secondary supply: ${forces.secondarySupply.toFixed(0)} Mlb (declining)`, 'Kazatomprom + Niger disruptions'] },
          { label: 'CONTRACTING CYCLE', signal: forces.contractingSignal, items: ['Utilities undercontracted', 'US lagging EU/China in coverage', 'Section 232 + strategic reserve catalyst'] },
        ].map(tier => (
          <div key={tier.label} className="p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">{tier.label}</span>
              <span className={`text-xs font-bold ${signalColor(tier.signal)}`}>{signalLabel(tier.signal)}</span>
            </div>
            <ul className="space-y-0.5">
              {tier.items.map(item => (
                <li key={item} className="text-sm text-muted-foreground">• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Net assessment */}
      <div className="mt-4 p-3 bg-bearish/5 border border-bearish/20 rounded-lg">
        <p className="text-sm font-semibold text-foreground">SUPPLY-DEMAND VERDICT: {forces.deficit < 0 ? 'DEFICIT' : 'SURPLUS'}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Goldman Sachs projects a cumulative 1.9 billion lb deficit from 2025-2045 (~32% shortfall). 
          New mine supply takes 10-15 years to materialise. Secondary supply is declining, not growing.
        </p>
      </div>
    </CardShell>
  );
}

// ─── LEVERAGE CARD ───
function LeverageCard({ leverage }: { leverage: UraniumLeverageResult | null }) {
  if (!leverage) return <SkeletonCard />;

  const pctDesc = leverage.currentPercentile < 25 ? 'UNDERVALUED' :
    leverage.currentPercentile > 75 ? 'OVERVALUED' : 'FAIRLY VALUED';
  const pctColor = leverage.currentPercentile < 25 ? 'text-bullish' :
    leverage.currentPercentile > 75 ? 'text-bearish' : 'text-neutral';

  const sortedRatios = [...leverage.ratioSeries.map(r => r.value)].sort((a, b) => a - b);
  const rangeMin = sortedRatios.length > 0 ? sortedRatios[0] : 0;
  const rangeMax = sortedRatios.length > 0 ? sortedRatios[sortedRatios.length - 1] : 1;

  return (
    <CardShell
      title="THE LEVERAGE"
      subtitle="Are uranium miners cheap or expensive relative to uranium?"
      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>}
      guideId="uranium-leverage"
      guideText="Unlike gold miners which typically LAG gold, uranium miners have often FRONT-RUN the spot price. When the URNM/Uranium ratio is high, miners have already priced in the upside. The best entries come when miners pull back while the supply-demand thesis remains intact."
    >
      {/* Calculation explainer */}
      <div className="p-3 bg-secondary/30 rounded-lg mb-4">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground mb-1.5">HOW THIS IS CALCULATED</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          URNM ETF price (${leverage.currentURNMPrice.toFixed(0)}) ÷ Uranium spot price (${leverage.ratioSeries.length > 0 ? (leverage.currentURNMPrice / leverage.currentRatio).toFixed(0) : '—'}/lb) = <span className="font-mono font-semibold text-foreground">{leverage.currentRatio.toFixed(2)}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          This ratio tells you how much "miner" you get per dollar of uranium. When the ratio is HIGH, miners are expensive relative to the commodity. When LOW, miners are cheap. We compare today's ratio to its 5-year range.
        </p>
      </div>

      {/* Percentile bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-muted-foreground">URNM/Uranium ratio percentile (5yr)</span>
          <span className={`text-sm font-bold ${pctColor}`}>{pctDesc}</span>
        </div>
        <div className="relative h-6 bg-secondary rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-bullish/60 via-neutral/60 to-bearish/60 w-full" />
          <div
            className="absolute top-0 h-full w-1 bg-foreground rounded-full"
            style={{ left: `${leverage.currentPercentile}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0th — cheap</span>
          <span>50th</span>
          <span>100th — expensive</span>
        </div>
      </div>

      {/* Key stats with 5-year range */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">URNM/Uranium ratio</span>
          <span className="font-mono font-semibold text-foreground">{leverage.currentRatio.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">5-Year range</span>
          <span className="font-mono text-muted-foreground">{rangeMin.toFixed(2)} — {rangeMax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">5-Year median</span>
          <span className="font-mono text-muted-foreground">{leverage.medianRatio.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Percentile</span>
          <span className={`font-mono font-semibold ${pctColor}`}>{leverage.currentPercentile.toFixed(0)}th</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">URNM price</span>
          <span className="font-mono font-semibold text-leverage-miner">${leverage.currentURNMPrice.toFixed(2)}</span>
        </div>
        {leverage.currentU3O8Price > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">U3O8 ETF price</span>
            <span className="font-mono font-semibold text-uranium">${leverage.currentU3O8Price.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Actionable conclusion */}
      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <p className="text-sm font-semibold text-foreground">
          {leverage.currentPercentile > 50
            ? `Accumulate on pullbacks when the ratio drops below the median of ${leverage.medianRatio.toFixed(2)}, not at any price.`
            : `Miners are below median — favourable entry if supply-demand thesis remains intact.`}
        </p>
      </div>

      {/* Warning */}
      <div className="mt-4 p-3 bg-neutral/5 border border-neutral/20 rounded-lg">
        <p className="text-xs font-semibold text-foreground mb-1">⚠ URANIUM MINERS BEHAVE DIFFERENTLY FROM GOLD MINERS</p>
        <p className="text-sm text-muted-foreground">
          Gold miners typically lag gold (buy miners when ratio is low). Uranium miners are currently 
          LEADING uranium — miners have repriced for the structural deficit before spot has. The best 
          entry is on pullbacks, not at any price.
        </p>
      </div>

      {/* Vehicle recommendation */}
      <div className="mt-4 p-4 bg-card border-l-4 border-l-uranium/40 rounded-lg">
        <p className="text-xs font-semibold text-foreground mb-2">RECOMMENDED VEHICLES</p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">HANetf Sprott Uranium Miners UCITS ETF</span>
            <p className="text-xs">U3O8 | ISIN: IE0005YK6564 | TER: 0.85% | LSE, Xetra</p>
          </div>
          <div>
            <span className="font-semibold text-foreground">HANetf Sprott Junior Uranium Miners UCITS ETF</span>
            <p className="text-xs">URNJ | Higher beta, smaller miners, more risk</p>
          </div>
          <div>
            <span className="font-semibold text-foreground">Sprott Uranium Miners ETF (US)</span>
            <p className="text-xs">URNM | Same index, US-listed</p>
          </div>
          <p className="text-xs italic mt-2">
            Note: ETFs do not qualify for traspaso under Spanish tax rules. UCITS accumulating ETFs avoid dividend taxation events.
          </p>
        </div>
      </div>
    </CardShell>
  );
}

// ─── HOLDINGS TABLE ───
interface EtfHolding {
  company: string;
  ticker: string;
  weight_pct: number;
  jurisdiction: string;
  market_cap_usd: string;
  stage: string;
}

const JURISDICTION_FLAGS: Record<string, string> = {
  'Canada': '🇨🇦',
  'USA': '🇺🇸',
  'Kazakhstan': '🇰🇿',
  'Australia': '🇦🇺',
  'UK': '🇬🇧',
  'Other': '🌍',
};

const JURISDICTION_ORDER = ['Canada', 'USA', 'Australia', 'Kazakhstan', 'UK', 'Other'];

type SortKey = 'weight_pct' | 'jurisdiction' | 'market_cap_usd' | 'stage';

function HoldingsSection() {
  const [holdings, setHoldings] = useState<EtfHolding[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('weight_pct');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    supabase.from('etf_holdings').select('company, ticker, weight_pct, jurisdiction, market_cap_usd, stage')
      .eq('etf_ticker', 'URNM')
      .then(({ data }) => {
        if (data) setHoldings(data as EtfHolding[]);
      });
  }, []);

  const sorted = useMemo(() => {
    const arr = [...holdings];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'weight_pct') cmp = a.weight_pct - b.weight_pct;
      else if (sortBy === 'jurisdiction') cmp = JURISDICTION_ORDER.indexOf(a.jurisdiction) - JURISDICTION_ORDER.indexOf(b.jurisdiction);
      else cmp = (a[sortBy] || '').localeCompare(b[sortBy] || '');
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [holdings, sortBy, sortAsc]);

  const jurisdictionBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    holdings.forEach(h => { map[h.jurisdiction] = (map[h.jurisdiction] || 0) + h.weight_pct; });
    return JURISDICTION_ORDER
      .map(j => ({ jurisdiction: j, weight: map[j] || 0 }))
      .filter(j => j.weight > 0);
  }, [holdings]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  if (!holdings.length) return null;

  const westernWeight = jurisdictionBreakdown
    .filter(j => ['Canada', 'USA', 'Australia', 'UK'].includes(j.jurisdiction))
    .reduce((s, j) => s + j.weight, 0);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-secondary/20 transition-colors"
      >
        <div>
          <h3 className="font-display text-lg text-foreground">WHAT'S INSIDE THE ETF — {holdings.length} Holdings by Mining Jurisdiction</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Jurisdiction matters. Western-allied miners trade at a premium because they aren't exposed to sanctions or political instability.
          </p>
        </div>
        {isOpen ? <ChevronUp size={20} className="text-muted-foreground shrink-0" /> : <ChevronDown size={20} className="text-muted-foreground shrink-0" />}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 space-y-5">
          {/* Holdings table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { key: 'jurisdiction' as SortKey, label: 'COMPANY' },
                    { key: 'weight_pct' as SortKey, label: 'WEIGHT' },
                    { key: 'jurisdiction' as SortKey, label: 'JURISDICTION' },
                    { key: 'market_cap_usd' as SortKey, label: 'MKT CAP' },
                    { key: 'stage' as SortKey, label: 'STAGE' },
                  ].map(col => (
                    <th
                      key={col.label}
                      onClick={() => handleSort(col.key)}
                      className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap"
                    >
                      {col.label} {sortBy === col.key ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(h => (
                  <tr key={h.ticker} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-foreground">{h.company}</span>
                      <span className="text-muted-foreground ml-1.5">({h.ticker})</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-foreground whitespace-nowrap">{h.weight_pct.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{JURISDICTION_FLAGS[h.jurisdiction] || '🌍'} {h.jurisdiction}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">{h.market_cap_usd}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{h.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Jurisdiction stacked bar */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">JURISDICTION BREAKDOWN (by ETF weight)</p>
            <div className="flex h-7 rounded-lg overflow-hidden">
              {jurisdictionBreakdown.map(j => {
                const colors: Record<string, string> = {
                  'Canada': 'bg-red-500/70',
                  'USA': 'bg-blue-500/70',
                  'Australia': 'bg-yellow-500/70',
                  'Kazakhstan': 'bg-cyan-500/70',
                  'UK': 'bg-purple-500/70',
                  'Other': 'bg-muted-foreground/40',
                };
                return (
                  <div
                    key={j.jurisdiction}
                    className={`${colors[j.jurisdiction] || 'bg-muted-foreground/40'} flex items-center justify-center text-[10px] font-mono font-bold text-white`}
                    style={{ width: `${j.weight}%` }}
                    title={`${j.jurisdiction}: ${j.weight.toFixed(0)}%`}
                  >
                    {j.weight >= 8 && `${JURISDICTION_FLAGS[j.jurisdiction]} ${j.weight.toFixed(0)}%`}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {jurisdictionBreakdown.map(j => (
                <span key={j.jurisdiction} className="text-xs text-muted-foreground">
                  {JURISDICTION_FLAGS[j.jurisdiction]} {j.jurisdiction} {j.weight.toFixed(0)}%
                </span>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {westernWeight.toFixed(0)}% of holdings are in Western-allied jurisdictions (Canada, USA, Australia, UK). 
            This reflects lower political risk and no sanctions exposure. The 5% Kazakhstan weight (Kazatomprom) is the 
            world's lowest-cost producer but carries geopolitical risk given proximity to Russia.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Holdings and weights approximate as of Q1 2026. Updates quarterly with index rebalance. Source: Sprott/North Shore Global Uranium Mining Index.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ───
export default function UraniumSignalLenses({ anchorResult, forcesResult, leverageResult }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnchorCard anchor={anchorResult} />
        <ForcesCard forces={forcesResult} />
        <LeverageCard leverage={leverageResult} />
      </div>
      <HoldingsSection />
    </div>
  );
}
