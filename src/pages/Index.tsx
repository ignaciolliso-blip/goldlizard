import { useEffect, useState, useMemo } from 'react';
import { fetchAllData, type Observation, type CentralBankEntry, type EtfFlowEntry, type MinerPrice } from '@/lib/dataFetcher';
import { calculateGDI, type GDIResult } from '@/lib/gdiEngine';
import { fetchScenarioTargets } from '@/lib/scenarioFetcher';
import {
  computeScenarioProbabilities, type ScenarioConfig, type ScenarioProbabilities,
} from '@/lib/scenarioEngine';
import { computeAnchor, type AnchorResult } from '@/lib/anchorEngine';
import { computeLeverage, type LeverageResult, projectGDXGoldRatio } from '@/lib/leverageEngine';
import LoadingProgress from '@/components/LoadingProgress';
import SignalLenses from '@/components/signal/SignalLenses';
import SignalProjectionTable from '@/components/signal/SignalProjectionTable';
import SignalPositioning from '@/components/signal/SignalPositioning';
import NarratorPanel from '@/components/NarratorPanel';
import PageIntro from '@/components/PageIntro';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FRED_SERIES } from '@/lib/constants';

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Initializing...');
  const [completedSeries, setCompletedSeries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gdiResult, setGdiResult] = useState<GDIResult | null>(null);
  const [anchorResult, setAnchorResult] = useState<AnchorResult | null>(null);
  const [leverageResult, setLeverageResult] = useState<LeverageResult | null>(null);
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig | null>(null);
  const [rawData, setRawData] = useState<{
    fredResults: Record<string, Observation[]>;
    goldSpot: Observation[];
    physicalDemand: CentralBankEntry[];
    etfFlows: EtfFlowEntry[];
    minerPrices: MinerPrice[];
    errors: string[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [data, scenarios] = await Promise.all([
          fetchAllData((msg) => {
            setStatusMsg(msg);
            setCompletedSeries(prev => {
              if (msg.startsWith('Fetching ') && prev.length > 0) return prev;
              if (!msg.startsWith('Fetching ') && !msg.startsWith('Computing')) return prev;
              return prev;
            });
          }),
          fetchScenarioTargets(),
        ]);
        setRawData(data);
        setScenarioConfig(scenarios);

        const fetched = Object.keys(data.fredResults).map(id => {
          const s = FRED_SERIES.find(f => f.id === id);
          return s?.name || id;
        });
        if (data.goldSpot.length > 0) fetched.unshift('Gold Spot Price');
        setCompletedSeries(fetched);

        setStatusMsg('Computing GDI...');
        const result = calculateGDI(
          data.fredResults, data.physicalDemand, data.etfFlows, data.errors, 'fixed', data.goldSpot
        );
        setGdiResult(result);

        const m2Data = data.fredResults['WM2NS'] || [];
        const anchor = computeAnchor(data.goldSpot, m2Data);
        setAnchorResult(anchor);

        const leverage = computeLeverage(data.goldSpot, data.minerPrices);
        setLeverageResult(leverage);
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentGDI = gdiResult ? gdiResult.gdiValues[gdiResult.gdiValues.length - 1] : 0;
  const goldSpot = rawData?.goldSpot || [];
  const currentGoldPrice = goldSpot.length > 0 ? goldSpot[goldSpot.length - 1].value : 3000;

  const probs = useMemo(() => computeScenarioProbabilities(currentGDI), [currentGDI]);

  const currentGDXPrice = useMemo(() => {
    if (!rawData?.minerPrices.length) return 83;
    const sorted = [...rawData.minerPrices].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1].close_price;
  }, [rawData]);

  if (loading) return <LoadingProgress message={statusMsg} completedSeries={completedSeries} totalSeries={FRED_SERIES.length + 1} />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl text-destructive mb-3">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-primary/20 text-primary rounded-lg font-medium hover:bg-primary/30 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 space-y-10">
        {/* Page intro — dismissible */}
        <PageIntro storageKey="signal_intro_dismissed">
          <h3 className="font-display text-foreground mb-3">How to Read This Page</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            This page answers one question: <span className="text-foreground font-medium">should you buy, hold, or sell gold and gold miners?</span>
          </p>
          <p className="text-muted-foreground leading-relaxed mb-2">It uses three independent lenses:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-primary font-semibold">THE ANCHOR</span>
              <span className="text-muted-foreground ml-2">Is gold cheap or expensive relative to the money supply?</span>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-primary font-semibold">THE FORCES</span>
              <span className="text-muted-foreground ml-2">Are the macro forces pushing gold up or down?</span>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-primary font-semibold">THE LEVERAGE</span>
              <span className="text-muted-foreground ml-2">Are miners cheap or expensive relative to gold?</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-3">
            When all three agree, the signal is strongest. Scroll down for projections and positioning.
          </p>
        </PageIntro>

        {/* Band 1: Three Lenses */}
        <SignalLenses
          anchorResult={anchorResult}
          gdiResult={gdiResult}
          leverageResult={leverageResult}
          currentGDI={currentGDI}
          currentGDXPrice={currentGDXPrice}
        />

        {/* Band 2: Projection Table */}
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-foreground">Where Is Gold Heading?</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Projections at future horizons based on the three lenses. "Investable Parity" shows what gold would be worth if it fully reflected the money supply. "GDI-Weighted EV" is the probability-weighted estimate from the Forces lens.
            </p>
          </div>
          <SignalProjectionTable
            anchorResult={anchorResult}
            leverageResult={leverageResult}
            scenarioConfig={scenarioConfig}
            currentGoldPrice={currentGoldPrice}
            currentGDXPrice={currentGDXPrice}
            currentGDI={currentGDI}
            probs={probs}
          />
        </div>

        {/* Band 3: Positioning & Narrative */}
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">Based on the combined reading of all three lenses:</p>
          <SignalPositioning
            anchorResult={anchorResult}
            gdiResult={gdiResult}
            leverageResult={leverageResult}
            currentGDI={currentGDI}
            currentGoldPrice={currentGoldPrice}
            currentGDXPrice={currentGDXPrice}
            probs={probs}
            scenarioConfig={scenarioConfig}
          />
        </div>

        {/* AI Narrator */}
        {gdiResult && (
          <NarratorPanel
            gdiResult={gdiResult}
            goldSpot={goldSpot}
            currentGDI={currentGDI}
            probs={probs}
            scenarioConfig={scenarioConfig}
            currentGoldPrice={currentGoldPrice}
            weightMode="fixed"
            anchorResult={anchorResult}
            leverageResult={leverageResult}
            currentGDXPrice={currentGDXPrice}
          />
        )}

        {/* Navigation CTA */}
        <div className="text-center">
          <Link
            to="/analysis"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-medium hover:border-primary/30 hover:shadow-[0_0_15px_-5px_hsl(var(--gold)/0.3)] transition-all duration-200"
          >
            Explore Analysis <ArrowRight size={16} />
          </Link>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
