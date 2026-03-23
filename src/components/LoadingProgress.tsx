interface LoadingProgressProps {
  message: string;
}

const LoadingProgress = ({ message }: LoadingProgressProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="font-display text-3xl text-gold">
        Gold Driver Index
      </h1>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-mono animate-pulse-gold">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingProgress;
