interface LoadingProgressProps {
  message: string;
  completedSeries?: string[];
  totalSeries?: number;
}

const LoadingProgress = ({ message, completedSeries = [], totalSeries = 0 }: LoadingProgressProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="font-display text-3xl text-gold tracking-wide">MERIDIAN</h1>
        <p className="text-[10px] text-muted-foreground tracking-widest mt-1">Investment Intelligence</p>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-mono animate-pulse-gold text-center">
          {message}
        </p>

        {/* Series progress list */}
        {completedSeries.length > 0 && (
          <div className="w-full space-y-1 mt-2">
            {completedSeries.map((name) => (
              <div key={name} className="flex items-center gap-2 text-xs font-mono">
                <span className="text-bullish">✓</span>
                <span className="text-muted-foreground">{name}</span>
              </div>
            ))}
            {totalSeries > completedSeries.length && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-3 h-3 border border-gold/40 border-t-transparent rounded-full animate-spin inline-block" />
                <span className="text-muted-foreground/60">{message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingProgress;
