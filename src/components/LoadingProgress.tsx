interface LoadingProgressProps {
  message: string;
  completedSeries?: string[];
  totalSeries?: number;
}

const LoadingProgress = ({ message, completedSeries = [], totalSeries = 0 }: LoadingProgressProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="font-display text-4xl text-primary tracking-wide">MERIDIAN</h1>
        <p className="text-xs text-muted-foreground tracking-widest mt-2">Investment Intelligence</p>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-mono animate-pulse text-center">
          {message}
        </p>

        {completedSeries.length > 0 && (
          <div className="w-full space-y-1.5 mt-2">
            {completedSeries.map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm font-mono">
                <span className="text-bullish">✓</span>
                <span className="text-muted-foreground">{name}</span>
              </div>
            ))}
            {totalSeries > completedSeries.length && (
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="w-3.5 h-3.5 border border-primary/40 border-t-transparent rounded-full animate-spin inline-block" />
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
