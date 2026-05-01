import { Compass, Wind, Pickaxe } from 'lucide-react';
import type { AnchorResult } from '@/lib/anchorEngine';
import { getZoneConclusion, HISTORICAL_MEDIAN_PCT, HISTORICAL_MEAN_PCT } from '@/lib/anchorEngine';
import type { GDIResult } from '@/lib/gdiEngine';
import type { LeverageResult } from '@/lib/leverageEngine';
import { deriveLeverageConclusion, HISTORICAL_AVG_PNAV } from '@/lib/leverageEngine';
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
  if (!anchor) return <CardShell title="THE ANCHOR" subtitle="Is gold cheap or expensive relative to the money supply?" icon={<Compass size={16} />}><SkeletonCard /></CardShell>;

  const { investableParity, currentGoldPrice, pctOfInvestableParity } = anchor;
  const conclusion = getZoneConclusion(pctOfInvestableParity);

  const gaugeTop = 110;
  const clamp = (pct: number) => Math.max(0, Math.min(100, (pct / gaugeTop) * 100));

  const levels = [
    { pct: 100, label: 'G5 FULL PARITY', price: fmt(investableParity), color: 'text-blue-400', highlight: false },
    { pct: 50.7, label: '1980 MANIA (51%)', price: '', color: 'text-bearish', highlight: false },
    { pct: pctOfInvestableParity, label: `● TODAY (${pctOfInvestableParity.toFixed(0)}%)`, price: fmt(currentGoldPrice), color: 'text-primary', highlight: true },
    { pct: 15.2, label: '2011 PEAK (15%)', price: '', color: 'text-muted-foreground', highlight: false },
    { pct: HISTORICAL_MEAN_PCT, label: `MEAN (${HISTORICAL_MEAN_PCT}%)`, price: '', color: 'text-neutral', highlight: false },
    { pct: HISTORICAL_MEDIAN_PCT, label: `MEDIAN (${HISTORICAL_MEDIAN_PCT}%)`, price: '', color: 'text-bullish', highlight: false },
    { pct: 6.3, label: '1999 LOW (6%)', price: '', color: 'text-muted-foreground', highlight: false },
  ];

  const goldAtMedian = investableParity * (HISTORICAL_MEDIAN_PCT / 100);
  const goldAtMean = investableParity * (HISTORICAL_MEAN_PCT / 100);

  return (
    <CardShell title="THE ANCHOR" subtitle="Is gold cheap or expensive relative to the money supply?" icon={<Compass size={16} />} guideId="lens-anchor" guideText={`This gauge shows what percentage of 'investable parity' gold has captured. At 100%, gold fully repriced to match money supply — only happened once in 1980. Historical average ~35%. Today: ${pctOfInvestableParity.toFixed(0)}%, which is above average.`}>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground text-center uppercase tracking-wider">% of Investable Parity</p>
        <div className="flex items-stretch gap-4">
          <div className="relative w-6 flex-shrink-0" style={{ height: '220px' }}>
            <div className="absolute inset-0 rounded-full overflow-hidden border border-border">
              <div className="absolute inset-0 bg-gradient-to-t from-bullish/30 via-primary/20 to-bearish/30" />
            </div>
            <div className="absolute inset-x-0 bottom-0 rounded-b-full bg-gradient-to-t from-bullish/50 via-primary/40 to-primary/20" style={{ height: `${clamp(pctOfInvestableParity)}%` }} />
            <div className="absolute left-0 right-0" style={{ bottom: `${clamp(pctOfInvestableParity)}%`, transform: 'translateY(50%)' }}>
              <div className="w-full h-2 bg-primary rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
            </div>
          </div>
          <div className="flex-1 relative" style={{ height: '220px' }}>
            {levels.map((l, i) => (
              <div key={i} className={`absolute text-xs font-mono leading-tight ${l.color} ${l.highlight ? 'font-bold' : ''}`} style={{ bottom: `${clamp(l.pct)}%`, transform: 'translateY(50%)' }}>
                {l.label}{l.price && <span className="ml-1.5 text-muted-foreground/60">{l.price}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1 text-sm font-mono border-t border-border pt-3">
          <div className="flex justify-between">
            <span className="text-blue-400">{fmt(investableParity)}</span>
            <span className="text-muted-foreground">G5 total parity</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary font-semibold">{fmt(currentGoldPrice)}</span>
            <span className="text-muted-foreground">Gold spot ({pctOfInvestableParity.toFixed(0)}% of parity)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{fmt(goldAtMean)}</span>
            <span className="text-muted-foreground">At hist. mean ({HISTORICAL_MEAN_PCT}%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{fmt(goldAtMedian)}</span>
            <span className="text-muted-foreground">At hist. median ({HISTORICAL_MEDIAN_PCT}%)</span>
          </div>
        </div>
        <p className={`text-sm font-semibold text-center ${conclusion.color}`}>{conclusion.text}</p>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">{conclusion.detail}</p>
        <p className="text-xs text-muted-foreground/70 text-center">
          G5 Global M2 (US+Euro+China+Japan+UK) ÷ all mined oz. Parity grows ~3.5%/yr (G5 M2 +5%, gold supply +1.5%). Mean 12.7%, median 12.3% (2007–2024).
        </p>
      </div>
    </CardShell>
  );
}

function ForcesCard({ gdiResult, currentGDI }: { gdiResult: GDIResult | null; currentGDI: number }) {
  if (!gdiResult) return <CardShell title="THE FORCES" subtitle="Are macro forces pushing gold up or down right now?" icon={<Wind size={16} />}><SkeletonCard /></CardShell>;

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
    <CardShell title="THE FORCES" subtitle="Are macro forces pushing gold up or down right now?" icon={<Wind size={16} />} guideId="lens-forces" guideText="The Forces (GDI) combine 10 macro variables into a single composite reading. Above +0.5 = bullish macro backdrop for gold. Below -0.5 = bearish. The three tiers show which category of forces is dominant right now.">
      <div className="space-y-4">
        <div className="text-center">
          <span className={`font-mono text-3xl font-bold ${signalColor}`}>
            {currentGDI >= 0 ? '+' : ''}{currentGDI.toFixed(1)}
          </span>
          <p className={`text-sm font-semibold mt-1 ${signalColor}`}>{signal}</p>
        </div>
        <div className="space-y-3">
          {tiers.map(t => (
            <div key={t.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.label}</span>
                <span className={`font-mono ${t.value > 0 ? 'text-bullish' : t.value < 0 ? 'text-bearish' : 'text-muted-foreground'}`}>
                  {t.value >= 0 ? '+' : ''}{t.value.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
        <p className="text-sm text-muted-foreground text-center">
          Key driver: {keyDriver.name} ({keyDriver.contribution >= 0 ? '+' : ''}{keyDriver.contribution.toFixed(2)})
        </p>
      </div>
    </CardShell>
  );
}

function LeverageCard({ leverage, currentGDXPrice }: { leverage: LeverageResult | null; currentGDXPrice: number }) {
  if (!leverage) return <CardShell title="THE LEVERAGE" subtitle="Are gold miners cheap or expensive based on the value of their gold in the ground?" icon={<Pickaxe size={16} />}><SkeletonCard /></CardShell>;

  const { sectorPNAV } = leverage;
  const conclusion = deriveLeverageConclusion(sectorPNAV);
  const pnavColor = sectorPNAV < 0.8 ? 'text-bullish' : sectorPNAV > 1.5 ? 'text-bearish' : 'text-neutral';

  const gaugeMin = 0.3;
  const gaugeMax = 2.5;
  const clampPct = (v: number) => Math.max(0, Math.min(100, ((v - gaugeMin) / (gaugeMax - gaugeMin)) * 100));

  return (
    <CardShell title="THE LEVERAGE" subtitle="Are gold miners cheap or expensive based on the value of their gold in the ground?" icon={<Pickaxe size={16} />} guideId="lens-leverage" guideText="The Leverage lens measures P/NAV — whether you're paying a premium or discount for the gold in the ground. Below 0.8× = discount. 0.8-1.5× = fair value. Above 1.5× = premium.">
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Sector P/NAV</p>
          <p className={`font-mono text-xl font-semibold ${pnavColor}`}>{sectorPNAV.toFixed(2)}×</p>
          <p className="font-mono text-xs text-muted-foreground">
            Hist. avg: {HISTORICAL_AVG_PNAV}×
          </p>
        </div>

        {/* P/NAV Gauge */}
        <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-bullish/20 via-neutral/10 to-bearish/20">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-[0_0_8px_hsl(var(--primary)/0.5)] z-10"
            style={{ left: `${clampPct(sectorPNAV)}%`, transform: 'translate(-50%, -50%)' }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-muted-foreground/40"
            style={{ left: `${clampPct(HISTORICAL_AVG_PNAV)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span>0.3×</span>
          <span>1.0×</span>
          <span>2.5×</span>
        </div>

        <p className={`text-sm font-semibold text-center ${conclusion.color}`}>
          {conclusion.text}
        </p>

        <p className="text-sm text-muted-foreground text-center">
          GDX: ${currentGDXPrice.toFixed(2)}
        </p>
      </div>
    </CardShell>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-3">
      <div className="h-5 rounded bg-muted animate-pulse w-3/4 mx-auto" />
      <div className="h-4 rounded bg-muted animate-pulse w-1/2 mx-auto" />
      <div className="h-4 rounded bg-muted animate-pulse w-2/3 mx-auto" />
    </div>
  );
}

function CardShell({ title, subtitle, icon, children, guideId, guideText }: { title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode; guideId?: string; guideText?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 sm:p-7 flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        {guideId && guideText ? (
          <GuideTooltip id={guideId} text={guideText}>
            <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">{title}</h2>
          </GuideTooltip>
        ) : (
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">{title}</h2>
        )}
      </div>
      {subtitle && (
        <p className="text-sm text-muted-foreground/70 italic mb-4 ml-7">{subtitle}</p>
      )}
      {children}
    </div>
  );
}

export default function SignalLenses(props: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <AnchorCard anchor={props.anchorResult} />
      <ForcesCard gdiResult={props.gdiResult} currentGDI={props.currentGDI} />
      <LeverageCard leverage={props.leverageResult} currentGDXPrice={props.currentGDXPrice} />
    </div>
  );
}
