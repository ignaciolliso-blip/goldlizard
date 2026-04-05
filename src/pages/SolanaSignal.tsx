import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSolanaData } from '@/hooks/useSolanaData';
import { computeSolanaAnchor, computeSolanaForces, computeSolanaLeverage } from '@/lib/solanaEngine';
import LoadingProgress from '@/components/LoadingProgress';
import PageIntro from '@/components/PageIntro';
import Footer from '@/components/Footer';
import SolanaAnchorCard from '@/components/solana/SolanaAnchorCard';
import SolanaForcesCard from '@/components/solana/SolanaForcesCard';
import SolanaLeverageCard from '@/components/solana/SolanaLeverageCard';
import SolanaPositioning from '@/components/solana/SolanaPositioning';
import SolanaAgentChart from '@/components/solana/SolanaAgentChart';

const SolanaSignal = () => {
  const { metrics, history, agentMetrics, loading, error } = useSolanaData();

  const anchor = useMemo(() => metrics ? computeSolanaAnchor(metrics, history) : null, [metrics, history]);
  const forces = useMemo(() => metrics ? computeSolanaForces(metrics, history, agentMetrics) : null, [metrics, history, agentMetrics]);
  const leverage = useMemo(() => {
    if (!anchor || !forces) return null;
    return computeSolanaLeverage(anchor.ratioTrend6m, forces.overallVerdict);
  }, [anchor, forces]);

  if (loading) return <LoadingProgress message="Loading Solana data..." />;

  if (error || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl text-destructive mb-3">Error</h1>
          <p className="text-muted-foreground mb-4">{error || 'Failed to load data'}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-solana/20 text-solana rounded-lg font-medium hover:bg-solana/30 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 space-y-10">
        {/* Temporary debug banner */}
        {(() => {
          const df = Number(metrics.daily_fees) || 0;
          const fdv = Number(metrics.sol_fdv) || 0;
          const ann = df * 365;
          const ratio = ann > 0 ? fdv / ann : 0;
          return (
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg px-4 py-2 font-mono text-xs text-yellow-300">
              DEBUG: daily_fees = ${df.toLocaleString()} | fdv = ${fdv > 0 ? `$${(fdv / 1e9).toFixed(1)}B` : 'N/A'} | fdv_fee_ratio = {ratio > 0 ? `${ratio.toFixed(1)}×` : '0'} (computed live) | agent_rows = {agentMetrics.length} | daily_txns = {metrics.daily_transactions?.toLocaleString() ?? 'N/A'} | last_updated = {metrics.last_updated || 'N/A'}
            </div>
          );
        })()}
        {/* Page intro */}
        <PageIntro storageKey="solana_signal_intro_dismissed">
          <h3 className="font-display text-foreground mb-3">How to Read This Page</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            This page answers one question: <span className="text-foreground font-medium">is Solana fairly valued based on what the network actually does?</span>
          </p>
          <p className="text-muted-foreground leading-relaxed mb-2">It uses three independent lenses:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-solana font-semibold">THE ANCHOR</span>
              <span className="text-muted-foreground ml-2">Is Solana cheap or expensive relative to the fees it earns?</span>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-solana font-semibold">THE FORCES</span>
              <span className="text-muted-foreground ml-2">Is network usage growing or shrinking — and who's using it?</span>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-solana font-semibold">THE LEVERAGE</span>
              <span className="text-muted-foreground ml-2">How should you get exposure — SOL, ETF, or ecosystem tokens?</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-3">
            Solana is NOT like gold or uranium. Gold and uranium have physical scarcity. 
            Solana is a technology platform — its value depends on adoption, revenue, 
            and competitive position. Technology platforms can go to zero if a better 
            alternative emerges. Invest accordingly.
          </p>
        </PageIntro>

        {/* Band 1: Three Lenses */}
        <div className="space-y-3">
          <h3 className="font-display text-foreground">The Three Lenses</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {anchor && <SolanaAnchorCard result={anchor} />}
            {forces && <SolanaForcesCard result={forces} />}
            {leverage && <SolanaLeverageCard result={leverage} />}
          </div>
        </div>

        {/* Band 2: Signature Charts */}
        <div className="space-y-3">
          <h3 className="font-display text-foreground">The Signal Charts</h3>
          <p className="text-muted-foreground text-sm">
            These charts show whether agent activity and SOL price are aligned or diverging.
          </p>
          <SolanaAgentChart data={agentMetrics} />
        </div>

        {/* Band 3: Positioning */}
        {anchor && forces && leverage && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">Based on the combined reading of all three lenses:</p>
            <SolanaPositioning anchor={anchor} forces={forces} leverage={leverage} solPrice={metrics.sol_price} />
          </div>
        )}

        {/* Key metrics bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'SOL', value: `$${metrics.sol_price.toFixed(2)}` },
            { label: 'TVL', value: metrics.tvl_usd > 0 ? `$${(metrics.tvl_usd / 1e9).toFixed(2)}B` : '—' },
            { label: 'Stablecoins', value: metrics.stablecoin_supply > 0 ? `$${(metrics.stablecoin_supply / 1e9).toFixed(1)}B` : '—' },
            { label: 'Last Updated', value: metrics.last_updated ? new Date(metrics.last_updated).toLocaleTimeString() : '—' },
          ].map(m => (
            <div key={m.label} className="bg-card border border-card-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-mono">{m.label}</p>
              <p className="font-mono text-foreground text-lg">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Navigation CTA */}
        <div className="text-center">
          <Link
            to="/solana/analysis"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-medium hover:border-solana/30 hover:shadow-[0_0_15px_-5px_hsl(var(--solana)/0.3)] transition-all duration-200"
          >
            Explore Analysis <ArrowRight size={16} />
          </Link>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default SolanaSignal;
