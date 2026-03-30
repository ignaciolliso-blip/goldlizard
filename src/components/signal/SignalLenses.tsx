import { Compass, Wind, Pickaxe } from 'lucide-react';
import type { AnchorResult } from '@/lib/anchorEngine';
import { ANCHOR_ZONES, getZone, getZoneConclusion } from '@/lib/anchorEngine';
import type { GDIResult } from '@/lib/gdiEngine';
import type { LeverageResult } from '@/lib/leverageEngine';
import { GuideTooltip } from '@/components/GuideMode';

interface Props {
  anchorResult: AnchorResult | null;
  gdiResult: GDIResult | null;
  leverageResult: LeverageResult | null;
  currentGDI: number;
  currentGDXPrice: number;
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function AnchorCard({ anchor }: { anchor: AnchorResult | null }) {
  if (!anchor) return <CardShell title="THE ANCHOR" icon={<Compass size={14} />}><p className="text-muted-foreground text-sm">Loading...</p></CardShell>;

  const { m2GoldRatio, currentM2, currentGoldPrice } = anchor;
  const zone = getZone(m2GoldRatio);
  const conclusion = getZoneConclusion(m2GoldRatio);

  const gaugeMin = 1.5;
  const gaugeMax = 22;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - gaugeMin) / (gaugeMax - gaugeMin)) * 100));
  const currentPct = pct(m2GoldRatio);

  const markers = [
    { label: '1980', ratio: 2 },
    { label: '2011', ratio: 3.5 },
    { label: '2015', ratio: 13 },
    { label: '2000', ratio: 20 },
  ];

  const priceAt2011 = currentM2 / 3.5;
  const priceAt2015 = currentM2 / 13;
  const priceAt1980 = currentM2 / 2;
  const pctFrom = (target: number) => ((target / currentGoldPrice - 1) * 100);

  const conclusionColor = zone.zone === 'extreme_fear' || zone.zone === 'elevated_fear'
    ? 'text-bearish' : zone.zone === 'complacency' || zone.zone === 'extreme_complacency'
    ? 'text-bullish' : 'text-primary';

  return (
    <CardShell title="THE ANCHOR" icon={<Compass size={14} />} guideId="lens-anchor" guideText={`This gauge shows how many M2 dollars exist per ounce of gold. When the ratio is high, gold is relatively cheap. When low, gold has absorbed the money printing. We're at ${m2GoldRatio.toFixed(1)}, in the ${zone.label}.`}>
      <div className="space-y-3">
        {/* Horizontal gauge */}
        <div className="relative mt-1">
          <div className="flex h-2.5 rounded-full overflow-hidden">
            {ANCHOR_ZONES.map((z, i) => {
              const width = ((z.range[1] - z.range[0]) / (gaugeMax - gaugeMin)) * 100;
              const colors = ['bg-bearish/70', 'bg-bearish/40', 'bg-primary/40', 'bg-bullish/30', 'bg-bullish/60'];
              return <div key={i} className={colors[i]} style={{ width: `${width}%` }} />;
            })}
          </div>
          <div className="absolute -top-0.5 w-3.5 h-3.5 rounded-full bg-foreground border-2 border-background shadow-lg transform -translate-x-1/2" style={{ left: `${currentPct}%` }} />
          <div className="relative h-6 mt-0.5">
            {markers.map(m => (
              <div key={m.label} className="absolute text-center transform -translate-x-1/2" style={{ left: `${pct(m.ratio)}%` }}>
                <div className="w-px h-1.5 bg-muted-foreground/30 mx-auto" />
                <span className="text-[7px] text-muted-foreground/50 block">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-foreground">
            <span>M2/Gold</span>
            <span className="font-semibold">{m2GoldRatio.toFixed(1)} — {zone.label}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-[10px]">
            <span>At 2011 (3.5):</span>
            <span className={pctFrom(priceAt2011) > 0 ? 'text-bullish' : 'text-bearish'}>{fmt(priceAt2011)} ({pctFrom(priceAt2011) > 0 ? '+' : ''}{pctFrom(priceAt2011).toFixed(0)}%)</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-[10px]">
            <span>At 2015 (13):</span>
            <span className={pctFrom(priceAt2015) > 0 ? 'text-bullish' : 'text-bearish'}>{fmt(priceAt2015)} ({pctFrom(priceAt2015).toFixed(0)}%)</span>
          </div>
        </div>

        <p className={`text-[10px] font-semibold text-center ${conclusionColor}`}>
          {conclusion}
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
    <CardShell title="THE FORCES" icon={<Wind size={14} />} guideId="lens-forces" guideText="The Forces (GDI) combine 10 macro variables into a single composite reading. Above +0.5 = bullish macro backdrop for gold. Below -0.5 = bearish. The three tiers show which category of forces is dominant right now.">
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
    <CardShell title="THE LEVERAGE" icon={<Pickaxe size={14} />} guideId="lens-leverage" guideText="The Leverage lens measures whether gold miners (GDX) are cheap or expensive relative to gold itself. When the ratio is below the 25th percentile, miners have historically delivered outsized returns as the ratio mean-reverts.">
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

function CardShell({ title, icon, children, guideId, guideText }: { title: string; icon: React.ReactNode; children: React.ReactNode; guideId?: string; guideText?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-muted-foreground">{icon}</span>
        {guideId && guideText ? (
          <GuideTooltip id={guideId} text={guideText}>
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h2>
          </GuideTooltip>
        ) : (
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h2>
        )}
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
