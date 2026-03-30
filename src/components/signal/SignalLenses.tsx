import { Compass, Wind, Pickaxe } from 'lucide-react';
import type { AnchorResult } from '@/lib/anchorEngine';
import { getZone, getZoneConclusion } from '@/lib/anchorEngine';
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

  const { totalParity, investableParity, currentGoldPrice, pctOfInvestableParity, pctOfTotalParity, currentM2 } = anchor;
  const zone = getZone(pctOfInvestableParity);
  const conclusion = getZoneConclusion(pctOfInvestableParity);

  // Thermometer: position gold spot between 0 and investable parity (with overflow for above parity)
  const gaugeMax = investableParity * 1.3; // allow headroom
  const totalPct = Math.max(0, Math.min(100, (totalParity / gaugeMax) * 100));
  const spotPct = Math.max(0, Math.min(100, (currentGoldPrice / gaugeMax) * 100));
  const invPct = Math.max(0, Math.min(100, (investableParity / gaugeMax) * 100));

  const conclusionColor = zone.zone === 'above_parity' || zone.zone === 'elevated'
    ? 'text-bearish' : zone.zone === 'undervalued' || zone.zone === 'extreme_undervaluation'
    ? 'text-bullish' : 'text-primary';

  return (
    <CardShell title="THE ANCHOR" icon={<Compass size={14} />} guideId="lens-anchor" guideText={`This gauge shows how much of the 'investable parity' gold has captured. At 100%, gold has fully repriced to absorb the money supply — that only happened once, in the 1980 gold mania. At 10%, gold is being ignored. We're at ${pctOfInvestableParity.toFixed(0)}%.`}>
      <div className="space-y-3">
        <p className="text-[9px] text-muted-foreground text-center uppercase tracking-wider">M2 Per Ounce of Gold</p>

        {/* Vertical thermometer gauge */}
        <div className="flex items-center gap-4">
          <div className="relative w-6 flex-shrink-0" style={{ height: '140px' }}>
            {/* Track */}
            <div className="absolute inset-x-0 inset-y-0 rounded-full bg-muted/30 border border-border" />
            {/* Filled portion up to spot */}
            <div
              className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-primary/30 to-primary/10"
              style={{ height: `${spotPct}%` }}
            />
            {/* Total parity marker */}
            <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${totalPct}%`, transform: 'translateY(50%)' }}>
              <div className="w-full h-0.5 bg-bullish" />
            </div>
            {/* Spot price marker */}
            <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${spotPct}%`, transform: 'translateY(50%)' }}>
              <div className="w-full h-1 bg-primary rounded-full shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
            </div>
            {/* Investable parity marker */}
            <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${invPct}%`, transform: 'translateY(50%)' }}>
              <div className="w-full h-0.5 bg-blue-400" />
            </div>
          </div>

          {/* Labels */}
          <div className="flex-1 relative" style={{ height: '140px' }}>
            {/* Investable parity label */}
            <div className="absolute text-[10px] font-mono" style={{ bottom: `${invPct}%`, transform: 'translateY(50%)' }}>
              <span className="text-blue-400">{fmt(investableParity)}</span>
              <span className="text-muted-foreground/60 ml-1">Investable</span>
            </div>
            {/* Spot label */}
            <div className="absolute text-[10px] font-mono font-semibold" style={{ bottom: `${spotPct}%`, transform: 'translateY(50%)' }}>
              <span className="text-primary">{fmt(currentGoldPrice)}</span>
              <span className="text-muted-foreground/60 ml-1">Spot</span>
            </div>
            {/* Total parity label */}
            <div className="absolute text-[10px] font-mono" style={{ bottom: `${totalPct}%`, transform: 'translateY(50%)' }}>
              <span className="text-bullish">{fmt(totalParity)}</span>
              <span className="text-muted-foreground/60 ml-1">Total</span>
            </div>
          </div>
        </div>

        {/* Key stat */}
        <p className="text-[10px] text-center text-muted-foreground">
          Gold has captured <span className="text-foreground font-semibold">{pctOfInvestableParity.toFixed(0)}%</span> of investable parity.{' '}
          <span className="text-primary">{(100 - pctOfInvestableParity).toFixed(0)}%</span> of money printing remains unpriced.
        </p>

        {/* Three numbers */}
        <div className="space-y-0.5 text-[10px] font-mono">
          <div className="flex justify-between">
            <span className="text-bullish">{fmt(totalParity)}</span>
            <span className="text-muted-foreground">Total parity (M2 ÷ all gold)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary">{fmt(currentGoldPrice)}</span>
            <span className="text-muted-foreground">Gold spot today</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-400">{fmt(investableParity)}</span>
            <span className="text-muted-foreground">Investable parity (M2 ÷ inv. gold)</span>
          </div>
        </div>

        <p className={`text-[10px] font-semibold text-center ${conclusionColor}`}>
          {conclusion}
        </p>

        <p className="text-[8px] text-muted-foreground/50 text-center">
          Both parities rise ~4.5%/yr as M2 grows 6% and gold supply grows only 1.5%.
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
