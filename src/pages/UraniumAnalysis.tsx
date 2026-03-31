import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { fetchAllUraniumData } from '@/lib/uraniumDataFetcher';
import {
  computeUraniumAnchor, computeUraniumForces, computeUraniumLeverage,
  type UraniumAnchorResult, type UraniumForcesResult, type UraniumLeverageResult,
  URANIUM_ANNOTATIONS, URANIUM_COST_BANDS,
} from '@/lib/uraniumEngine';
import type { MinerPrice } from '@/lib/leverageEngine';
import LoadingProgress from '@/components/LoadingProgress';
import PageIntro from '@/components/PageIntro';
import Footer from '@/components/Footer';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

const UraniumAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [showAllEvents, setShowAllEvents] = useState(!isMobile);

  const [anchorResult, setAnchorResult] = useState<UraniumAnchorResult | null>(null);
  const [forcesResult, setForcesResult] = useState<UraniumForcesResult | null>(null);
  const [leverageResult, setLeverageResult] = useState<UraniumLeverageResult | null>(null);
  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllUraniumData();
        setRawData(data);
        setAnchorResult(computeUraniumAnchor(data.prices));
        setForcesResult(computeUraniumForces(data.supplyDemand));
        setLeverageResult(computeUraniumLeverage(data.prices, data.minerPrices, data.valuations));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingProgress message="Loading uranium analysis..." />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl text-destructive mb-3">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-uranium/20 text-uranium rounded-lg font-medium">Retry</button>
        </div>
      </div>
    );
  }

  // Build chart data from uranium prices
  const chartData = rawData?.prices?.map((p: any) => ({
    date: p.date,
    ts: new Date(p.date).getTime(),
    spot: p.spot_price,
    ltContract: p.lt_contract_price,
  })) || [];

  const annotations = showAllEvents ? URANIUM_ANNOTATIONS : URANIUM_ANNOTATIONS.filter(a => a.important);

  const supplyDemandChartData = rawData?.supplyDemand?.map((sd: any) => ({
    quarter: sd.quarter,
    demand: sd.reactor_demand_mlb,
    primary: sd.mine_production_mlb,
    secondary: sd.secondary_supply_mlb,
    total: sd.mine_production_mlb + sd.secondary_supply_mlb,
  })) || [];

  const ratioChartData = leverageResult?.ratioSeries || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link to="/uranium" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> The Signal
          </Link>
          <Link to="/uranium/evidence" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Explore Evidence <ArrowRight size={14} />
          </Link>
        </div>

        {/* Page intro */}
        <PageIntro storageKey="uranium_analysis_intro_dismissed">
          <h3 className="font-display text-foreground mb-3">The Analysis — Why uranium is where it is</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-uranium font-semibold">LEFT — The Anchor</span>
              <p className="text-muted-foreground mt-1">Uranium spot and contract prices vs production cost bands. The gap = incentive for new supply.</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-uranium font-semibold">CENTRE — The Forces</span>
              <p className="text-muted-foreground mt-1">Supply vs demand breakdown by quarter. The deficit is the key driver.</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-uranium font-semibold">RIGHT — The Leverage</span>
              <p className="text-muted-foreground mt-1">URNM/Uranium ratio — whether miners are leading or lagging the commodity.</p>
            </div>
          </div>
        </PageIntro>

        {/* Three-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* LEFT: Anchor Chart */}
          <div className="lg:col-span-2 xl:col-span-1 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">ANCHOR — PRICE VS COST</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Spot (green) and long-term contract (blue) vs production cost bands
                </p>
              </div>
              <button
                onClick={() => setShowAllEvents(!showAllEvents)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllEvents ? 'Key events only' : 'Show all events'}
              </button>
            </div>
            <div style={{ height: isMobile ? 300 : 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  {/* Cost bands */}
                  <ReferenceArea y1={30} y2={55} fill="hsl(var(--bullish))" fillOpacity={0.06} />
                  <ReferenceArea y1={55} y2={80} fill="hsl(var(--primary))" fillOpacity={0.06} />
                  <ReferenceArea y1={80} y2={100} fill="hsl(var(--neutral))" fillOpacity={0.06} />
                  <ReferenceArea y1={100} y2={160} fill="hsl(var(--bearish))" fillOpacity={0.06} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(d: string) => d.substring(0, 7)}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[20, 140]}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => `$${v}`}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    formatter={(value: number, name: string) => [`$${value.toFixed(0)}/lb`, name === 'spot' ? 'Spot' : 'LT Contract']}
                  />
                  {/* Annotation lines */}
                  {annotations.map(a => (
                    <ReferenceLine
                      key={a.date}
                      x={a.date}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="2 4"
                      strokeOpacity={0.4}
                      label={{ value: a.label, position: 'top', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    />
                  ))}
                  <Line type="monotone" dataKey="spot" stroke="hsl(var(--uranium))" strokeWidth={2.5} dot={false} name="Spot" />
                  <Line type="monotone" dataKey="ltContract" stroke="hsl(var(--uranium-contract))" strokeWidth={2} strokeDasharray="6 3" dot={false} name="LT Contract" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Cost band legend */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { label: 'AISC ($30-55)', color: 'bg-bullish/20 text-bullish' },
                { label: 'Restart ($55-80)', color: 'bg-primary/20 text-primary' },
                { label: 'Greenfield ($80-100)', color: 'bg-neutral/20 text-neutral' },
                { label: 'Shortage ($100+)', color: 'bg-bearish/20 text-bearish' },
              ].map(b => (
                <div key={b.label} className={`px-2 py-1 rounded text-xs font-medium ${b.color}`}>
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* CENTRE: Forces — Supply/Demand */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">FORCES — SUPPLY VS DEMAND</h3>
            <p className="text-xs text-muted-foreground mb-3">Quarterly mine production + secondary supply vs reactor demand</p>
            <div style={{ height: isMobile ? 280 : 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={supplyDemandChartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => `${v}M`} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)} Mlb`, name]}
                  />
                  <Line type="monotone" dataKey="demand" stroke="hsl(var(--uranium-demand))" strokeWidth={2.5} dot={false} name="Demand" />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--uranium-supply))" strokeWidth={2.5} dot={false} name="Total Supply" />
                  <Line type="monotone" dataKey="primary" stroke="hsl(var(--uranium-supply))" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Primary" />
                  <Line type="monotone" dataKey="secondary" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="2 4" dot={false} name="Secondary" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {forcesResult && (
              <div className="mt-3 p-3 bg-bearish/5 border border-bearish/20 rounded-lg text-sm">
                <span className="font-semibold text-foreground">Deficit: {Math.abs(forcesResult.deficit).toFixed(0)} Mlb ({Math.abs(forcesResult.deficitPct).toFixed(0)}%)</span>
                <p className="text-muted-foreground text-xs mt-1">
                  Demand {forcesResult.demandSignal}. Supply {forcesResult.supplySignal}. Contracting cycle {forcesResult.contractingSignal.replace('_', ' ')}.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Leverage — Miner/Uranium Ratio */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">LEVERAGE — URNM/URANIUM RATIO</h3>
            <p className="text-xs text-muted-foreground mb-3">Miners vs commodity — are equities leading or lagging?</p>
            {ratioChartData.length > 0 ? (
              <div style={{ height: isMobile ? 280 : 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={ratioChartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(d: string) => d.substring(0, 7)} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [value.toFixed(3), 'URNM/U Ratio']}
                    />
                    {leverageResult && (
                      <ReferenceLine y={leverageResult.medianRatio} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Median', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    )}
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--leverage-miner))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No URNM price data available. Add data in Evidence → Data Management.
              </div>
            )}
            {leverageResult && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Current ratio</span>
                  <p className="font-mono font-semibold">{leverageResult.currentRatio.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Percentile (5yr)</span>
                  <p className="font-mono font-semibold">{leverageResult.currentPercentile.toFixed(0)}th</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default UraniumAnalysis;
