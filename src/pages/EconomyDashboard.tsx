import Footer from '@/components/Footer';

export default function EconomyDashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-8 space-y-10">
        <header className="space-y-2">
          <h1 className="font-display text-4xl text-economy tracking-wide">
            Macro Economy Dashboard
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            Global · US · Europe · Spain
          </p>
        </header>

        <div className="bg-card border border-card-border rounded-xl p-12 text-center text-muted-foreground">
          Charts loading...
        </div>
      </main>
      <footer className="w-full py-8 mt-12 border-t border-border/30">
        <p className="text-center text-xs text-muted-foreground/60">
          Built by Nacho · Powered by ECB, Eurostat, INE, IMF, FRED, World Gold Council, and Claude · Not financial advice
        </p>
      </footer>
    </div>
  );
}
