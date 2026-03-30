import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { fetchAllData, type Observation, type CentralBankEntry, type EtfFlowEntry, type MinerPrice } from '@/lib/dataFetcher';
import { calculateGDI, type GDIResult } from '@/lib/gdiEngine';
import { fetchScenarioTargets } from '@/lib/scenarioFetcher';
import { computeScenarioProbabilities, type ScenarioConfig, type ScenarioProbabilities } from '@/lib/scenarioEngine';
import { computeAnchor, type AnchorResult } from '@/lib/anchorEngine';
import { computeLeverage, type LeverageResult } from '@/lib/leverageEngine';
import LoadingProgress from '@/components/LoadingProgress';
import AnchorChartPanel from '@/components/analysis/AnchorChartPanel';
import ForcesPanel from '@/components/analysis/ForcesPanel';
import LeveragePanel from '@/components/analysis/LeveragePanel';
import Footer from '@/components/Footer';

const Analysis = () => {
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<'1971' | '2000'>('2000');

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

        const cpiData = data.fredResults['CPIAUCSL'] || [];
        const m2Data = data.fredResults['WM2NS'] || [];
        const anchor = computeAnchor(data.goldSpot, cpiData, m2Data, '2000');
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

  // Recompute anchor when baseline changes
  useEffect(() => {
    if (!rawData) return;
    const cpiData = rawData.fredResults['CPIAUCSL'] || [];
    const m2Data = rawData.fredResults['WM2NS'] || [];
    const anchor = computeAnchor(rawData.goldSpot, cpiData, m2Data, baseline);
    setAnchorResult(anchor);
  }, [baseline, rawData]);

  const currentGDI = gdiResult ? gdiResult.gdiValues[gdiResult.gdiValues.length - 1] : 0;
  const goldSpot = rawData?.goldSpot || [];
  const currentGoldPrice = goldSpot.length > 0 ? goldSpot[goldSpot.length - 1].value : 3000;

  const probs = useMemo(() => computeScenarioProbabilities(currentGDI), [currentGDI]);

  const currentGDXPrice = useMemo(() => {
    if (!rawData?.minerPrices.length) return 83;
    const sorted = [...rawData.minerPrices].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1].close_price;
  }, [rawData]);

  // Compute GDI-weighted EVs for anchor chart
  const gdiWeightedEVs = useMemo(() => {
    if (!scenarioConfig?.scenarios?.length) return {};
    const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
    const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
    const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');
    if (!bull || !base || !bear) return {};

    const keys = ['3m', '6m', '1y', '3y', '5y'] as const;
    const result: Record<string, number> = {};
    for (const k of keys) {
      result[k] = probs.bull * bull.targets[k] + probs.base * base.targets[k] + probs.bear * bear.targets[k];
    }
    return result;
  }, [scenarioConfig, probs]);

  if (loading) return <LoadingProgress message={statusMsg} />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-xl text-destructive mb-2">Error</h1>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary/20 text-primary rounded text-sm font-medium hover:bg-primary/30 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> The Signal
          </Link>
          <Link to="/evidence" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Explore Evidence <ArrowRight size={14} />
          </Link>
        </div>

        {/* Three-panel layout: Desktop 40-30-30, Tablet anchor full + 50-50, Mobile stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[2fr_1.5fr_1.5fr] gap-4">
          {/* Left: Anchor - full width on tablet */}
          {anchorResult && rawData && (
            <div className="lg:col-span-2 xl:col-span-1">
              <AnchorChartPanel
                anchorResult={anchorResult}
                goldSpot={goldSpot}
                cpiData={rawData.fredResults['CPIAUCSL'] || []}
                m2Data={rawData.fredResults['WM2NS'] || []}
                gdiWeightedEVs={gdiWeightedEVs}
                onBaselineChange={setBaseline}
                baseline={baseline}
              />
            </div>
          )}

          {/* Centre: Forces */}
          {gdiResult && (
            <ForcesPanel
              gdiResult={gdiResult}
              goldSpot={goldSpot}
              currentGDI={currentGDI}
            />
          )}

          {/* Right: Leverage */}
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

        <Footer />
      </div>
    </div>
  );
};

export default Analysis;
