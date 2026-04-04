import { useMemo } from 'react';
import { useSolanaData } from '@/hooks/useSolanaData';
import { computeSolanaAnchor, computeSolanaForces, computeSolanaLeverage, formatUSD } from '@/lib/solanaEngine';
import LoadingProgress from '@/components/LoadingProgress';
import Footer from '@/components/Footer';
import SolanaAgentChart from '@/components/solana/SolanaAgentChart';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const SolanaAnalysis = () => {
  const { metrics, history, agentMetrics, loading, error } = useSolanaData();

  const anchor = useMemo(() => metrics ? computeSolanaAnchor(metrics, history) : null, [metrics, history]);

  if (loading) return <LoadingProgress message="Loading Solana Analysis..." />;
  if (error || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl text-destructive mb-3">Error</h1>
          <p className="text-muted-foreground mb-4">{error || 'Failed to load'}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-solana/20 text-solana rounded-lg font-medium hover:bg-solana/30 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  // FDV/Fee history chart data
  const ratioHistory = history
    .filter(h => h.fdv_fee_ratio && h.fdv_fee_ratio > 0)
    .map(h => ({ date: h.date, ratio: h.fdv_fee_ratio }));

  // Price history for relative performance
  const priceHistory = history.map(h => ({
    date: h.date,
    sol: h.sol_price,
    btc: h.btc_price,
    eth: h.eth_price,
  }));

  // Normalize to 100 at start
  const normalizedHistory = priceHistory.length > 0 ? priceHistory.map((h, _i) => ({
    date: h.date,
    SOL: h.sol && priceHistory[0].sol ? (h.sol / priceHistory[0].sol!) * 100 : null,
    BTC: h.btc && priceHistory[0].btc ? (h.btc / priceHistory[0].btc!) * 100 : null,
    ETH: h.eth && priceHistory[0].eth ? (h.eth / priceHistory[0].eth!) * 100 : null,
  })) : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 space-y-10">
        <div>
          <h1 className="font-display text-2xl text-foreground">Solana Analysis</h1>
          <p className="text-muted-foreground text-sm mt-1">Deep-dive into valuation, network activity, and relative performance</p>
        </div>

        {/* Panel 1: Anchor — FDV/Fee Revenue Over Time */}
        <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">Anchor — FDV / Fee Revenue Over Time</p>
            <p className="text-xs text-muted-foreground mt-1">
              Green = ratio compressing (bullish). Red = ratio expanding (bearish). 
              Horizontal line = Ethereum benchmark (~300×).
            </p>
          </div>
          {ratioHistory.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratioHistory}>
                  <XAxis dataKey="date" tick={{ fill: 'hsl(226,10%,60%)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis scale="log" domain={['auto', 'auto']} tick={{ fill: 'hsl(226,10%,60%)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,18%,10%)', border: '1px solid hsl(225,18%,16%)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${Math.round(v).toLocaleString()}×`, 'FDV/Fee']}
                  />
                  <ReferenceLine y={300} stroke="hsl(226,10%,40%)" strokeDasharray="5 5" label={{ value: 'ETH ~300×', fill: 'hsl(226,10%,50%)', fontSize: 10 }} />
                  <Line type="monotone" dataKey="ratio" stroke="hsl(262,100%,64%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Insufficient historical data. Chart populates as daily snapshots accumulate.
            </div>
          )}

          {/* Cross-chain comparison table */}
          <div className="mt-4">
            <p className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2">FDV / FEE REVENUE — CROSS-CHAIN COMPARISON</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 text-muted-foreground font-mono">Chain</th>
                    <th className="text-right py-2 text-muted-foreground font-mono">FDV</th>
                    <th className="text-right py-2 text-muted-foreground font-mono">Ann. Fees</th>
                    <th className="text-right py-2 text-muted-foreground font-mono">Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20">
                    <td className="py-2 text-muted-foreground">Ethereum</td>
                    <td className="py-2 text-right font-mono text-foreground">~$250B</td>
                    <td className="py-2 text-right font-mono text-foreground">{metrics.eth_daily_fees > 0 ? formatUSD(metrics.eth_daily_fees * 365) : '—'}</td>
                    <td className="py-2 text-right font-mono text-foreground">~{Math.round(anchor?.ethFdvFeeRatio ?? 300)}×</td>
                  </tr>
                  <tr className="border-b border-border/20 bg-solana/5">
                    <td className="py-2 text-solana font-medium">Solana</td>
                    <td className="py-2 text-right font-mono text-foreground">{formatUSD(metrics.sol_fdv)}</td>
                    <td className="py-2 text-right font-mono text-foreground">{anchor && anchor.annualisedFees > 0 ? formatUSD(anchor.annualisedFees) : '—'}</td>
                    <td className="py-2 text-right font-mono text-solana font-bold">{anchor && anchor.fdvFeeRatio > 0 ? `${Math.round(anchor.fdvFeeRatio).toLocaleString()}×` : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel 2: Forces — Agent Charts */}
        <div className="space-y-4">
          <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">Forces — Network Activity & Agentic Economy</p>
          <SolanaAgentChart data={agentMetrics} />
        </div>

        {/* Panel 3: Leverage — Relative Performance */}
        <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">Leverage — SOL vs Other Assets</p>
            <p className="text-xs text-muted-foreground mt-1">Relative performance normalised to 100 at start of available history</p>
          </div>
          {normalizedHistory.length > 1 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={normalizedHistory}>
                  <XAxis dataKey="date" tick={{ fill: 'hsl(226,10%,60%)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'hsl(226,10%,60%)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,18%,10%)', border: '1px solid hsl(225,18%,16%)', borderRadius: 8, fontSize: 12 }}
                  />
                  <ReferenceLine y={100} stroke="hsl(226,10%,30%)" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="SOL" stroke="hsl(262,100%,64%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="BTC" stroke="hsl(33,100%,65%)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="ETH" stroke="hsl(226,10%,50%)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Insufficient history. Chart populates as daily snapshots accumulate.
            </div>
          )}

          {/* Current prices */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'SOL', value: `$${metrics.sol_price.toFixed(2)}`, color: 'text-solana' },
              { label: 'BTC', value: `$${metrics.btc_price.toLocaleString()}`, color: 'text-neutral' },
              { label: 'ETH', value: `$${metrics.eth_price.toLocaleString()}`, color: 'text-muted-foreground' },
            ].map(p => (
              <div key={p.label} className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground font-mono">{p.label}</p>
                <p className={cn('font-mono text-sm', p.color)}>{p.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/solana/evidence"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-medium hover:border-solana/30 hover:shadow-[0_0_15px_-5px_hsl(var(--solana)/0.3)] transition-all duration-200"
          >
            View Evidence <ArrowRight size={16} />
          </Link>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default SolanaAnalysis;
