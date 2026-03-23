interface DashboardHeaderProps {
  currentGDI: number;
  weightMode: 'fixed' | 'rolling';
  onWeightModeChange: (mode: 'fixed' | 'rolling') => void;
  lastUpdated?: string;
}

const DashboardHeader = ({ currentGDI, weightMode, onWeightModeChange, lastUpdated }: DashboardHeaderProps) => {
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-card-border">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-xl text-gold leading-none">
              Gold Driver Index
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Macro regime monitor for gold positioning
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-5">
          {/* Weight toggle */}
          <div className="flex rounded-md border border-card-border overflow-hidden">
            <button
              onClick={() => onWeightModeChange('fixed')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                weightMode === 'fixed'
                  ? 'bg-gold/20 text-gold'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              Fixed Weights
            </button>
            <button
              onClick={() => onWeightModeChange('rolling')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                weightMode === 'rolling'
                  ? 'bg-gold/20 text-gold'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              Rolling Weights
            </button>
          </div>

          {/* GDI reading */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">GDI</p>
              <p className={`font-mono text-2xl font-bold leading-none mt-0.5 ${gdiColor}`}>
                {currentGDI > 0 ? '+' : ''}{currentGDI.toFixed(2)}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider border ${badgeBg}`}>
              {signal}
            </span>
          </div>

          {/* Last updated */}
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
