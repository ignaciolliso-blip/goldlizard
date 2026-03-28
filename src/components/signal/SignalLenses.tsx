import { Compass, Wind, Pickaxe } from 'lucide-react';
import type { AnchorResult } from '@/lib/anchorEngine';
import type { GDIResult } from '@/lib/gdiEngine';
import type { LeverageResult } from '@/lib/leverageEngine';

interface Props {
  anchorResult: AnchorResult | null;
  gdiResult: GDIResult | null;
  leverageResult: LeverageResult | null;
  currentGDI: number;
  currentGDXPrice: number;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function AnchorCard({ anchor }: { anchor: AnchorResult | null }) {
  if (!anchor) return <CardShell title="THE ANCHOR" icon={<Compass size={14} />}><p className="text-muted-foreground text-sm">Loading...</p></CardShell>;

  const { cpiFairValue, m2FairValue, currentGoldPrice } = anchor;
  const belowBoth = currentGoldPrice < cpiFairValue;
  const aboveBoth = currentGoldPrice > m2FairValue;

  // Gauge position: 0 = cpiFV, 1 = m2FV
  const range = m2FairValue - cpiFairValue;
  const position = range > 0 ? Math.max(0, Math.min(1, (currentGoldPrice - cpiFairValue) / range)) : 0.5;

  let conclusion: { text: string; color: string };
  if (belowBoth) {
    conclusion = { text: 'BELOW BOTH FAIR VALUES — Compelling entry', color: 'text-anchor-cpi' };
  } else if (aboveBoth) {
    conclusion = { text: 'ABOVE BOTH FAIR VALUES — Stretched', color: 'text-bearish' };
  } else {
    conclusion = { text: 'DEBASEMENT NOT FULLY PRICED IN', color: 'text-neutral' };
  }

  return (
    <CardShell title="THE ANCHOR" icon={<Compass size={14} />}>
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">CPI Fair Value</span>
            <span className="font-mono text-sm text-anchor-cpi">${fmt(cpiFairValue)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">M2 Fair Value</span>
            <span className="font-mono text-sm text-anchor-m2">${fmt(m2FairValue)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">Spot Price</span>
            <span className="font-mono text-lg text-primary font-semibold">${fmt(currentGoldPrice)}</span>
          </div>
        </div>

        {/* Vertical gauge */}
        <div className="relative h-24 w-6 mx-auto rounded-full overflow-hidden border border-border">
          {/* Green zone (below CPI) */}
          <div className="absolute bottom-0 left-0 right-0 bg-anchor-cpi/20" style={{ height: '33%' }} />
          {/* Gold zone (between) */}
          <div className="absolute left-0 right-0 bg-primary/20" style={{ top: '33%', height: '34%' }} />
          {/* Blue zone (above M2) */}
          <div className="absolute top-0 left-0 right-0 bg-anchor-m2/20" style={{ height: '33%' }} />
          {/* Marker */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background z-10"
            style={{ bottom: `${(belowBoth ? position * 33 : aboveBoth ? 67 + position * 33 : 33 + position * 34)}%`, transform: 'translate(-50%, 50%)' }}
          />
        </div>

        <p className={`text-xs font-semibold text-center ${conclusion.color}`}>
          {conclusion.text}
        </p>
      </div>
    </CardShell>
  );
}

function ForcesCard({ gdiResult, currentGDI }: { gdiResult: GDIResult | null; currentGDI: number }) {
  if (!gdiResult) return <CardShell title="THE FORCES" icon={<Wind size={14} />}><p className="text-muted-foreground text-sm">Loading...</p></CardShell>;

  const signal = currentGDI > 0.5 ? 'BULLISH' : currentGDI < -0.5 ? 'BEARISH' : 'NEUTRAL';
  const signalColor = currentGDI > 0.5 ? 'text-bullish' : currentGDI < -0.5 ? 'text-bearish' : 'text-neutral';

  const tc = gdiResult.tierContributions;
  const tiers = [
    { label: 'Structural', value: tc.structural },
    { label: 'Demand', value: tc.demand },
    { label: 'Conditions', value: tc.conditions },
  ];

  const keyDriver = gdiResult.variableDetails.reduce((best, v) =>
    Math.abs(v.contribution) > Math.abs(best.contribution) ? v : best
  );

  const maxAbsContrib = Math.max(...tiers.map(t => Math.abs(t.value)), 0.01);

  return (
    <CardShell title="THE FORCES" icon={<Wind size={14} />}>
      <div className="space-y-3">
        <div className="text-center">
          <span className={`font-mono text-2xl font-bold ${signalColor}`}>
            {currentGDI >= 0 ? '+' : ''}{currentGDI.toFixed(1)}
          </span>
          <p className={`text-sm font-semibold ${signalColor}`}>{signal}</p>
        </div>

        <div className="space-y-2">
          {tiers.map(t => (
            <div key={t.label} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.label}</span>
                <span className={`font-mono ${t.value > 0 ? 'text-bullish' : t.value < 0 ? 'text-bearish' : 'text-muted-foreground'}`}>
                  {t.value >= 0 ? '+' : ''}{t.value.toFixed(2)}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${t.value >= 0 ? 'bg-bullish' : 'bg-bearish'}`}
                  style={{
                    width: `${Math.min(100, (Math.abs(t.value) / maxAbsContrib) * 100)}%`,
                    marginLeft: t.value < 0 ? 'auto' : undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Key driver: {keyDriver.name} ({keyDriver.contribution >= 0 ? '+' : ''}{keyDriver.contribution.toFixed(2)})
        </p>
      </div>
    </CardShell>
  );
}

function LeverageCard({ leverage, currentGDXPrice }: { leverage: LeverageResult | null; currentGDXPrice: number }) {
  if (!leverage) return <CardShell title="THE LEVERAGE" icon={<Pickaxe size={14} />}><p className="text-muted-foreground text-sm">Loading...</p></CardShell>;

  const { currentGDXGoldRatio, currentPercentile } = leverage;
  const pctColor = currentPercentile < 25 ? 'text-bullish' : currentPercentile > 75 ? 'text-bearish' : 'text-neutral';

  let conclusion: { text: string; color: string };
  if (currentPercentile < 25) {
    conclusion = { text: 'UNDERVALUED vs gold — catch-up potential HIGH', color: 'text-bullish' };
  } else if (currentPercentile > 75) {
    conclusion = { text: 'OVERVALUED — miners have front-run gold', color: 'text-bearish' };
  } else {
    conclusion = { text: 'FAIRLY VALUED — in line with gold', color: 'text-neutral' };
  }

  return (
    <CardShell title="THE LEVERAGE" icon={<Pickaxe size={14} />}>
      <div className="space-y-3">
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">GDX/Gold Ratio</p>
          <p className="font-mono text-lg text-leverage-miner font-semibold">{currentGDXGoldRatio.toFixed(4)}</p>
          <p className={`font-mono text-sm ${pctColor}`}>
            {currentPercentile.toFixed(0)}th percentile (10yr)
          </p>
        </div>

        {/* Percentile bar */}
        <div className="relative h-2 bg-muted rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-leverage-miner border-2 border-background z-10"
            style={{ left: `${Math.min(100, Math.max(0, currentPercentile))}%`, transform: 'translate(-50%, -50%)' }}
          />
          <div className="absolute inset-y-0 left-0 w-1/4 bg-bullish/20 rounded-l-full" />
          <div className="absolute inset-y-0 right-0 w-1/4 bg-bearish/20 rounded-r-full" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Cheap</span>
          <span>Expensive</span>
        </div>

        <p className={`text-xs font-semibold text-center ${conclusion.color}`}>
          {conclusion.text}
        </p>

        <p className="text-xs text-muted-foreground text-center">
          Current GDX: ${currentGDXPrice.toFixed(2)}
        </p>
      </div>
    </CardShell>
  );
}

function CardShell({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SignalLenses(props: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AnchorCard anchor={props.anchorResult} />
      <ForcesCard gdiResult={props.gdiResult} currentGDI={props.currentGDI} />
      <LeverageCard leverage={props.leverageResult} currentGDXPrice={props.currentGDXPrice} />
    </div>
  );
}
