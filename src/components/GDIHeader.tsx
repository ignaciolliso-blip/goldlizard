interface GDIHeaderProps {
  currentGDI: number;
  weightMode: 'fixed' | 'rolling';
  onWeightModeChange: (mode: 'fixed' | 'rolling') => void;
}

const GDIHeader = ({ currentGDI, weightMode, onWeightModeChange }: GDIHeaderProps) => {
  const gdiColor = currentGDI > 0.5
    ? 'text-bullish'
    : currentGDI < -0.5
      ? 'text-bearish'
      : 'text-neutral';

  const regime = currentGDI > 1
    ? 'Strongly Bullish'
    : currentGDI > 0.5
      ? 'Bullish'
      : currentGDI > -0.5
        ? 'Neutral'
        : currentGDI > -1
          ? 'Bearish'
          : 'Strongly Bearish';

  return (
    <div className="mb-8">
      <h1 className="font-display text-4xl text-gold mb-1">
        Gold Driver Index
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Composite macro regime monitor for gold
      </p>

      <div className="flex items-end gap-8 mb-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Current GDI
          </p>
          <p className={`font-mono text-5xl font-bold ${gdiColor}`}>
            {currentGDI.toFixed(3)}
          </p>
          <p className={`text-sm font-medium mt-1 ${gdiColor}`}>
            {regime}
          </p>
        </div>

        {/* Weight mode toggle */}
        <div className="flex rounded-lg border border-card-border overflow-hidden">
          <button
            onClick={() => onWeightModeChange('fixed')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              weightMode === 'fixed'
                ? 'bg-gold text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            Fixed Weights
          </button>
          <button
            onClick={() => onWeightModeChange('rolling')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              weightMode === 'rolling'
                ? 'bg-gold text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            Rolling Correlation
          </button>
        </div>
      </div>
    </div>
  );
};

export default GDIHeader;
