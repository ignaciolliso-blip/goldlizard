import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { fetchAllData, type Observation, type CentralBankEntry, type EtfFlowEntry, type MinerPrice } from '@/lib/dataFetcher';
import { calculateGDI, type GDIResult } from '@/lib/gdiEngine';
import { fetchScenarioTargets } from '@/lib/scenarioFetcher';
import { computeScenarioProbabilities, type ScenarioConfig, type ScenarioProbabilities } from '@/lib/scenarioEngine';
import { computeAnchor, type AnchorResult } from '@/lib/anchorEngine';
import { computeLeverage, type LeverageResult } from '@/lib/leverageEngine';
import { fetchGoldMinerValuations, fetchGoldPNAVHistory } from '@/lib/goldDataFetcher';
import LoadingProgress from '@/components/LoadingProgress';
import AnchorChartPanel from '@/components/analysis/AnchorChartPanel';
import ForcesPanel from '@/components/analysis/ForcesPanel';
import LeveragePanel from '@/components/analysis/LeveragePanel';
import GoldHistoricalPNAVChart from '@/components/gold/GoldHistoricalPNAVChart';
import PageIntro from '@/components/PageIntro';
import Footer from '@/components/Footer';

const Analysis = () => {
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  const [rawData, setRawData] = useState<{
    fredResults: Record<string, Observation[]>;
    goldSpot: Observation[];
    physicalDemand: CentralBankEntry[];
    etfFlows: EtfFlowEntry[];
    minerPrices: MinerPrice[];
    errors: string[];
  } | null>(null);

  const [gdiResult, setGdiResult] = useState<GDIResult | null>(null);
  const [anchorResult, setAnchorResult] = useState<AnchorResult | null>(null);
  const [leverageResult, setLeverageResult] = useState<LeverageResult | null>(null);
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [data, scenarios] = await Promise.all([
          fetchAllData(setStatusMsg),
          fetchScenarioTargets(),
        ]);
        setRawData(data);
        setScenarioConfig(scenarios);

        setStatusMsg('Computing GDI...');
        const result = calculateGDI(
          data.fredResults, data.physicalDemand, data.etfFlows, data.errors, 'fixed', data.goldSpot
        );
        setGdiResult(result);

        const m2Data = data.fredResults['WM2NS'] || [];
        const anchor = computeAnchor(data.goldSpot, m2Data);
        setAnchorResult(anchor);

        const [goldMiners, goldPNAVHistory] = await Promise.all([
          fetchGoldMinerValuations(),
          fetchGoldPNAVHistory(),
        ]);
        const leverage = computeLeverage(goldMiners, goldPNAVHistory);
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

  if (loading) return <LoadingProgress message={statusMsg} />;

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
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> The Signal
          </Link>
          <Link to="/evidence" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Explore Evidence <ArrowRight size={14} />
          </Link>
        </div>

        {/* Page intro */}
        <PageIntro storageKey="analysis_intro_dismissed">
          <h3 className="font-display text-foreground mb-3">The Analysis — Why gold is where it is</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-primary font-semibold">LEFT — The Anchor</span>
              <p className="text-muted-foreground mt-1">Gold's price vs its M2 "implied price." The gap = debasement not yet priced in.</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-primary font-semibold">CENTRE — The Forces</span>
              <p className="text-muted-foreground mt-1">What's pushing gold toward or away from implied price — structural, demand, and conditions.</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-primary font-semibold">RIGHT — The Leverage</span>
              <p className="text-muted-foreground mt-1">Whether miners (GDX) are cheap or expensive relative to gold. Cheap miners = amplified returns.</p>
            </div>
          </div>
        </PageIntro>

        {/* Three-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[2fr_1.5fr_1.5fr] gap-6">
          {anchorResult && rawData && (
            <div className="lg:col-span-2 xl:col-span-1">
              <AnchorChartPanel
                anchorResult={anchorResult}
                goldSpot={goldSpot}
                m2Data={rawData.fredResults['WM2NS'] || []}
              />
            </div>
          )}

          {gdiResult && (
            <ForcesPanel
              gdiResult={gdiResult}
              goldSpot={goldSpot}
              currentGDI={currentGDI}
            />
          )}

          {leverageResult && (
            <LeveragePanel
              leverageResult={leverageResult}
              goldSpot={goldSpot}
              currentGoldPrice={currentGoldPrice}
              currentGDXPrice={currentGDXPrice}
              scenarioConfig={scenarioConfig}
              probs={probs}
            />
          )}
        </div>

        {/* Historical P/NAV Chart */}
        {leverageResult && (
          <GoldHistoricalPNAVChart
            data={leverageResult.pnavHistory}
            currentPNAV={leverageResult.sectorPNAV}
          />
        )}

        <Footer />
      </div>
    </div>
  );
};

export default Analysis;
