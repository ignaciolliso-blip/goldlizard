import { GraduationCap } from 'lucide-react';
import { useGuideMode, GuideTooltip } from './GuideMode';
import type { TierContribution } from '@/lib/gdiEngine';

interface DashboardHeaderProps {
  currentGDI: number;
  weightMode: 'fixed' | 'rolling';
  onWeightModeChange: (mode: 'fixed' | 'rolling') => void;
  lastUpdated?: string;
  tierContributions?: TierContribution;
}

const DashboardHeader = ({ currentGDI, weightMode, onWeightModeChange, lastUpdated, tierContributions }: DashboardHeaderProps) => {
  const { isGuideMode, toggleGuideMode } = useGuideMode();

  const gdiColor = currentGDI > 0.5
    ? 'text-bullish'
    : currentGDI < -0.5
      ? 'text-bearish'
      : 'text-neutral';

  const badgeBg = currentGDI > 0.5
    ? 'bg-bullish/15 text-bullish border-bullish/30'
    : currentGDI < -0.5
      ? 'bg-bearish/15 text-bearish border-bearish/30'
      : 'bg-neutral/15 text-neutral border-neutral/30';

  const signal = currentGDI > 0.5 ? 'BULLISH' : currentGDI < -0.5 ? 'BEARISH' : 'NEUTRAL';

  const gdiDirection = currentGDI > 0 ? 'bullish' : currentGDI < 0 ? 'bearish' : 'neutral';

  const tierColor = (v: number) => v > 0.05 ? 'text-bullish' : v < -0.05 ? 'text-bearish' : 'text-muted-foreground';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-card-border">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-xl text-gold leading-none truncate">
              Gold Driver Index
            </h1>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">
              Macro regime monitor for gold positioning
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Guide Mode toggle */}
          <button
            onClick={toggleGuideMode}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors border ${
              isGuideMode
                ? 'bg-gold/20 text-gold border-gold/30'
                : 'bg-card text-muted-foreground border-card-border hover:text-foreground'
            }`}
          >
            <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Weight toggle */}
          <GuideTooltip id="weight-toggle" text="Fixed Weights are based on academic regression studies. Rolling Weights adapt automatically using trailing 52-week correlation with gold." position="bottom">
            <div className="flex rounded-md border border-card-border overflow-hidden">
              <button
                onClick={() => onWeightModeChange('fixed')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${
                  weightMode === 'fixed'
                    ? 'bg-gold/20 text-gold'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Fixed
              </button>
              <button
                onClick={() => onWeightModeChange('rolling')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${
                  weightMode === 'rolling'
                    ? 'bg-gold/20 text-gold'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Rolling
              </button>
            </div>
          </GuideTooltip>

          {/* GDI reading + tier decomposition */}
          <div className="flex items-center gap-2 sm:gap-3">
            <GuideTooltip id="gdi-number" text={`GDI = ${currentGDI > 0 ? '+' : ''}${currentGDI.toFixed(2)}. The tier breakdown shows whether bullishness comes from structural forces (more reliable) or cyclical conditions (less reliable).`} position="bottom">
              <div className="text-right">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest leading-none">GDI</p>
                <p className={`font-mono text-lg sm:text-2xl font-bold leading-none mt-0.5 ${gdiColor}`}>
                  {currentGDI > 0 ? '+' : ''}{currentGDI.toFixed(2)}
                </p>
                {/* Tier decomposition */}
                {tierContributions && (
                  <div className="hidden lg:flex items-center gap-1.5 mt-0.5 text-[8px] font-mono">
                    <span className={tierColor(tierContributions.structural)}>T1:{tierContributions.structural > 0 ? '+' : ''}{tierContributions.structural.toFixed(2)}</span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className={tierColor(tierContributions.demand)}>T2:{tierContributions.demand > 0 ? '+' : ''}{tierContributions.demand.toFixed(2)}</span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className={tierColor(tierContributions.conditions)}>T3:{tierContributions.conditions > 0 ? '+' : ''}{tierContributions.conditions.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </GuideTooltip>
            <GuideTooltip id="signal-badge" text="Based on the GDI composite value." position="bottom">
              <span className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[11px] font-semibold tracking-wider border ${badgeBg}`}>
                {signal}
              </span>
            </GuideTooltip>
          </div>

          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground hidden lg:block">
              Updated {lastUpdated}
            </p>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
