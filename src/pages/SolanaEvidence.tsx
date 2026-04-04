import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSolanaData, type SolanaMetrics } from '@/hooks/useSolanaData';
import { supabase } from '@/integrations/supabase/client';
import { formatUSD } from '@/lib/solanaEngine';
import LoadingProgress from '@/components/LoadingProgress';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Save, ExternalLink, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const SolanaEvidence = () => {
  const { metrics, history, agentMetrics, loading, error } = useSolanaData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'variables');

  // Data management state
  const [feeDate, setFeeDate] = useState(new Date().toISOString().split('T')[0]);
  const [feeAmount, setFeeAmount] = useState('');
  const [ethFeeAmount, setEthFeeAmount] = useState('');
  const [agentDate, setAgentDate] = useState(new Date().toISOString().split('T')[0]);
  const [agentTxns, setAgentTxns] = useState('');
  const [agentVolume, setAgentVolume] = useState('');
  const [agentPct, setAgentPct] = useState('');
  const [totalTxns, setTotalTxns] = useState('');

  // Forecast state
  const [target1y, setTarget1y] = useState('');
  const [target3y, setTarget3y] = useState('');
  const [forecastBasis, setForecastBasis] = useState('');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const saveFees = async () => {
    if (!feeAmount) return;
    const val = parseFloat(feeAmount);
    try {
      await supabase.from('solana_metrics' as any).upsert(
        { metric_name: 'daily_fees', value: val, source: 'manual', fetched_at: new Date().toISOString() },
        { onConflict: 'metric_name' }
      );
      if (ethFeeAmount) {
        await supabase.from('solana_metrics' as any).upsert(
          { metric_name: 'eth_daily_fees', value: parseFloat(ethFeeAmount), source: 'manual', fetched_at: new Date().toISOString() },
          { onConflict: 'metric_name' }
        );
      }
      toast({ title: 'Fees updated', description: `Daily fees set to ${formatUSD(val)}` });
      setFeeAmount('');
      setEthFeeAmount('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const saveAgentData = async () => {
    if (!agentTxns && !agentPct) return;
    try {
      await supabase.from('solana_agent_metrics' as any).upsert(
        {
          date: agentDate,
          x402_daily_transactions: agentTxns ? parseFloat(agentTxns) : null,
          x402_daily_volume_usd: agentVolume ? parseFloat(agentVolume) : null,
          agent_pct_of_total_txns: agentPct ? parseFloat(agentPct) : null,
          total_daily_transactions: totalTxns ? parseFloat(totalTxns) : null,
          source: 'manual',
        },
        { onConflict: 'date' }
      );
      toast({ title: 'Agent data saved', description: `Data for ${agentDate} saved` });
      setAgentTxns('');
      setAgentVolume('');
      setAgentPct('');
      setTotalTxns('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const saveForecast = async () => {
    if (!target1y || !forecastBasis || !metrics) return;
    try {
      await supabase.from('forecast_log' as any).insert({
        asset: 'SOL',
        price_at_creation: metrics.sol_price,
        target_1y: parseFloat(target1y),
        target_3y: target3y ? parseFloat(target3y) : null,
        basis: forecastBasis,
        metadata: {
          fdv_fee_ratio: metrics.fdv_fee_ratio,
          tvl: metrics.tvl_usd,
          stablecoin_supply: metrics.stablecoin_supply,
        },
      });
      toast({ title: 'Forecast saved', description: 'Your forecast has been recorded' });
      setTarget1y('');
      setTarget3y('');
      setForecastBasis('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <LoadingProgress message="Loading Solana Evidence..." />;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl text-foreground">Solana Evidence</h1>
          <p className="text-muted-foreground text-sm mt-1">Data sources, manual inputs, scenarios, and forecast tracking</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="forecasts">Forecast Log</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>

          {/* Tab 1: Variables */}
          <TabsContent value="variables" className="space-y-4 mt-4">
            <div className="bg-card border border-card-border rounded-xl p-5">
              <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase mb-4">Current Metrics</p>
              <div className="space-y-1">
                {[
                  { name: 'SOL Price', value: `$${metrics.sol_price.toFixed(2)}`, source: 'CoinGecko' },
                  { name: 'Market Cap', value: formatUSD(metrics.sol_market_cap), source: 'CoinGecko' },
                  { name: 'FDV', value: formatUSD(metrics.sol_fdv), source: 'CoinGecko' },
                  { name: '24h Volume', value: formatUSD(metrics.sol_volume_24h), source: 'CoinGecko' },
                  { name: 'TVL', value: formatUSD(metrics.tvl_usd), source: 'DefiLlama' },
                  { name: 'Stablecoin Supply', value: formatUSD(metrics.stablecoin_supply), source: 'DefiLlama' },
                  { name: 'Daily Fees', value: metrics.daily_fees > 0 ? formatUSD(metrics.daily_fees) : 'Manual input needed', source: 'Manual' },
                  { name: 'FDV/Fee Ratio', value: metrics.fdv_fee_ratio > 0 ? `${Math.round(metrics.fdv_fee_ratio).toLocaleString()}×` : '—', source: 'Computed' },
                  { name: 'BTC Price', value: `$${metrics.btc_price.toLocaleString()}`, source: 'CoinGecko' },
                  { name: 'ETH Price', value: `$${metrics.eth_price.toLocaleString()}`, source: 'CoinGecko' },
                  { name: 'ETH Daily Fees', value: metrics.eth_daily_fees > 0 ? formatUSD(metrics.eth_daily_fees) : 'Manual input needed', source: 'Manual' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded bg-secondary/20 text-sm">
                    <span className="text-muted-foreground">{m.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-foreground">{m.value}</span>
                      <span className="text-[10px] text-muted-foreground/60">{m.source}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Last updated: {metrics.last_updated ? new Date(metrics.last_updated).toLocaleString() : 'Never'}. Auto-refreshes every 15 minutes.
              </p>
            </div>
          </TabsContent>

          {/* Tab 2: Scenarios */}
          <TabsContent value="scenarios" className="space-y-4 mt-4">
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-5">
              <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">Scenario Modelling</p>
              {[
                {
                  name: 'BULL — Agent Economy Takes Off',
                  assumption: 'Agent transactions grow 10×, avg fee/tx rises 5×',
                  feeMultiple: 50,
                  color: 'text-bullish',
                },
                {
                  name: 'BASE — Steady Growth',
                  assumption: 'Agent transactions grow 3×, fees grow 2×',
                  feeMultiple: 6,
                  color: 'text-neutral',
                },
                {
                  name: 'BEAR — Hype Fades',
                  assumption: 'Agent activity stalls, competition wins market share',
                  feeMultiple: 1,
                  color: 'text-bearish',
                },
              ].map((scenario, i) => {
                const currentFees = metrics.daily_fees * 365;
                const projectedFees = currentFees * scenario.feeMultiple;
                const impliedRatio = projectedFees > 0 ? metrics.sol_fdv / projectedFees : 0;
                const ethBenchmark = 300;
                const impliedPriceAtCurrentRatio = metrics.sol_price; // stays same
                const impliedPriceAtEthRatio = impliedRatio > 0 && metrics.sol_fdv > 0
                  ? metrics.sol_price * (impliedRatio / ethBenchmark)
                  : 0;

                return (
                  <div key={i} className="bg-secondary/20 rounded-lg p-4 space-y-2">
                    <p className={cn('font-mono text-sm font-bold', scenario.color)}>{scenario.name}</p>
                    <p className="text-xs text-muted-foreground">{scenario.assumption}</p>
                    <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                      <div>
                        <p className="text-muted-foreground">Current Ann. Fees</p>
                        <p className="font-mono text-foreground">{currentFees > 0 ? formatUSD(currentFees) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Projected Ann. Fees</p>
                        <p className="font-mono text-foreground">{projectedFees > 0 ? formatUSD(projectedFees) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Implied FDV/Fee Ratio</p>
                        <p className="font-mono text-foreground">{impliedRatio > 0 ? `${Math.round(impliedRatio).toLocaleString()}×` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">vs ETH Benchmark (300×)</p>
                        <p className="font-mono text-foreground">{impliedRatio > 0 ? `${(impliedRatio / ethBenchmark).toFixed(1)}×` : '—'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Tab 3: Forecast Log */}
          <TabsContent value="forecasts" className="space-y-4 mt-4">
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-5">
              <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">Forecast Log — Solana</p>
              <p className="text-xs text-muted-foreground">
                Record your conviction. Track accuracy over time. Accountability prevents bias.
              </p>

              {/* Save new forecast */}
              <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
                <p className="text-xs font-mono text-muted-foreground">NEW FORECAST</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground">SOL Price Now</label>
                    <p className="font-mono text-sm text-foreground">${metrics.sol_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">1Y Target ($)</label>
                    <input type="number" value={target1y} onChange={e => setTarget1y(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" placeholder="e.g. 140" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">3Y Target ($ optional)</label>
                    <input type="number" value={target3y} onChange={e => setTarget3y(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" placeholder="e.g. 250" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Basis (why?)</label>
                    <input type="text" value={forecastBasis} onChange={e => setForecastBasis(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground" placeholder="Agent adoption + ETF" />
                  </div>
                </div>
                <button onClick={saveForecast} disabled={!target1y || !forecastBasis}
                  className="flex items-center gap-1 px-3 py-1.5 bg-solana/20 text-solana rounded text-xs font-medium hover:bg-solana/30 transition-colors disabled:opacity-40">
                  <Save size={12} /> Save Forecast
                </button>
              </div>

              <p className="text-xs text-muted-foreground italic">Past forecasts will appear here once saved. Accuracy measured at 12-month mark.</p>
            </div>
          </TabsContent>

          {/* Tab 4: Data Management */}
          <TabsContent value="data" className="space-y-4 mt-4">
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-6">
              <p className="text-[11px] font-mono tracking-[0.2em] text-solana uppercase">Manual Data Input</p>
              <p className="text-xs text-muted-foreground">
                Three metrics require manual weekly input. Click the source links to find the numbers.
              </p>

              {/* Fee input */}
              <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-solana-green">DAILY FEE REVENUE</p>
                  <a href="https://defillama.com/fees/chain/solana" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-solana hover:underline">
                    <ExternalLink size={10} /> DefiLlama Fees
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Solana Daily Fees (USD)</label>
                    <input type="number" value={feeAmount} onChange={e => setFeeAmount(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" placeholder="e.g. 2500000" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      ETH Daily Fees (USD)
                      <a href="https://defillama.com/fees/chain/ethereum" target="_blank" rel="noopener noreferrer"
                        className="ml-1 text-solana hover:underline"><ExternalLink size={8} className="inline" /></a>
                    </label>
                    <input type="number" value={ethFeeAmount} onChange={e => setEthFeeAmount(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" placeholder="e.g. 8000000" />
                  </div>
                </div>
                <button onClick={saveFees} disabled={!feeAmount}
                  className="flex items-center gap-1 px-3 py-1.5 bg-solana-green/20 text-solana-green rounded text-xs font-medium hover:bg-solana-green/30 transition-colors disabled:opacity-40">
                  <Save size={12} /> Save Fees
                </button>
                <p className="text-[10px] text-muted-foreground">
                  Current: Solana {metrics.daily_fees > 0 ? formatUSD(metrics.daily_fees) : '—'} / ETH {metrics.eth_daily_fees > 0 ? formatUSD(metrics.eth_daily_fees) : '—'}
                </p>
              </div>

              {/* Agent data input */}
              <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-solana-cyan">AGENTIC TRANSACTION DATA</p>
                  <a href="https://x402scan.com" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-solana hover:underline">
                    <ExternalLink size={10} /> x402scan
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Date</label>
                    <input type="date" value={agentDate} onChange={e => setAgentDate(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">x402 Txns/day</label>
                    <input type="number" value={agentTxns} onChange={e => setAgentTxns(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" placeholder="e.g. 150000" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">x402 Volume (USD)</label>
                    <input type="number" value={agentVolume} onChange={e => setAgentVolume(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" placeholder="e.g. 500000" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Agent % of Total</label>
                    <input type="number" value={agentPct} onChange={e => setAgentPct(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" placeholder="e.g. 12.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Total Daily Txns</label>
                    <input type="number" value={totalTxns} onChange={e => setTotalTxns(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground" placeholder="e.g. 65000000" />
                  </div>
                </div>
                <button onClick={saveAgentData} disabled={!agentTxns && !agentPct}
                  className="flex items-center gap-1 px-3 py-1.5 bg-solana-cyan/20 text-solana-cyan rounded text-xs font-medium hover:bg-solana-cyan/30 transition-colors disabled:opacity-40">
                  <Plus size={12} /> Save Agent Data
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Footer />
      </div>
    </div>
  );
};

export default SolanaEvidence;
